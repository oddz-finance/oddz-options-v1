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
import "hardhat/console.sol";

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
     * @notice sets maximum deadline for DEX swap
     * @param _deadline maximum swap transaction time
     */
    function setMaxDeadline(uint32 _deadline) public onlyOwner {
        maxDeadline = _deadline;
    }

    function setSdk(OddzSDK _sdk) external onlyOwner {
        require(address(_sdk).isContract(), "invalid SDK contract address");
        sdk = _sdk;
    }

    /**
     * @notice validate strike price
     * @param _strike strike price provided by the option buyer
     * @param _minPrice minumum allowed strike price
     * @param _maxPrice maximum allowed strike price
     * @param _decimal underlying asset precision
     */
    function validStrike(
        uint256 _strike,
        uint256 _minPrice,
        uint256 _maxPrice,
        uint8 _decimal
    ) private view {
        _strike = (_strike * (10**token.decimals())) / (10**_decimal);
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
     * @notice get over collateralization for call option
     * @param _cp current price of the underlying asset
     * @param _iv implied volatility of the underlying asset
     * @param _decimal underlying asset precision
     * @param _ivDecimal iv precision
     * @return oc - over collateralization
     */
    function getCallOverColl(
        uint256 _cp,
        uint256 _iv,
        uint256 _decimal,
        uint8 _ivDecimal
    ) private view returns (uint256 oc) {
        oc = _cp + ((_cp * _iv) / (10**_ivDecimal));
        oc = oc.min(_cp + _cp);
        // convert to usd decimals
        oc = (oc * (10**token.decimals())) / (10**_decimal);
    }

    /**
     * @notice get over collateralization for put option
     * @param _cp current price of the underlying asset
     * @param _iv implied volatility of the underlying asset
     * @param _decimal underlying asset precision
     * @param _ivDecimal iv precision
     * @return oc - over collateralization
     */
    function getPutOverColl(
        uint256 _cp,
        uint256 _iv,
        uint256 _decimal,
        uint8 _ivDecimal
    ) private view returns (uint256 oc) {
        oc = ((_cp * _iv) / (10**_ivDecimal)) - _cp;
        // convert to usd decimals
        oc = (oc * (10**token.decimals())) / (10**_decimal);
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

        if (decimal > primary._precision) cp = cp / ((10**decimal) / (10**primary._precision));
        else cp = (cp * (10**primary._precision)) / (10**decimal);
    }

    /**
     * @notice get underlying assets valid strike price range
     * @param _cp current price of the underlying asset
     * @param _iv implied volatility of the underlying asset
     * @param _strike strike price provided by the option buyer
     * @param _pair Asset pair
     * @return minAssetPrice - minimum allowed strike price for the underlying asset
     * @return maxAssetPrice - maxium allowed strike price for the underlying asset
     */
    function getAssetStrikePriceRange(
        uint256 _cp,
        uint256 _iv,
        uint256 _strike,
        address _pair,
        uint8 _ivDecimal
    ) private view returns (uint256 minAssetPrice, uint256 maxAssetPrice) {
        IOddzAsset.Asset memory primary = assetManager.getAsset(assetManager.getPrimaryFromPair(_pair));
        minAssetPrice = getPutOverColl(_cp, _iv, primary._precision, _ivDecimal);
        maxAssetPrice = getCallOverColl(_cp, _iv, primary._precision, _ivDecimal);
        validStrike(_strike, minAssetPrice, maxAssetPrice, primary._precision);
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
        (uint256 minStrikePrice, uint256 maxStrikePrice) =
            getAssetStrikePriceRange(_cp, _iv, _strike, _pair, _ivDecimal);
        lockAmount = _optionType == OptionType.Call ? maxStrikePrice : minStrikePrice;
    }

    function buy(
        OptionDetails memory _option,
        uint256 _premiumWithSlippage,
        address _buyer
    )
        external
        override
        validateOptionParams(_option._optionType, _option._pair, _option._expiration)
        validAmount(_option._amount, _option._pair)
        returns (uint256 optionId)
    {
        address sender_ = msg.sender == address(sdk) ? _buyer : msg.sender;
        optionId = createOption(_option, _premiumWithSlippage, sender_);
    }

    /**
     * @notice Create option
     * @param optionDetails option buy details
     * @return optionId newly created Option Id
     */
    function createOption(
        OptionDetails memory optionDetails,
        uint256 _premiumWithSlippage,
        address _buyer
    ) private returns (uint256 optionId) {
        PremiumResult memory premiumResult = getPremium(optionDetails);
        require(_premiumWithSlippage >= premiumResult.optionPremium, "Premium crossed slippage tolerance");
        uint256 cp = getCurrentPrice(assetManager.getPair(optionDetails._pair));
        validateOptionAmount(
            token.allowance(_buyer, address(this)),
            premiumResult.optionPremium + premiumResult.txnFee
        );
        uint256 lockAmount =
            getLockAmount(
                cp,
                premiumResult.iv,
                optionDetails._strike,
                optionDetails._pair,
                premiumResult.ivDecimal,
                optionDetails._optionType
            );
        optionId = options.length;
        Option memory option =
            Option(
                State.Active,
                _buyer,
                optionDetails._strike,
                optionDetails._amount,
                lockAmount,
                premiumResult.optionPremium,
                optionDetails._expiration + block.timestamp,
                optionDetails._pair,
                optionDetails._optionType
            );

        options.push(option);
        pool.lockLiquidity(optionId, lockAmount, premiumResult.optionPremium);
        txnFeeAggregate = txnFeeAggregate + premiumResult.txnFee;

        token.safeTransferFrom(_buyer, address(pool), premiumResult.optionPremium);
        token.safeTransferFrom(_buyer, address(this), premiumResult.txnFee);

        emit Buy(
            optionId,
            _buyer,
            optionDetails._optionModel,
            premiumResult.txnFee,
            premiumResult.optionPremium + premiumResult.txnFee,
            optionDetails._pair
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
        optionPremium = (optionPremium * (10**token.decimals())) / (10**assetManager.getPrecision(pair._primary));
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
        profit = (profit * (10**token.decimals())) / (10**assetManager.getPrecision(pair._primary));

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
}
