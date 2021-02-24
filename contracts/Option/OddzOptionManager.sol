// SPDX-License-Identifier: BSD-4-Clause
pragma solidity ^0.7.0;

import "./IOddzOption.sol";
import "../Oracle/IOddzPriceOracle.sol";
import "../Oracle/IOddzVolatility.sol";
import "../Staking/IOddzStaking.sol";
import "./OddzAssetManager.sol";
import "../Pool/OddzLiquidityPool.sol";
import "../Libs/BlackScholes.sol";
import "./IERC20Extented.sol";
import "hardhat/console.sol";

contract OddzOptionManager is IOddzOption, OddzAssetManager {
    using SafeMath for uint256;
    using Math for uint256;
    using SafeERC20 for IERC20Extented;

    IOddzLiquidityPool public pool;
    IOddzPriceOracle public oracle;
    IOddzVolatility public volatility;
    IOddzStaking public stakingBenficiary;
    IERC20Extented public token;
    Option[] public options;
    uint256 public createdAt;
    uint256 public maxExpiry = 30 days;
    uint256 public minExpiry = 1 days;
    /**
     * @dev The percentage precision. (100000 = 100%)
     */
    uint256 internal constant PERCENTAGE_PRECISION = 100000;

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

    constructor(
        IOddzPriceOracle _oracle,
        IOddzVolatility _iv,
        IOddzStaking _staking,
        IOddzLiquidityPool _pool,
        IERC20Extented _token
    ) {
        pool = _pool;
        oracle = _oracle;
        volatility = _iv;
        stakingBenficiary = _staking;
        createdAt = block.timestamp;
        token = _token;
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
        uint256 _decimal
    ) private view {
        _strike = _strike.mul(10**token.decimals()).div(_decimal);
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
        uint256 _ivDecimal
    ) private view returns (uint256 oc) {
        oc = _cp.add(_cp.mul(_iv).div(_ivDecimal));
        oc = oc.min(_cp.add(_cp));
        // convert to usd decimals
        oc = oc.mul(10**token.decimals()).div(_decimal);
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
        uint256 _ivDecimal
    ) private view returns (uint256 oc) {
        oc = (_cp.mul(_iv).div(_ivDecimal)).sub(_cp);
        // convert to usd decimals
        oc = oc.mul(10**token.decimals()).div(_decimal);
    }

    /**
     * @notice get current price of the given asset
     * @param _pair asset pair
     * @return cp - current price of the underlying asset
     */
    function getCurrentPrice(AssetPair memory _pair) private view returns (uint256 cp) {
        cp = oracle.getUnderlyingPrice(_pair.primary, _pair.strike);
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
        uint256 _ivDecimal
    ) private view returns (uint256 minAssetPrice, uint256 maxAssetPrice) {
        minAssetPrice = getPutOverColl(_cp, _iv, assetIdMap[pairIdMap[_pair].primary].precision, _ivDecimal);
        maxAssetPrice = getCallOverColl(_cp, _iv, assetIdMap[pairIdMap[_pair].primary].precision, _ivDecimal);
        validStrike(_strike, minAssetPrice, maxAssetPrice, assetIdMap[pairIdMap[_pair].primary].precision);
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

    function buy(
        uint32 _pair,
        uint256 _expiration,
        uint256 _amount,
        uint256 _strike,
        OptionType _optionType
    )
        external
        override
        validOptionType(_optionType)
        validExpiration(_expiration)
        validAssetPair(_pair)
        returns (uint256 optionId)
    {
        optionId = createOption(_strike, _amount, _expiration, _pair, _optionType);
    }

    /**
     * @notice Create option
     * @param _strike Strike price of the option
     * @param _amount Option amount
     * @param _expiration Option period in unix timestamp
     * @param _pair Asset Pair
     * @param _optionType Option Type (Call/Put)
     * @return optionId newly created Option Id
     */
    function createOption(
        uint256 _strike,
        uint256 _amount,
        uint256 _expiration,
        uint32 _pair,
        OptionType _optionType
    ) private returns (uint256 optionId) {
        (uint256 optionPremium, uint256 txnFee, uint256 cp, uint256 iv, uint256 ivDecimal) =
            getPremium(_pair, _expiration, _amount, _strike, _optionType);
        validateOptionAmount(token.allowance(msg.sender, address(this)), optionPremium.add(txnFee));

        (uint256 minStrikePrice, uint256 maxStrikePrice) = getAssetStrikePriceRange(cp, iv, _strike, _pair, ivDecimal);

        optionId = options.length;
        Option memory option =
            Option(
                State.Active,
                msg.sender,
                _strike,
                _amount,
                _optionType == OptionType.Call ? maxStrikePrice : minStrikePrice,
                optionPremium,
                _expiration.add(block.timestamp),
                _pair,
                _optionType
            );

        options.push(option);
        txnFeeAggregate = txnFeeAggregate.add(txnFee);
        token.safeTransferFrom(msg.sender, address(pool), optionPremium.add(txnFee));

        pool.lockLiquidity(optionId, option.lockedAmount, option.premium);

        emit Buy(optionId, msg.sender, txnFee, optionPremium.add(txnFee), option.pairId);
    }

    /**
     * @notice Used for getting the actual options prices
     * @param _pair Asset Pair
     * @param _expiration Option period in unix timestamp
     * @param _amount Option amount
     * @param _strike Strike price of the option
     * @param _optionType Option Type (Call/Put)
     * @return optionPremium Premium to be paid
     * @return txnFee Transaction Fee
     * @return cp Current price of the underlying asset
     * @return iv implied volatility of the underlying asset
     * @return ivDecimal implied volatility precision
     */
    function getPremium(
        uint32 _pair,
        uint256 _expiration,
        uint256 _amount,
        uint256 _strike,
        OptionType _optionType
    )
        public
        view
        validOptionType(_optionType)
        validExpiration(_expiration)
        validAssetPair(_pair)
        returns (
            uint256 optionPremium,
            uint256 txnFee,
            uint256 cp,
            uint256 iv,
            uint256 ivDecimal
        )
    {
        (optionPremium, cp, iv, ivDecimal) = getPremiumBlackScholes(
            pairIdMap[_pair].primary,
            _expiration,
            _strike,
            _optionType,
            _amount
        );

        txnFee = getTransactionFee(optionPremium);
    }

    /**
     * @notice Provides black scholes premium price
     * @param _pair Asset Pair
     * @param _expiration Option period in unix timestamp
     * @param _strike Strike price of the option
     * @param _optionType Option Type (Call/Put)
     * @param _amount Option amount
     * @return optionPremium Premium to be paid
     * @return cp Current price of the underlying asset
     * @return iv implied volatility of the underlying asset
     * @return ivDecimal implied volatility precision
     */
    function getPremiumBlackScholes(
        uint32 _pair,
        uint256 _expiration,
        uint256 _strike,
        OptionType _optionType,
        uint256 _amount
    )
        private
        view
        returns (
            uint256 optionPremium,
            uint256 cp,
            uint256 iv,
            uint256 ivDecimal
        )
    {
        AssetPair memory pair = pairIdMap[_pair];
        Asset memory asset = assetIdMap[pair.primary];
        cp = getCurrentPrice(pair);
        (iv, ivDecimal) = volatility.calculateIv(pair.primary, _optionType, _expiration, _amount, _strike);

        optionPremium = BlackScholes.getOptionPrice(
            _optionType == OptionType.Call ? true : false,
            _strike,
            cp,
            asset.precision,
            _expiration,
            iv,
            0,
            0,
            PERCENTAGE_PRECISION
        );
        // _amount in wei
        optionPremium = optionPremium.mul(_amount).div(1e18);
        // convert to USD price precision
        optionPremium = optionPremium.mul(10**token.decimals()).div(asset.precision);
    }

    /**
     * @notice Transaction fee calculation for the option premium
     * @param _amount Option premium
     * @return txnFee Transaction Fee
     */
    function getTransactionFee(uint256 _amount) private view returns (uint256 txnFee) {
        txnFee = _amount.mul(txnFeePerc).div(100);
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
        (uint256 profit, uint256 settlementFee) = transferProfit(_optionId, ExcerciseType.Cash, option.holder);

        emit Exercise(_optionId, profit, settlementFee, ExcerciseType.Cash);
    }

    /**
     * @notice Used for physical settlement excerise for an active option
     * @param _optionId Option id
     */
    function excerciseUA(uint256 _optionId, address payable _uaAddress) external override {
        Option storage option = options[_optionId];
        require(option.expiration >= block.timestamp, "Option has expired");
        require(option.holder == msg.sender, "Wrong msg.sender");
        require(option.state == State.Active, "Wrong state");

        option.state = State.Exercised;
        (uint256 profit, uint256 settlementFee) = transferProfit(_optionId, ExcerciseType.Physical, _uaAddress);

        emit Exercise(_optionId, profit, settlementFee, ExcerciseType.Physical);
    }

    /**
     * @notice Sends profits in USD from the USD pool to an option holder's address
     * @param _optionId ID of the option
     * @param _type Excercise Type e.g: Cash or Physical
     * @param _address address of the option holder
     */
    function transferProfit(
        uint256 _optionId,
        ExcerciseType _type,
        address payable _address
    ) internal returns (uint256 profit, uint256 settlementFee) {
        Option memory option = options[_optionId];
        AssetPair memory pair = pairIdMap[option.pairId];
        uint256 _cp = getCurrentPrice(pair);

        if (option.optionType == OptionType.Call) {
            require(option.strike <= _cp, "Call option: Current price is too low");
            profit = _cp.sub(option.strike).mul(option.amount);
        } else {
            require(option.strike >= _cp, "Put option: Current price is too high");
            profit = option.strike.sub(_cp).mul(option.amount);
        }
        // amount in wei
        profit = profit.div(1e18);
        // convert profit to usd decimals
        profit = profit.mul(10**token.decimals()).div(assetIdMap[pair.primary].precision);

        if (profit > option.lockedAmount) profit = option.lockedAmount;
        settlementFee = profit.mul(settlementFeePerc).div(100);
        settlementFeeAggregate = settlementFeeAggregate.add(settlementFee);
        profit = profit.sub(settlementFee);

        if (_type == ExcerciseType.Cash) pool.send(_optionId, _address, profit);
        else pool.sendUA(_optionId, _address, profit);
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

        stakingBenficiary.deposit(txnFee, IOddzStaking.DepositType.Transaction);
    }

    /**
     * @notice transfer settlement fee to beneficiary
     */
    function transferSettlementFeeToBeneficiary() external {
        uint256 settlementFee = settlementFeeAggregate;
        settlementFeeAggregate = 0;

        stakingBenficiary.deposit(settlementFee, IOddzStaking.DepositType.Settlement);
    }
}