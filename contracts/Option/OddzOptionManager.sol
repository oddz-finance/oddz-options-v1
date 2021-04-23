// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "@openzeppelin/contracts/utils/Address.sol";
import "./IOddzOption.sol";
import "./IOddzAsset.sol";
import "../Oracle/OddzPriceOracleManager.sol";
import "../Oracle/OddzIVOracleManager.sol";
import "../Staking/IOddzStaking.sol";
import "./OddzAssetManager.sol";
import "./OddzOptionPremiumManager.sol";
import "../Pool/OddzLiquidityPool.sol";
import "./IERC20Extented.sol";
import "../OddzSDK.sol";
import "../Libs/ABDKMath64x64.sol";

contract OddzOptionManager is IOddzOption, Ownable {
    using Math for uint256;
    using SafeERC20 for IERC20Extented;
    using Address for address;

    OddzAssetManager public assetManager;
    IOddzLiquidityPool public pool;
    OddzPriceOracleManager public oracle;
    OddzIVOracleManager public volatility;
    OddzOptionPremiumManager public premiumManager;
    IOddzStaking public stakingBenficiary;
    IERC20Extented public token;
    Option[] public options;

    /**
     * @dev Transaction Fee definitions
     */
    uint256 public txnFeePerc = 5;
    uint256 public txnFeeAggregate;

    /**
     * @dev Settlement Fee definitions
     */
    uint256 public settlementFeePerc = 4;
    uint256 public settlementFeeAggregate;

    /**
     * @dev Max Deadline in seconds
     */
    uint32 public maxDeadline;

    OddzSDK public sdk;

    constructor(
        OddzPriceOracleManager _oracle,
        OddzIVOracleManager _iv,
        IOddzStaking _staking,
        IOddzLiquidityPool _pool,
        IERC20Extented _token,
        OddzAssetManager _assetManager,
        OddzOptionPremiumManager _premiumManager
    ) {
        pool = _pool;
        oracle = _oracle;
        volatility = _iv;
        stakingBenficiary = _staking;
        token = _token;
        assetManager = _assetManager;
        premiumManager = _premiumManager;
    }

    modifier validAmount(uint256 _amount, address _pair) {
        require(_amount >= assetManager.getPurchaseLimit(_pair), "amount less than purchase limit");
        _;
    }

    modifier validateOptionParams(
        OptionType _optionType,
        address _pair,
        uint256 _expiration
    ) {
        validOptionType(_optionType);
        validAssetPair(_pair);
        validExpiration(_expiration, _pair);
        _;
    }

    function validOptionType(OptionType _optionType) private pure {
        require(_optionType == OptionType.Call || _optionType == OptionType.Put, "Invalid option type");
    }

    function validExpiration(uint256 _expiration, address _pair) private view {
        require(_expiration <= assetManager.getMaxPeriod(_pair), "Expiration is greater than max expiry");
        require(_expiration >= assetManager.getMinPeriod(_pair), "Expiration is less than min expiry");
    }

    function validAssetPair(address _pair) private view {
        require(assetManager.getStatusOfPair(_pair) == true, "Invalid Asset pair");
    }

    /**
     * @notice validate strike price
     * @param _strike strike price provided by the option buyer
     * @param _minPrice minumum allowed strike price
     * @param _maxPrice maximum allowed strike price
     */
    function validStrike(
        uint256 _strike,
        uint256 _minPrice,
        uint256 _maxPrice
    ) private pure {
        require(_strike <= _maxPrice && _strike >= _minPrice, "Strike out of Range");
    }

    /**
     * @notice validate option premium
     * @param _value user paid amount
     * @param _premium option premium
     */
    function validateOptionAmount(uint256 _value, uint256 _premium) private pure {
        require(_value >= _premium, "Premium is low");
    }

    /**
     * @notice get maximum strike price
     * @param _cp current price of the underlying asset
     * @param _iv implied volatility of the underlying asset
     * @param _ivDecimal iv precision
     * @return oc - over collateralization
     */
    function getMaxStrikePrice(
        uint256 _cp,
        uint256 _iv,
        uint8 _ivDecimal
    ) private pure returns (uint256 oc) {
        // fetch highest call price using IV
        uint256 ivExp = ABDKMath64x64.mulu(ABDKMath64x64.exp(ABDKMath64x64.divu(_iv, 10**_ivDecimal)), 10**_ivDecimal);
        oc = (_cp * ivExp) / (10**_ivDecimal);
    }

    /**
     * @notice get minimum strike price
     * @param _cp current price of the underlying asset
     * @param _iv implied volatility of the underlying asset
     * @param _ivDecimal iv precision
     * @return oc - over collateralization
     */
    function getMinStrikePrice(
        uint256 _cp,
        uint256 _iv,
        uint8 _ivDecimal
    ) private pure returns (uint256 oc) {
        // fetch lowest put price using IV
        // use negative IV for put
        uint256 ivExp = ABDKMath64x64.mulu(ABDKMath64x64.exp(-ABDKMath64x64.divu(_iv, 10**_ivDecimal)), 10**_ivDecimal);
        oc = (_cp * ivExp) / (10**_ivDecimal);
    }

    /**
     * @notice get current price of the given asset
     * @param _pair asset pair
     * @return cp - current price of the underlying asset
     */
    function getCurrentPrice(IOddzAsset.AssetPair memory _pair) private view returns (uint256 cp) {
        uint8 decimal;
        // retrieving struct if more than one field is used, to reduce gas for memory storage
        IOddzAsset.Asset memory primary = assetManager.getAsset(_pair._primary);
        (cp, decimal) = oracle.getUnderlyingPrice(primary._name, _pair._strike);

        cp = updatePrecision(cp, decimal, primary._precision);
    }

    /**
     * @notice get collateral info for option
     * @param _cp current price of the underlying asset
     * @param _iv implied volatility of the underlying asset
     * @param _strike strike price provided by the option buyer
     * @param _pair Asset pair
     * @param _ivDecimal iv precision
     * @return callOverColl - call over collateral
     * @return putOverColl - put over collateral
     */
    function getCollateralAmount(
        uint256 _cp,
        uint256 _iv,
        uint256 _strike,
        address _pair,
        uint8 _ivDecimal
    ) private view returns (uint256 callOverColl, uint256 putOverColl) {
        IOddzAsset.Asset memory primary = assetManager.getAsset(assetManager.getPrimaryFromPair(_pair));
        uint256 minAssetPrice = getMinStrikePrice(_cp, _iv, _ivDecimal);
        uint256 maxAssetPrice = getMaxStrikePrice(_cp, _iv, _ivDecimal);
        validStrike(_strike, minAssetPrice, maxAssetPrice);
        // limit call over collateral to _strike i.e. max profit is limited to _strike
        callOverColl = updatePrecision(maxAssetPrice.min(_strike), primary._precision, token.decimals());
        putOverColl = updatePrecision(_strike - minAssetPrice, primary._precision, token.decimals());
    }

    /**
     * @notice set transaction fee percentage
     * @param _feePerc transaction fee percentage valid range (1, 10)
     */
    function setTransactionFeePerc(uint256 _feePerc) external onlyOwner {
        require(_feePerc >= 1 && _feePerc <= 10, "Invalid transaction fee");
        txnFeePerc = _feePerc;
    }

    /**
     * @notice set settlement fee percentage
     * @param _feePerc settlement fee percentage valid range (1, 10)
     */
    function setSettlementFeePerc(uint256 _feePerc) external onlyOwner {
        require(_feePerc >= 1 && _feePerc <= 10, "Invalid settlement fee");
        settlementFeePerc = _feePerc;
    }

    function getLockAmount(
        uint256 _cp,
        uint256 _iv,
        uint256 _strike,
        address _pair,
        uint8 _ivDecimal,
        OptionType _optionType
    ) private view returns (uint256 lockAmount) {
        (uint256 callOverColl, uint256 putOverColl) = getCollateralAmount(_cp, _iv, _strike, _pair, _ivDecimal);
        lockAmount = _optionType == OptionType.Call ? callOverColl : putOverColl;
    }

    function buy(
        OptionDetails memory _details,
        uint256 _premiumWithSlippage,
        address _buyer
    )
        external
        override
        validateOptionParams(_details._optionType, _details._pair, _details._expiration)
        validAmount(_details._amount, _details._pair)
        returns (uint256 optionId)
    {
        address buyer_ = msg.sender == address(sdk) ? _buyer : msg.sender;
        optionId = createOption(_details, _premiumWithSlippage, buyer_);
    }

    /**
     * @notice Create option
     * @param _details option buy details
     * @param _premiumWithSlippage Options details
     * @param _buyer Address of buyer
     * @return optionId newly created Option Id
     */
    function createOption(
        OptionDetails memory _details,
        uint256 _premiumWithSlippage,
        address _buyer
    ) private returns (uint256 optionId) {
        PremiumResult memory premiumResult = getPremium(_details);
        require(_premiumWithSlippage >= premiumResult.optionPremium, "Premium crossed slippage tolerance");
        uint256 cp = getCurrentPrice(assetManager.getPair(_details._pair));
        validateOptionAmount(
            token.allowance(_buyer, address(this)),
            premiumResult.optionPremium + premiumResult.txnFee
        );
        uint256 lockAmount =
            getLockAmount(
                cp,
                premiumResult.iv,
                _details._strike,
                _details._pair,
                premiumResult.ivDecimal,
                _details._optionType
            );
        optionId = options.length;
        Option memory option =
            Option(
                State.Active,
                _buyer,
                _details._strike,
                _details._amount,
                lockAmount,
                premiumResult.optionPremium,
                _details._expiration + block.timestamp,
                _details._pair,
                _details._optionType
            );

        options.push(option);
        pool.lockLiquidity(optionId, lockAmount, premiumResult.optionPremium);
        txnFeeAggregate = txnFeeAggregate + premiumResult.txnFee;

        token.safeTransferFrom(_buyer, address(pool), premiumResult.optionPremium);
        token.safeTransferFrom(_buyer, address(this), premiumResult.txnFee);

        emit Buy(
            optionId,
            _buyer,
            _details._optionModel,
            premiumResult.txnFee,
            premiumResult.optionPremium + premiumResult.txnFee,
            _details._pair
        );
    }

    /**
     * @notice Used for getting the actual options prices
     * @param _option Option details
     * @return premiumResult Premium, iv  Details
     */
    function getPremium(OptionDetails memory _option)
        public
        view
        override
        validateOptionParams(_option._optionType, _option._pair, _option._expiration)
        returns (PremiumResult memory premiumResult)
    {
        (premiumResult.ivDecimal, premiumResult.iv, premiumResult.optionPremium) = getOptionPremiumDetails(_option);

        premiumResult.txnFee = getTransactionFee(premiumResult.optionPremium);
    }

    function getOptionPremiumDetails(OptionDetails memory optionDetails)
        private
        view
        returns (
            uint8 ivDecimal,
            uint256 iv,
            uint256 optionPremium
        )
    {
        IOddzAsset.AssetPair memory pair = assetManager.getPair(optionDetails._pair);

        (iv, ivDecimal) = volatility.calculateIv(pair._primary, pair._strike, optionDetails._expiration);

        optionPremium = premiumManager.getPremium(
            optionDetails._optionType == IOddzOption.OptionType.Call ? true : false,
            assetManager.getPrecision(pair._primary),
            ivDecimal,
            getCurrentPrice(pair),
            optionDetails._strike,
            optionDetails._expiration,
            optionDetails._amount,
            iv,
            optionDetails._optionModel
        );
        // convert to USD price precision
        uint8 _decimal = assetManager.getPrecision(pair._primary);
        optionPremium = updatePrecision(optionPremium, _decimal, token.decimals());
    }

    /**
     * @notice Used for cash settlement excerise for an active option
     * @param _optionId Option id
     */
    function exercise(uint256 _optionId) external override {
        Option storage option = options[_optionId];
        require(option.expiration >= block.timestamp, "Option has expired");
        require(option.holder == msg.sender, "Wrong msg.sender");
        require(option.state == State.Active, "Wrong state");

        option.state = State.Exercised;
        (uint256 profit, uint256 settlementFee) = getProfit(_optionId);
        pool.send(_optionId, option.holder, profit);

        emit Exercise(_optionId, profit, settlementFee, ExcerciseType.Cash);
    }

    /**
     * @notice Used for physical settlement excerise for an active option
     * @param _optionId Option id
     * @param _deadline Deadline until which txn does not revert
     */
    function excerciseUA(uint256 _optionId, uint32 _deadline) external override {
        require(_deadline <= maxDeadline, "Deadline input is more than maximum limit allowed");
        Option storage option = options[_optionId];
        require(option.expiration >= block.timestamp, "Option has expired");
        require(option.holder == msg.sender, "Wrong msg.sender");
        require(option.state == State.Active, "Wrong state");

        option.state = State.Exercised;
        (uint256 profit, uint256 settlementFee) = getProfit(_optionId);
        IOddzAsset.AssetPair memory pair = assetManager.getPair(option.pair);
        pool.sendUA(_optionId, option.holder, profit, pair._primary, pair._strike, _deadline);

        emit Exercise(_optionId, profit, settlementFee, ExcerciseType.Physical);
    }

    /**
     * @notice Transaction fee calculation for the option premium
     * @param _amount Option premium
     * @return txnFee Transaction Fee
     */
    function getTransactionFee(uint256 _amount) private view returns (uint256 txnFee) {
        txnFee = (_amount * txnFeePerc) / 100;
    }

    /**
     * @notice Sends profits in USD from the USD pool to an option holder's address
     * @param _optionId ID of the option
     */
    function getProfit(uint256 _optionId) internal returns (uint256 profit, uint256 settlementFee) {
        Option memory option = options[_optionId];
        IOddzAsset.AssetPair memory pair = assetManager.getPair(option.pair);
        uint256 _cp = getCurrentPrice(pair);

        if (option.optionType == OptionType.Call) {
            require(option.strike <= _cp, "Call option: Current price is too low");
            profit = (_cp - option.strike) * option.amount;
        } else {
            require(option.strike >= _cp, "Put option: Current price is too high");
            profit = (option.strike - _cp) * option.amount;
        }
        // amount in wei
        profit = profit / 1e18;

        // convert profit to usd decimals
        profit = updatePrecision(profit, assetManager.getPrecision(pair._primary), token.decimals());

        if (profit > option.lockedAmount) profit = option.lockedAmount;
        settlementFee = (profit * settlementFeePerc) / 100;
        settlementFeeAggregate = settlementFeeAggregate + settlementFee;
        profit = profit - settlementFee;
    }

    /**
     * @notice Unlock funds locked in the expired options
     * @param _optionId ID of the option
     */
    function unlock(uint256 _optionId) public {
        Option storage option = options[_optionId];
        require(option.expiration < block.timestamp, "Option has not expired yet");
        require(option.state == State.Active, "Option is not active");
        option.state = State.Expired;
        pool.unlockLiquidity(_optionId);

        emit Expire(_optionId, option.premium);
    }

    /**
     * @notice Unlocks an array of options
     * @param _optionIds array of options
     */
    function unlockAll(uint256[] calldata _optionIds) external {
        uint256 arrayLength = _optionIds.length;
        for (uint256 i = 0; i < arrayLength; i++) {
            unlock(_optionIds[i]);
        }
    }

    /**
     * @notice sets maximum deadline for DEX swap
     * @param _deadline maximum swap transaction time
     */
    function setMaxDeadline(uint32 _deadline) public onlyOwner {
        maxDeadline = _deadline;
    }

    /**
     * @notice sets SDK address
     * @param _sdk Oddz SDK address
     */
    function setSdk(OddzSDK _sdk) external onlyOwner {
        require(address(_sdk).isContract(), "invalid SDK contract address");
        sdk = _sdk;
    }

    /**
     * @notice transfer transaction fee to beneficiary
     */
    function transferTxnFeeToBeneficiary() external {
        uint256 txnFee = txnFeeAggregate;
        txnFeeAggregate = 0;

        token.safeTransfer(address(stakingBenficiary), txnFee);
        stakingBenficiary.deposit(txnFee, IOddzStaking.DepositType.Transaction);
    }

    /**
     * @notice transfer settlement fee to beneficiary
     */
    function transferSettlementFeeToBeneficiary() external {
        uint256 settlementFee = settlementFeeAggregate;
        settlementFeeAggregate = 0;

        token.safeTransfer(address(stakingBenficiary), settlementFee);
        stakingBenficiary.deposit(settlementFee, IOddzStaking.DepositType.Settlement);
    }

    /**
     * @notice update precision from current to required
     * @param _value value to be precision updated
     * @param _current current precision
     * @param _required required precision
     * @return result updated _value
     */
    function updatePrecision(
        uint256 _value,
        uint8 _current,
        uint8 _required
    ) private pure returns (uint256 result) {
        if (_required > _current) result = (_value * (10**_required)) / (10**_current);
        else result = (_value * (10**_current)) / (10**_required);
    }
}
