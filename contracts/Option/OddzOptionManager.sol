// SPDX-License-Identifier: BSD-4-Clause
pragma solidity ^0.7.0;

import "./IOddzOption.sol";
import "../Oracle/IOddzPriceOracle.sol";
import "../Oracle/IOddzVolatility.sol";
import "./OddzAssetManager.sol";
import "../Pool/OddzLiquidityPool.sol";
import "../Libs/BlackScholes.sol";
import "hardhat/console.sol";

contract OddzOptionManager is IOddzOption, OddzAssetManager {
    using SafeMath for uint256;

    OddzLiquidityPool public pool;
    IOddzPriceOracle public oracle;
    IOddzVolatility public volatility;
    Option[] public options;
    uint256 public createdAt;
    uint256 public maxExpiry = 30 days;
    uint256 public minExpiry = 1 days;

    /**
     * @dev The percentage precision. (100000 = 100%)
     */
    uint256 internal constant PERCENTAGE_PRECISION = 100000;

    constructor(
        IOddzPriceOracle _oracle,
        IOddzVolatility _iv,
        OddzLiquidityPool _pool
    ) {
        pool = _pool;
        oracle = _oracle;
        volatility = _iv;
        createdAt = block.timestamp;
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

    function validStrike(
        uint256 _strike,
        uint256 _minPrice,
        uint256 _maxPrice
    ) private pure {
        require(_strike <= _maxPrice && _strike >= _minPrice, "Strike out of Range");
    }

    function validateOptionAmount(uint256 _amount, uint256 premium) private pure {
        require(_amount >= premium, "Premium is low");
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
        oc = _cp.sub(_cp.mul(_iv).div(_decimal));
    }

    function getCurrentPrice(Asset memory _asset) private view returns (uint256 currentPrice) {
        currentPrice = oracle.getUnderlyingPrice(_asset.id, strikeAsset.id);
    }

    function getAssetStrikePriceRange(
        uint256 _cp,
        uint256 _iv,
        uint32 _underlying,
        uint256 _strike
    ) private view returns (uint256 minAssetPrice, uint256 maxAssetPrice) {
        maxAssetPrice = getCallOverColl(_cp, _iv, assetIdMap[_underlying].precision);
        minAssetPrice = getPutOverColl(_cp, _iv, assetIdMap[_underlying].precision);
        validStrike(_strike, maxAssetPrice, minAssetPrice);
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
        validateOptionAmount(_amount, optionPremium.add(settlementFee));

        (uint256 minStrikePrice, uint256 maxStrikePrice) = getAssetStrikePriceRange(cp, iv, _underlying, _strike);

        optionId = options.length;
        Option memory option =
            Option(
                State.Active,
                msg.sender,
                _strike,
                _amount,
                _optionType == OptionType.Call ? maxStrikePrice : minStrikePrice,
                optionPremium,
                _expiration + block.timestamp,
                _underlying,
                _optionType
            );

        options.push(option);

        // pool.lock {value: option.premium} (optionId, option.lockedAmount);

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
        validAsset(_underlying)
        returns (
            uint256 optionPremium,
            uint256 settlementFee,
            uint256 cp,
            uint256 iv
        )
    {
        (iv, ) = volatility.calculateIv(_underlying, _optionType, _expiration, _amount, _strike);

        (optionPremium, cp) = getPremiumBlackScholes(_underlying, _expiration, _strike, _optionType, iv);

        settlementFee = getSettlementFee(_amount);
    }

    function getPremiumBlackScholes(
        uint32 _underlying,
        uint256 _expiration,
        uint256 _strike,
        OptionType _optionType,
        uint256 iv
    ) private view returns (uint256 optionPremium, uint256 cp) {
        Asset memory asset = assetIdMap[_underlying];
        cp = getCurrentPrice(asset);
        optionPremium = BlackScholes.getOptionPrice(
            _optionType == OptionType.Call ? true : false,
            _strike,
            cp,
            asset.precision,
            _expiration,
            iv,
            0,
            0,
            asset.precision
        );
    }

    function getSettlementFee(uint256 _amount) private pure returns (uint256 settlementFee) {
        settlementFee = _amount.div(100);
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
        // uint256 profit = payProfit(_optionId, ExcerciseType.Cash, option.holder);

        emit Exercise(_optionId, 100, ExcerciseType.Cash);
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
            require(option.strike <= _cp, "Current price is too low");
            profit = _cp.sub(option.strike).mul(option.amount);
        } else {
            require(option.strike >= _cp, "Current price is too high");
            profit = option.strike.sub(_cp).mul(option.amount);
        }
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
        pool.unlock(_optionId);
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
}
