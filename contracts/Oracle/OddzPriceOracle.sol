// SPDX-License-Identifier: BSD-4-Clause
pragma solidity ^0.7.0;

import "./IOddzPriceOracle.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@chainlink/contracts/src/v0.7/interfaces/AggregatorV3Interface.sol";

contract OddzPriceOracle is IOddzPriceOracle, Ownable {
    using Address for address;
    using SafeMath for uint256;

    /**
     * @dev The percentage precision. (100000 = 100%)
     */
    uint256 internal constant PERCENTAGE_PRECISION = 100000;

    /**
     * @dev Struct to store the Oracle aggregator data.
     */
    struct AggregatorData {
        address aggregator;
        uint256 precision;
    }

    /**
     * @dev The Oracle aggregators data. (underlying => strikeAsset => AggregatorData)
     */
    mapping(uint32 => mapping(uint32 => AggregatorData)) public aggregators;

    /**
     * @dev The asset precision. (6 decimals = 1000000)
     */
    mapping(uint32 => uint256) public assetPrecision;

    /**
     * @dev Emitted when the Oracle aggregator data has been changed.
     * @param _underlying Address of the underlying asset.
     * @param _strikeAsset Address of the strike asset.
     * @param _previousAggregator Address of the previous Oracle aggregator.
     * @param _newAggregator Address of the new Oracle aggregator.
     */
    event SetAggregator(
        uint32 indexed _underlying,
        uint32 indexed _strikeAsset,
        address _previousAggregator,
        address _newAggregator
    );

    /**
     * @notice Function to set the the Oracle aggregator data.
     * Only can be called by the admin.
     * @param _underlying Id of the underlying.
     * @param _strikeAsset Id of the strike asset.
     * @param _aggregator Address of the Oracle aggregator.
     */
    function setAgreggator(
        uint32 _underlying,
        uint32 _strikeAsset,
        address _aggregator
    ) public onlyOwner {
        require(_underlying != _strikeAsset, "Invalid assets");
        //require("<Validate Underlying>", "Invalid underlying");
        //require("<Validate strikeasset>", "Invalid underlying");
        require(_aggregator.isContract(), "Invalid aggregator");

        _setAssetPrecision(_underlying);
        _setAssetPrecision(_strikeAsset);

        uint256 aggregatorDecimals = uint256(AggregatorV3Interface(_aggregator).decimals());
        emit SetAggregator(_underlying, _strikeAsset, aggregators[_underlying][_strikeAsset].aggregator, _aggregator);
        aggregators[_underlying][_strikeAsset] = AggregatorData(_aggregator, (10**aggregatorDecimals));
    }

    /**
     * @notice Internal function to set the asset precision. (6 decimals = 1000000)
     * @param _asset Address of the asset.
     */
    function _setAssetPrecision(uint32 _asset) internal {
        if (assetPrecision[_asset] == 0) {
            uint256 decimals = _getAssetDecimals(_asset);
            assetPrecision[_asset] = (10**decimals);
        }
    }

    /**
     * @notice Internal function to the asset decimals.
     * @param _asset Address of the asset.
     * @return The asset decimals.
     */
    function _getAssetDecimals(uint32 _asset) internal view returns (uint256) {
        return uint256(18);
    }

    /**
     * @notice Internal function to get the underlying price on the Oracle aggregator.
     * @param _underlying Id of the underlying.
     * @param _strikeAsset Id of the strike asset.
     * @return The underlying price with the strike asset precision.
     */
    function _getAggregatorPrice(uint32 _underlying, uint32 _strikeAsset) internal view returns (uint256) {
        AggregatorData storage data = aggregators[_underlying][_strikeAsset];
        address _aggregator = data.aggregator;
        require(_aggregator != address(0), "No aggregator");

        (, int256 answer, , , ) = AggregatorV3Interface(_aggregator).latestRoundData();

        uint256 _aggregatorPrecision = data.precision;
        uint256 _assetPrecision = assetPrecision[_strikeAsset];

        if (_aggregatorPrecision > _assetPrecision) {
            return uint256(answer).div(_aggregatorPrecision.div(_assetPrecision));
        } else {
            return uint256(answer).mul(_assetPrecision).div(_aggregatorPrecision);
        }
    }

    function getUnderlyingPrice(uint32 _asset, uint32 _strikeAsset) public view override returns (uint256) {
        return _getAggregatorPrice(_asset, _strikeAsset);
    }
}
