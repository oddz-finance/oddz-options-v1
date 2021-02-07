// SPDX-License-Identifier: BSD-4-Clause
pragma solidity ^0.7.0;

import "./IOddzOption.sol";
import "../Oracle/IOddzPriceOracle.sol";
import "../Oracle/IOddzVolatility.sol";
import "../Pool/OddzLiquidityPool.sol";
import "../Libs/BlackScholes.sol";
import "hardhat/console.sol";

contract OddzOptionManager is Ownable, IOddzOption {
    using SafeMath for uint256;
    using Math for uint256;

    OddzLiquidityPool public pool;
    IOddzPriceOracle public oracle;
    IOddzVolatility public volatility;
    Option[] public options;
    Asset[] public assets;
    Asset public strikeAsset;
    mapping(bytes32 => Asset) internal assetNameMap;
    mapping(uint32 => Asset) internal assetIdMap;
    uint256 public createdAt;
    uint256 public maxExpiry = 30 days;
    uint256 public minExpiry = 1 days;
    uint256 public settlementFeePerc = 5;
    /**
     * @dev The percentage precision. (100000 = 100%)
     */
    uint256 internal constant PERCENTAGE_PRECISION = 100000;

    constructor(IOddzPriceOracle _oracle, IOddzVolatility _iv) {
        pool = new OddzLiquidityPool();
        oracle = _oracle;
        volatility = _iv;
        createdAt = block.timestamp;
    }

    /**
     * @notice Used for adding the new asset
     * @param _name Name for the underlying asset
     * @param _precision Precision for the underlying asset
     * @return assetId Asset id
     */
    function addAsset(bytes32 _name, uint256 _precision) external onlyOwner returns (uint32 assetId) {
        require(assetNameMap[_name].active == false, "Asset already present");
        assetId = uint32(assets.length);
        Asset memory asset = Asset({ id: assetId, name: _name, active: true, precision: _precision });
        assetNameMap[_name] = asset;
        assetIdMap[assetId] = asset;
        assets.push(asset);

        emit NewAsset(asset.id, asset.name, asset.active);
    }

    /**
     * @notice Used for activating the asset
     * @param _assetId Id for the underlying asset
     * @return name of the underlying asset
     * @return status of the underlying asset
     */
    function activateAsset(uint32 _assetId)
        external
        onlyOwner
        inactiveAsset(_assetId)
        returns (bytes32 name, bool status)
    {
        Asset storage asset = assetIdMap[_assetId];
        asset.active = true;
        status = asset.active;
        name = asset.name;

        emit AssetActivate(asset.id, asset.name);
    }

    /**
     * @notice Used for deactivating the asset
     * @param _assetId Id for the underlying asset
     * @return name of the underlying asset
     * @return status of the underlying asset
     */
    function deactivateAsset(uint32 _assetId)
        external
        onlyOwner
        validAsset(_assetId)
        returns (bytes32 name, bool status)
    {
        Asset storage asset = assetIdMap[_assetId];
        asset.active = false;
        status = asset.active;
        name = asset.name;
        emit AssetDeactivate(asset.id, asset.name);
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

    modifier validAsset(uint32 _underlying) {
        require(assetIdMap[_underlying].active == true, "Invalid Asset");
        _;
    }

    modifier inactiveAsset(uint32 _underlying) {
        require(assetIdMap[_underlying].active == false, "Asset is active");
        _;
    }

    function validStrike(
        uint256 _strike,
        uint256 _minPrice,
        uint256 _maxPrice
    ) private pure {
        require(_strike <= _maxPrice && _strike >= _minPrice, "Strike out of Range");
    }

    function validateOptionAmount(uint256 _value, uint256 _premium, uint256 _currentPrice) private pure {
        require(_value >= _premium.mul(1 ether).div(_currentPrice), "Premium is low");
    }

    function getCallOverColl(
        uint256 _cp,
        uint256 _iv,
        uint256 _decimal
    ) private pure returns (uint256 oc) {
        oc = _cp.add(_cp.mul(_iv).div(_decimal));
    }

    function getPutOverColl(
        uint256 _cp,
        uint256 _iv,
        uint256 _decimal
    ) private pure returns (uint256 oc) {
        oc = (_cp.mul(_iv).div(_decimal)).sub(_cp);
    }

    function getCurrentPrice(Asset memory _asset) private view returns (uint256 currentPrice) {
        currentPrice = oracle.getUnderlyingPrice(_asset.id, strikeAsset.id);
    }

    function getAssetStrikePriceRange(
        uint256 _cp,
        uint256 _iv,
        uint256 _strike
    ) private pure returns (uint256 minAssetPrice, uint256 maxAssetPrice) {
        minAssetPrice = getPutOverColl(_cp, _iv, PERCENTAGE_PRECISION);
        maxAssetPrice = getCallOverColl(_cp, _iv, PERCENTAGE_PRECISION);
        validStrike(_strike, minAssetPrice, maxAssetPrice);
    }

    function setSettlementFeePerc(uint256 _feePerc) external onlyOwner {
        require(_feePerc >= 1 && _feePerc <= 10, "Invalid settlement fee");
        settlementFeePerc = _feePerc;
    }

    function buy(
        uint32 _underlying,
        uint256 _expiration,
        uint256 _amount,
        uint256 _strike,
        OptionType _optionType
    )
        external
        payable
        override
        validOptionType(_optionType)
        validExpiration(_expiration)
        validAsset(_underlying)
        returns (uint256 optionId)
    {
        optionId = createOption(_strike, _amount, _expiration, _underlying, _optionType);
    }

    function createOption(
        uint256 _strike,
        uint256 _amount,
        uint256 _expiration,
        uint32 _underlying,
        OptionType _optionType
    ) private returns (uint256 optionId) {
        (uint256 optionPremium, uint256 settlementFee, uint256 cp, uint256 iv) =
            getPremium(_underlying, _expiration, _amount, _strike, _optionType);
        validateOptionAmount(msg.value, optionPremium.add(settlementFee), cp);

        (uint256 minStrikePrice, uint256 maxStrikePrice) = getAssetStrikePriceRange(cp, iv, _strike);
        maxStrikePrice = maxStrikePrice.min(cp.add(cp));

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
                _underlying,
                _optionType
            );

        options.push(option);
        pool.lockLiquidity(optionId, option.lockedAmount, option.premium);
        emit Buy(optionId, msg.sender, settlementFee, optionPremium.add(settlementFee), option.assetId);
    }

    /**
     * @notice Used for getting the actual options prices
     * @param _expiration Option period in unix timestamp
     * @param _amount Option amount
     * @param _strike Strike price of the option
     * @return optionPremium Premium to be paid
     * @return settlementFee Settlement Fee
     */
    function getPremium(
        uint32 _underlying,
        uint256 _expiration,
        uint256 _amount,
        uint256 _strike,
        OptionType _optionType
    )
        public
        view
        validOptionType(_optionType)
        validExpiration(_expiration)
        validAsset(_underlying)
        returns (
            uint256 optionPremium,
            uint256 settlementFee,
            uint256 cp,
            uint256 iv
        )
    {
        (iv, ) = volatility.calculateIv(_underlying, _optionType, _expiration, _amount, _strike);

        (optionPremium, cp) = getPremiumBlackScholes(_underlying, _expiration, _strike, _optionType, iv, _amount);

        settlementFee = getSettlementFee(optionPremium);
    }

    function getPremiumBlackScholes(
        uint32 _underlying,
        uint256 _expiration,
        uint256 _strike,
        OptionType _optionType,
        uint256 iv,
        uint256 _amount
    ) private view returns (uint256 optionPremium, uint256 cp) {
        Asset memory asset = assetIdMap[_underlying];
        cp = getCurrentPrice(asset);
        optionPremium = BlackScholes.getOptionPrice(
            _optionType == OptionType.Call ? true : false,
            _strike,
            cp,
            PERCENTAGE_PRECISION,
            _expiration,
            iv,
            0,
            0,
            PERCENTAGE_PRECISION
        );
        optionPremium = optionPremium.mul(_amount).div(1e18);
    }

    function getSettlementFee(uint256 _amount) private view returns (uint256 settlementFee) {
        settlementFee = _amount.mul(settlementFeePerc).div(100);
    }

    /**
     * @notice Used for exercising an option that is not expired
     * @param _optionId Option id
     */
    function exercise(uint256 _optionId) external override {
        Option storage option = options[_optionId];
        require(option.expiration >= block.timestamp, "Option has expired");
        require(option.holder == msg.sender, "Wrong msg.sender");
        require(option.state == State.Active, "Wrong state");
        option.state = State.Exercised;
        uint256 profit = payProfit(_optionId, ExcerciseType.Cash, option.holder);
        emit Exercise(_optionId, profit, ExcerciseType.Cash);
    }

    function excerciseUA(uint256 _optionId, address payable _uaAddress) external override {
        Option storage option = options[_optionId];

        require(option.expiration >= block.timestamp, "Option has expired");
        require(option.holder == msg.sender, "Wrong msg.sender");
        require(option.state == State.Active, "Wrong state");

        option.state = State.Exercised;
        uint256 profit = payProfit(_optionId, ExcerciseType.Physical, _uaAddress);

        emit Exercise(_optionId, profit, ExcerciseType.Physical);
    }

    /**
     * @notice Sends profits in USD from the USD pool to an option holder's address
     * @param _optionId ID of the option
     * @param _type Excercise Type e.g: Cash or Physical
     * @param _address address of the option holder
     */
    function payProfit(
        uint256 _optionId,
        ExcerciseType _type,
        address payable _address
    ) internal returns (uint256 profit) {
        Option memory option = options[_optionId];
        uint256 _cp = getCurrentPrice(assetIdMap[option.assetId]);
        if (option.optionType == OptionType.Call) {
            require(option.strike <= _cp, "Call option: Current price is too low");
            profit = _cp.sub(option.strike).mul(option.amount);
        } else {
            require(option.strike >= _cp, "Put option: Current price is too high");
            profit = option.strike.sub(_cp).mul(option.amount);
        }
        profit = profit.div(1 ether);
        if (profit > option.lockedAmount) profit = option.lockedAmount;
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
     * @notice Distribute Premium for the LPs
     * @param _date Date of the premium to be distributed
     * @param _lps list of active liquidity providers
     */
    function distributePremium(uint256 _date, address[] calldata _lps) external {
        pool.distributePremium(_date, _lps);
    }
    /**
     * @notice update premium eligibility for the LPs
     * @param _date Date of the premium to be distributed
     */
    function updatePremiumEligibility(uint256 _date) external {
        pool.updatePremiumEligibility(_date);
    }

    /**
     * @notice Withdraw collected Premium
     */
    function withdrawPremium() external {
        pool.sendEligiblePremium(msg.sender);
    }
}
