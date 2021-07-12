// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./IOddzOption.sol";
import "./IOddzAsset.sol";
import "../Pool/IOddzLiquidityPoolManager.sol";
import "./IOddzOptionPremiumManager.sol";
import "../IOddzAdministrator.sol";
import "../IOddzSDK.sol";
import "../Oracle/IOddzPriceOracleManager.sol";
import "../Oracle/IOddzIVOracleManager.sol";
import "../Libs/ABDKMath64x64.sol";
import "../Libs/IERC20Extented.sol";
import "./IOddzFeeManager.sol";

contract OddzOptionManager is IOddzOption, AccessControl {
    using Math for uint256;
    using SafeERC20 for IERC20Extented;
    using Address for address;

    bytes32 public constant TIMELOCKER_ROLE = keccak256("TIMELOCKER_ROLE");

    IOddzAsset public assetManager;
    IOddzLiquidityPoolManager public pool;
    IOddzPriceOracleManager public oracle;
    IOddzIVOracleManager public volatility;
    IOddzOptionPremiumManager public premiumManager;
    IERC20Extented public token;
    IOddzFeeManager public oddzFeeManager;
    Option[] public override options;

    /**
     * @dev Transaction Fee definitions
     */
    uint256 public txnFeeAggregate;

    /**
     * @dev Settlement Fee definitions
     */
    uint256 public settlementFeeAggregate;

    /**
     * @dev Max Deadline in seconds
     */
    uint32 public maxDeadline;

    /**
     * @dev Max Slippage
     */
    uint16 public maxSlippage = 500;

    /**
     * @dev SDK contract address
     */
    IOddzSDK public sdk;
    IOddzAdministrator public administrator;

    /**
     * @dev minimum premium
     */
    uint256 public minimumPremium;

    /**
     * @dev option transfer map
     * mapping (optionId => minAmount)
     */
    mapping(uint256 => uint256) public optionTransferMap;

    constructor(
        IOddzPriceOracleManager _oracle,
        IOddzIVOracleManager _iv,
        IOddzLiquidityPoolManager _pool,
        IERC20Extented _token,
        IOddzAsset _assetManager,
        IOddzOptionPremiumManager _premiumManager,
        IOddzFeeManager _oddzFeeManager
    ) {
        pool = _pool;
        oracle = _oracle;
        volatility = _iv;
        token = _token;
        assetManager = _assetManager;
        premiumManager = _premiumManager;
        oddzFeeManager = _oddzFeeManager;
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(TIMELOCKER_ROLE, msg.sender);
        _setRoleAdmin(TIMELOCKER_ROLE, TIMELOCKER_ROLE);
    }

    modifier onlyOwner(address _address) {
        require(hasRole(DEFAULT_ADMIN_ROLE, _address), "caller has no access to the method");
        _;
    }

    modifier onlyTimeLocker(address _address) {
        require(hasRole(TIMELOCKER_ROLE, _address), "caller has no access to the method");
        _;
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
        _validAssetPair(_pair);
        _validExpiration(_expiration, _pair);
        _;
    }

    function _validExpiration(uint256 _expiration, address _pair) private view {
        require(_expiration <= assetManager.getMaxPeriod(_pair), "Expiration is greater than max expiry");
        require(_expiration >= assetManager.getMinPeriod(_pair), "Expiration is less than min expiry");
    }

    function _validAssetPair(address _pair) private view {
        require(assetManager.getStatusOfPair(_pair) == true, "Invalid Asset pair");
    }

    /**
     * @notice validate strike price
     * @param _strike strike price provided by the option buyer
     * @param _minPrice minumum allowed strike price
     * @param _maxPrice maximum allowed strike price
     */
    function _validStrike(
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
    function _validateOptionAmount(uint256 _value, uint256 _premium) private view {
        require(_premium >= minimumPremium, "amount is lower than minimum premium");
        require(_value >= _premium, "Premium is low");
    }

    /**
     * @notice get maximum strike price
     * @param _cp current price of the underlying asset
     * @param _iv implied volatility of the underlying asset
     * @param _ivDecimal iv precision
     * @return oc - over collateralization
     */
    function _getMaxStrikePrice(
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
    function _getMinStrikePrice(
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
    function _getCurrentPrice(IOddzAsset.AssetPair memory _pair) private view returns (uint256 cp) {
        uint8 decimal;
        // retrieving struct if more than one field is used, to reduce gas for memory storage
        IOddzAsset.Asset memory primary = assetManager.getAsset(_pair._primary);
        (cp, decimal) = oracle.getUnderlyingPrice(primary._name, _pair._strike);

        cp = _updatePrecision(cp, decimal, primary._precision);
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
    function _getCollateralAmount(
        uint256 _cp,
        uint256 _iv,
        uint256 _strike,
        address _pair,
        uint8 _ivDecimal
    ) private view returns (uint256 callOverColl, uint256 putOverColl) {
        IOddzAsset.Asset memory primary = assetManager.getAsset(assetManager.getPrimaryFromPair(_pair));
        uint256 minAssetPrice = _getMinStrikePrice(_cp, _iv, _ivDecimal);
        uint256 maxAssetPrice = _getMaxStrikePrice(_cp, _iv, _ivDecimal);
        _validStrike(_strike, minAssetPrice, maxAssetPrice);
        // limit call over collateral to _strike i.e. max profit is limited to _strike
        callOverColl = _updatePrecision(maxAssetPrice.min(_strike), primary._precision, token.decimals());
        putOverColl = _updatePrecision(_strike - minAssetPrice, primary._precision, token.decimals());
    }

    function _getLockAmount(
        uint256 _cp,
        uint256 _iv,
        uint256 _strike,
        address _pair,
        uint8 _ivDecimal,
        OptionType _optionType,
        uint256 _quantity
    ) private view returns (uint256 lockAmount) {
        (uint256 callOverColl, uint256 putOverColl) = _getCollateralAmount(_cp, _iv, _strike, _pair, _ivDecimal);
        lockAmount = _optionType == OptionType.Call ? callOverColl : putOverColl;
        lockAmount = (lockAmount * _quantity) / 1e18;
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
        optionId = _createOption(_details, _premiumWithSlippage, buyer_);
    }

    /**
     * @notice Create option
     * @param _details option buy details
     * @param _premiumWithSlippage Options details
     * @param _buyer Address of buyer
     * @return optionId newly created Option Id
     */
    function _createOption(
        OptionDetails memory _details,
        uint256 _premiumWithSlippage,
        address _buyer
    ) private returns (uint256 optionId) {
        PremiumResult memory premiumResult = getPremium(_details, _buyer);
        require(_premiumWithSlippage >= premiumResult.optionPremium, "Premium crossed slippage tolerance");
        uint256 cp = _getCurrentPrice(assetManager.getPair(_details._pair));
        _validateOptionAmount(
            token.allowance(_buyer, address(this)),
            premiumResult.optionPremium + premiumResult.txnFee
        );
        uint256 lockAmount =
            _getLockAmount(
                cp,
                premiumResult.iv,
                _details._strike,
                _details._pair,
                premiumResult.ivDecimal,
                _details._optionType,
                _details._amount
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
        IOddzLiquidityPoolManager.LiquidityParams memory liquidityParams =
            IOddzLiquidityPoolManager.LiquidityParams(
                lockAmount,
                _details._expiration,
                _details._pair,
                _details._optionModel,
                _details._optionType
            );
        pool.lockLiquidity(optionId, liquidityParams, premiumResult.optionPremium);
        txnFeeAggregate += premiumResult.txnFee;

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
     * @param _buyer Address of option buyer
     * @return premiumResult Premium, iv  Details
     */
    function getPremium(OptionDetails memory _option, address _buyer)
        public
        view
        override
        validateOptionParams(_option._optionType, _option._pair, _option._expiration)
        returns (PremiumResult memory premiumResult)
    {
        (premiumResult.ivDecimal, premiumResult.iv, premiumResult.optionPremium) = _getOptionPremiumDetails(_option);

        premiumResult.txnFee = _getTransactionFee(premiumResult.optionPremium, _buyer);
    }

    function _getOptionPremiumDetails(OptionDetails memory optionDetails)
        private
        view
        returns (
            uint8 ivDecimal,
            uint256 iv,
            uint256 optionPremium
        )
    {
        IOddzAsset.AssetPair memory pair = assetManager.getPair(optionDetails._pair);
        uint256 price = _getCurrentPrice(pair);
        (iv, ivDecimal) = volatility.calculateIv(
            pair._primary,
            pair._strike,
            optionDetails._expiration,
            price,
            optionDetails._strike
        );

        optionPremium = premiumManager.getPremium(
            optionDetails._optionType == IOddzOption.OptionType.Call ? true : false,
            assetManager.getPrecision(pair._primary),
            ivDecimal,
            price,
            optionDetails._strike,
            optionDetails._expiration,
            optionDetails._amount,
            iv,
            optionDetails._optionModel
        );
        // convert to USD price precision
        uint8 _decimal = assetManager.getPrecision(pair._primary);
        optionPremium = _updatePrecision(optionPremium, _decimal, token.decimals());
    }

    /**
     * @notice Used for cash settlement excerise for an active option
     * @param _optionId Option id
     */
    function exercise(uint256 _optionId) external override {
        Option storage option = options[_optionId];
        require(option.expiration >= block.timestamp, "Option has expired");
        require(option.holder == msg.sender, "Invalid Caller");
        require(option.state == State.Active, "Invalid state");

        option.state = State.Exercised;
        (uint256 profit, uint256 settlementFee) = _getProfit(_optionId);
        pool.send(_optionId, option.holder, profit);

        emit Exercise(_optionId, profit, settlementFee, ExcerciseType.Cash);
    }

    /**
     * @notice Used for physical settlement excerise for an active option
     * @param _optionId Option id
     * @param _deadline Deadline until which txn does not revert
     * @param _minAmountOut Min output tokens
     */
    function exerciseUA(
        uint256 _optionId,
        uint32 _deadline,
        uint16 _minAmountOut
    ) external override {
        require(_deadline <= maxDeadline, "Deadline input is more than maximum limit allowed");
        Option storage option = options[_optionId];
        require(option.expiration >= block.timestamp, "Option has expired");
        require(option.holder == msg.sender, "Invalid Caller");
        require(option.state == State.Active, "Invalid state");

        option.state = State.Exercised;
        (uint256 profit, uint256 settlementFee) = _getProfit(_optionId);
        IOddzAsset.AssetPair memory pair = assetManager.getPair(option.pair);

        pool.sendUA(_optionId, option.holder, profit, pair._primary, pair._strike, _deadline, _minAmountOut);

        emit Exercise(_optionId, profit, settlementFee, ExcerciseType.Physical);
    }

    function enableOptionTransfer(uint256 _optionId, uint256 _minAmount) external {
        Option storage option = options[_optionId];
        require(
            option.expiration > (block.timestamp + assetManager.getMinPeriod(option.pair)),
            "Option not eligble for transfer"
        );
        require(option.holder == msg.sender, "Invalid Caller");
        require(option.state == State.Active, "Invalid state");
        require(_minAmount >= minimumPremium, "amount is lower than minimum premium");

        optionTransferMap[_optionId] = _minAmount;

        emit OptionTransferEnabled(_optionId, _minAmount);
    }

    function optionTransfer(uint256 _optionId) external {
        Option storage option = options[_optionId];
        require(
            option.expiration > (block.timestamp + assetManager.getMinPeriod(option.pair)),
            "Option not eligble for transfer"
        );
        uint256 minAmount = optionTransferMap[_optionId];
        require(minAmount > 0, "Option not enabled for transfer");
        require(option.state == State.Active, "Invalid state");
        require(option.holder != msg.sender, "Self option transfer is not allowed");

        // once transfer initiated update option tranfer map
        delete optionTransferMap[_optionId];

        uint256 transferFee = _getTransactionFee(minAmount, msg.sender);
        txnFeeAggregate += transferFee;

        _validateOptionAmount(token.allowance(msg.sender, address(this)), minAmount + transferFee);

        token.safeTransferFrom(msg.sender, option.holder, minAmount);
        token.safeTransferFrom(msg.sender, address(this), transferFee);

        address oldHolder = option.holder;
        option.holder = msg.sender;

        emit OptionTransfer(_optionId, oldHolder, msg.sender, minAmount, transferFee);
    }

    /**
     * @notice Transaction fee calculation for the option premium
     * @param _amount Option premium
     * @param _buyer Option buyer address
     * @return txnFee Transaction Fee
     */
    function _getTransactionFee(uint256 _amount, address _buyer) private view returns (uint256 txnFee) {
        txnFee = ((_amount * oddzFeeManager.getTransactionFee(_buyer)) / (100 * 10**oddzFeeManager.decimals()));
    }

    /**
     * @notice Sends profits in USD from the USD pool to an option holder's address
     * @param _optionId ID of the option
     */
    function _getProfit(uint256 _optionId) private returns (uint256 profit, uint256 settlementFee) {
        Option memory option = options[_optionId];
        IOddzAsset.AssetPair memory pair = assetManager.getPair(option.pair);
        uint256 _cp = _getCurrentPrice(pair);

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
        profit = _updatePrecision(profit, assetManager.getPrecision(pair._primary), token.decimals());

        if (profit > option.lockedAmount) profit = option.lockedAmount;

        settlementFee = ((profit * oddzFeeManager.getSettlementFee(msg.sender)) /
            (100 * 10**oddzFeeManager.decimals()));
        settlementFeeAggregate += settlementFee;

        token.safeTransferFrom(msg.sender, address(this), settlementFee);
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
    function setMaxDeadline(uint32 _deadline) external onlyOwner(msg.sender) {
        maxDeadline = _deadline;
    }

    /**
     * @notice sets SDK address
     * @param _sdk Oddz SDK address
     */
    function setSdk(IOddzSDK _sdk) external onlyTimeLocker(msg.sender) {
        require(address(_sdk).isContract(), "invalid SDK contract address");
        sdk = _sdk;
    }

    /**
     * @notice sets administrator address
     * @param _administrator Oddz administrator address
     */
    function setAdministrator(IOddzAdministrator _administrator) external onlyTimeLocker(msg.sender) {
        require(address(_administrator).isContract(), "invalid administrator contract address");
        // Set token allowance of previous administrator to 0
        if (address(administrator) != address(0)) token.safeApprove(address(administrator), 0);

        administrator = _administrator;

        // Approve token transfer to administrator contract
        token.safeApprove(address(administrator), type(uint256).max);
    }

    function setMinimumPremium(uint256 _amount) external onlyTimeLocker(msg.sender) {
        uint256 amount = _amount / 10**token.decimals();
        require(amount >= 1 && amount < 50, "invalid minimum premium");
        minimumPremium = _amount;
    }

    function setTimeLocker(address _address) external {
        require(_address != address(0), "Invalid timelocker address");
        grantRole(TIMELOCKER_ROLE, _address);
    }

    function removeTimeLocker(address _address) external {
        revokeRole(TIMELOCKER_ROLE, _address);
    }

    /**
     * @notice transfer transaction fee to beneficiary
     */
    function transferTxnFeeToBeneficiary(uint256 _minAmountsOut) external {
        uint256 txnFee = txnFeeAggregate;
        txnFeeAggregate = 0;

        require(address(administrator) != address(0), "invalid administrator address");
        administrator.deposit(txnFee, IOddzAdministrator.DepositType.Transaction, _minAmountsOut);
    }

    /**
     * @notice transfer settlement fee to beneficiary
     */
    function transferSettlementFeeToBeneficiary(uint256 _minAmountsOut) external {
        uint256 settlementFee = settlementFeeAggregate;
        settlementFeeAggregate = 0;

        require(address(administrator) != address(0), "invalid administrator address");
        administrator.deposit(settlementFee, IOddzAdministrator.DepositType.Settlement, _minAmountsOut);
    }

    /**
     * @notice update precision from current to required
     * @param _value value to be precision updated
     * @param _current current precision
     * @param _required required precision
     * @return result updated _value
     */
    function _updatePrecision(
        uint256 _value,
        uint8 _current,
        uint8 _required
    ) private pure returns (uint256 result) {
        if (_required > _current) result = (_value * (10**_required)) / (10**_current);
        else result = (_value * (10**_current)) / (10**_required);
    }
}
