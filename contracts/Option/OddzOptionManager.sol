// SPDX-License-Identifier: BSD-4-Clause
pragma experimental ABIEncoderV2;
pragma solidity ^0.7.0;

import "./IOddzOption.sol";
import "./IOddzAsset.sol";
import "../Oracle/OddzPriceOracleManager.sol";
import "../Oracle/OddzIVOracleManager.sol";
import "../Staking/IOddzStaking.sol";
import "./OddzAssetManager.sol";
import "../Pool/OddzLiquidityPool.sol";
import "../Libs/BlackScholes.sol";
import "./IERC20Extented.sol";
import "hardhat/console.sol";
import "../Integrations/MetaTransaction/BaseRelayRecipient.sol";

contract OddzOptionManager is IOddzOption, Ownable, BaseRelayRecipient {
    using SafeMath for uint256;
    using Math for uint256;
    using SafeERC20 for IERC20Extented;

    OddzAssetManager public assetManager;
    IOddzLiquidityPool public pool;
    OddzPriceOracleManager public oracle;
    OddzIVOracleManager public volatility;
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

    /**
     * @dev Max Deadline in seconds
     */

    uint32 public maxDeadline;

    constructor(
        OddzPriceOracleManager _oracle,
        OddzIVOracleManager _iv,
        IOddzStaking _staking,
        IOddzLiquidityPool _pool,
        IERC20Extented _token,
        OddzAssetManager _assetManager,
        address _trustedForwarder
        
    ) {
        pool = _pool;
        oracle = _oracle;
        volatility = _iv;
        stakingBenficiary = _staking;
        createdAt = block.timestamp;
        token = _token;
        trustedForwarder = _trustedForwarder;
        assetManager = _assetManager;
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

    function setTrustedForwarder(address forwarderAddress) public {
        require(forwarderAddress != address(0), "Forwarder Address cannot be 0");
        trustedForwarder = forwarderAddress;
    }

    function versionRecipient() external view virtual override returns (string memory) {
        return "1";
    }

    function _msgSender() internal view virtual override(BaseRelayRecipient, Context) returns (address payable ret) {
        if (msg.data.length >= 24 && isTrustedForwarder(msg.sender)) {
            // At this point we know that the sender is a trusted forwarder,
            // so we trust that the last bytes of msg.data are the verified sender address.
            // extract sender address from the end of msg.data
            assembly {
                ret := shr(96, calldataload(sub(calldatasize(), 20)))
            }
        } else {
            return msg.sender;
        }
    }
    modifier validAssetPair(uint32 _pairId) {
        require(assetManager.getStatusOfPair(_pairId) == true, "Invalid Asset pair");
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
        uint8 _ivDecimal
    ) private view returns (uint256 oc) {
        oc = _cp.add(_cp.mul(_iv).div(10**_ivDecimal));
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
        uint8 _ivDecimal
    ) private view returns (uint256 oc) {
        oc = (_cp.mul(_iv).div(10**_ivDecimal)).sub(_cp);
        // convert to usd decimals
        oc = oc.mul(10**token.decimals()).div(_decimal);
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

        if (10**decimal > primary._precision) cp = cp.div((10**decimal).div(primary._precision));
        else cp = cp.mul(primary._precision).div(10**decimal);
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
        (uint256 optionPremium, uint256 txnFee, uint256 cp, uint256 iv, uint8 ivDecimal) =
            getPremium(_pair, _expiration, _amount, _strike, _optionType);
        validateOptionAmount(token.allowance(_msgSender(), address(this)), optionPremium.add(txnFee));

        (uint256 minStrikePrice, uint256 maxStrikePrice) = getAssetStrikePriceRange(cp, iv, _strike, _pair, ivDecimal);

        optionId = options.length;
        Option memory option =
            Option(
                State.Active,
                _msgSender(),
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
        token.safeTransferFrom(_msgSender(), address(pool), optionPremium.add(txnFee));

        pool.lockLiquidity(optionId, option.lockedAmount, option.premium);

        emit Buy(optionId, _msgSender(), txnFee, optionPremium.add(txnFee), option.pairId);
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
            uint8 ivDecimal
        )
    {
        (optionPremium, cp, iv, ivDecimal) = getPremiumBlackScholes(_pair, _expiration, _strike, _optionType, _amount);

        txnFee = getTransactionFee(optionPremium);
    }

    /**
     * @notice Provides black scholes premium price
     * @param _pair Asset pair id
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
        IOddzOption.OptionType _optionType,
        uint256 _amount
    )
        private
        view
        returns (
            uint256 optionPremium,
            uint256 cp,
            uint256 iv,
            uint8 ivDecimal
        )
    {
        IOddzAsset.AssetPair memory pair = assetManager.getPair(_pair);
        uint256 precision = assetManager.getPrecision(pair._primary);
        cp = getCurrentPrice(pair);
        (iv, ivDecimal) = volatility.calculateIv(
            assetManager.getAssetName(pair._primary),
            assetManager.getAssetName(pair._strike),
            _optionType,
            _expiration,
            _amount,
            _strike
        );

        optionPremium = BlackScholes.getOptionPrice(
            _optionType == IOddzOption.OptionType.Call ? true : false,
            _strike,
            cp,
            precision,
            _expiration,
            iv,
            0,
            0,
            PERCENTAGE_PRECISION
        );
        // _amount in wei
        optionPremium = optionPremium.mul(_amount).div(1e18);
        // convert to USD price precision
        optionPremium = optionPremium.mul(10**token.decimals()).div(precision);
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
            profit = _cp.sub(option.strike).mul(option.amount);
        } else {
            require(option.strike >= _cp, "Put option: Current price is too high");
            profit = option.strike.sub(_cp).mul(option.amount);
        }
        // amount in wei
        profit = profit.div(1e18);

        // convert profit to usd decimals
        profit = profit.mul(10**token.decimals()).div(assetManager.getPrecision(pair._primary));

        if (profit > option.lockedAmount) profit = option.lockedAmount;
        settlementFee = profit.mul(settlementFeePerc).div(100);
        settlementFeeAggregate = settlementFeeAggregate.add(settlementFee);
        profit = profit.sub(settlementFee);
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
