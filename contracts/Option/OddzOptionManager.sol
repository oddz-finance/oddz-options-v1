// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "./IOddzOption.sol";
import "./IOddzAsset.sol";
import "../Oracle/OddzPriceOracleManager.sol";
import "../Oracle/OddzIVOracleManager.sol";
import "../Staking/IOddzStaking.sol";
import "./OddzAssetManager.sol";
import "./OddzOptionPremiumManager.sol";
import "../Pool/OddzLiquidityPool.sol";
import "./IERC20Extented.sol";

contract OddzOptionManager is IOddzOption, Ownable {
    using Math for uint256;
    using SafeERC20 for IERC20Extented;

    OddzAssetManager public assetManager;
    IOddzLiquidityPool public pool;
    OddzPriceOracleManager public oracle;
    OddzIVOracleManager public volatility;
    OddzOptionPremiumManager public premiumManager;
    IOddzStaking public stakingBenficiary;
    IERC20Extented public token;
    Option[] public options;
    uint256 public maxExpiry = 30 days;
    uint256 public minExpiry = 1 days;

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

    // struct OptionDetails {
    //     uint256 _strike;
    //     uint256 _amount;
    //     uint256 _expiration;
    //     uint32 _pair;
    //     bytes32 _optionModel;
    //     OptionType _optionType;
    //     address _buyer;
        
    // }

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

    modifier validOptionType(OptionType _optionType) {
        require(_optionType == OptionType.Call || _optionType == OptionType.Put, "Invalid option type");
        _;
    }

    modifier validExpiration(uint256 _expiration) {
        require(_expiration <= maxExpiry, "Expiration cannot be more than 30 days");
        require(_expiration >= minExpiry, "Expiration cannot be less than 1 days");
        _;
    }


    modifier validAssetPair(uint32 _pairId) {
        require(assetManager.getStatusOfPair(_pairId) == true, "Invalid Asset pair");
        _;
    }

    modifier validAmount(uint32 _pairId, uint256 _amount) {
        require(_amount >= assetManager.getPurchaseLimit(_pairId), "amount less than purchase limit");
        _;
    }

    function setMaxDeadline(uint32 _deadline) public onlyOwner {
        maxDeadline = _deadline;
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
        (cp, decimal) = oracle.getUnderlyingPrice(primary._name, assetManager.getAssetName(_pair._strike));

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
        uint32 _pair,
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
        uint32 _pair,
        uint8 _ivDecimal,
        OptionType _optionType
    ) private view returns (uint256 lockAmount) {
        (uint256 minStrikePrice, uint256 maxStrikePrice) =
            getAssetStrikePriceRange(_cp, _iv, _strike, _pair, _ivDecimal);
        lockAmount = _optionType == OptionType.Call ? maxStrikePrice : minStrikePrice;
    }

    function buy(
        OptionDetails memory _option,
        address _buyer
    )
        external
        override
        validOptionType(_option._optionType)
        validExpiration(_option._expiration)
        validAssetPair(_option._pair)
        validAmount(_option._pair, _option._amount)
        returns (uint256 optionId)
    {
        
        optionId = createOption(_option, _buyer);
    }

    /**
     * @notice Create option
     * @param optionDetails option buy details
     * @return optionId newly created Option Id
     */
    function createOption(OptionDetails memory optionDetails, address _buyer)
        private
        returns (uint256 optionId)
    {
        (uint256 optionPremium, uint256 txnFee, uint256 iv, uint8 ivDecimal) =
            getPremium(
                optionDetails
            );
        require(optionDetails._premiumWithSlippage >= optionPremium, "Premium crossed slippage tolerance");
        uint256 cp = getCurrentPrice(assetManager.getPair(optionDetails._pair));
        validateOptionAmount(token.allowance(_buyer, address(this)), optionPremium + txnFee);

        uint256 lockAmount =
            getLockAmount(cp, iv, optionDetails._strike, optionDetails._pair, ivDecimal, optionDetails._optionType);
        optionId = options.length;
        Option memory option =
            Option(
                State.Active,
                payable(_buyer),
                optionDetails._strike,
                optionDetails._amount,
                lockAmount,
                optionPremium,
                optionDetails._expiration + block.timestamp,
                optionDetails._pair,
                optionDetails._optionType
            );

        options.push(option);
        pool.lockLiquidity(optionId, lockAmount, optionPremium);
        txnFeeAggregate = txnFeeAggregate + txnFee;

        token.safeTransferFrom(_buyer, address(pool), optionPremium);
        token.safeTransferFrom(_buyer, address(this), txnFee);

        emit Buy(
            optionId,
            _buyer,
            optionDetails._optionModel,
            txnFee,
            optionPremium + txnFee,
            optionDetails._pair
        );
    }

    /**
     * @notice Used for getting the actual options prices
     * @param _option Option details
     * @return optionPremium Premium to be paid
     * @return txnFee Transaction Fee
     * @return iv implied volatility of the underlying asset
     * @return ivDecimal implied volatility precision
     */
    function getPremium(
       OptionDetails memory _option
    )
        public
        view
        validOptionType(_option._optionType)
        validExpiration(_option._expiration)
        validAssetPair(_option._pair)
        returns (
            uint256 optionPremium,
            uint256 txnFee,
            uint256 iv,
            uint8 ivDecimal
        )
    {
        

        (ivDecimal, iv, optionPremium) = getOptionPremiumDetails(_option);

        txnFee = getTransactionFee(optionPremium);
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

        (iv, ivDecimal) = volatility.calculateIv(
            assetManager.getAssetName(pair._primary),
            assetManager.getAssetName(pair._strike),
            optionDetails._optionType,
            optionDetails._expiration,
            optionDetails._amount,
            optionDetails._strike
        );

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
        IOddzAsset.AssetPair memory pair = assetManager.getPair(option.pairId);
        pool.sendUA(
            _optionId,
            option.holder,
            profit,
            assetManager.getAssetName(pair._primary),
            assetManager.getAssetName(pair._strike),
            _deadline
        );

        emit Exercise(_optionId, profit, settlementFee, ExcerciseType.Physical);
    }

    /**
     * @notice Sends profits in USD from the USD pool to an option holder's address
     * @param _optionId ID of the option
     */
    function getProfit(uint256 _optionId) internal returns (uint256 profit, uint256 settlementFee) {
        Option memory option = options[_optionId];
        IOddzAsset.AssetPair memory pair = assetManager.getPair(option.pairId);
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
