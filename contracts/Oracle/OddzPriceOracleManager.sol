// SPDX-License-Identifier: BSD-4-Clause
pragma solidity ^0.7.0;

import "./IOddzPriceOracle.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";

contract OddzPriceOracleManager is Ownable {
    using Address for address;

    struct AggregatorData {
        bytes32 _underlying;
        bytes32 _strikeAsset;
        IOddzPriceOracle _aggregator;
    }

    /**
     * @dev The Oracle aggregators data. (underlying => strikeAsset => AggregatorData)
     */
    mapping(bytes32 => mapping(bytes32 => AggregatorData[])) public aggregators;
    mapping(bytes32 => mapping(bytes32 => IOddzPriceOracle)) public activeAggregator;
    mapping(bytes32 => AggregatorData) public aggregatorMap;

    /**
     * @dev Emitted when the new Oracle aggregator data has been added.
     * @param _underlying Address of the underlying asset.
     * @param _strikeAsset Address of the strike asset.
     * @param _aggregator Address of the Oracle aggregator.
     */
    event NewAggregator(bytes32 indexed _underlying, bytes32 indexed _strikeAsset, IOddzPriceOracle _aggregator);

    /**
     * @dev Emitted when the Oracle aggregator data has been changed.
     * @param _underlying Address of the underlying asset.
     * @param _strikeAsset Address of the strike asset.
     * @param _previousAggregator Address of the previous aggregator.
     * @param _newAggregator Address of the new aggregator.
     */
    event SetAggregator(
        bytes32 indexed _underlying,
        bytes32 indexed _strikeAsset,
        IOddzPriceOracle _previousAggregator,
        IOddzPriceOracle _newAggregator
    );

    /**
     * @notice Function to add the the Oracle aggregator data.
     * @param _underlying Id of the underlying.
     * @param _strikeAsset Id of the strike asset.
     * @param _aggregator Address of the oddz aggregator.
     * @param _aggregatorPriceContract Address of the price oracle aggregator
     */
    function addAggregator(
        bytes32 _underlying,
        bytes32 _strikeAsset,
        IOddzPriceOracle _aggregator,
        address _aggregatorPriceContract
    ) public onlyOwner returns (bytes32 agHash) {
        require(_underlying != _strikeAsset, "Invalid assets");
        require(address(_aggregator).isContract(), "Invalid aggregator");

        AggregatorData memory data = AggregatorData(_underlying, _strikeAsset, _aggregator);

        agHash = keccak256(abi.encodePacked(_underlying, _strikeAsset, _aggregator));
        aggregatorMap[agHash] = data;

        aggregators[_underlying][_strikeAsset].push(data);

        _aggregator.setPairContract(_underlying, _strikeAsset, _aggregatorPriceContract);

        emit NewAggregator(_underlying, _strikeAsset, _aggregator);
    }

    /**
     * @notice Function to add the the Oracle aggregator data.
     * @param _agHash hash of the underlying, strike asset and oddz aggregator.
     */
    function setActiveAggregator(bytes32 _agHash) public onlyOwner {
        AggregatorData storage data = aggregatorMap[_agHash];
        require(address(data._aggregator) != address(0), "Invalid assets");

        IOddzPriceOracle oldAg = activeAggregator[data._underlying][data._strikeAsset];
        activeAggregator[data._underlying][data._strikeAsset] = data._aggregator;

        emit SetAggregator(data._underlying, data._strikeAsset, oldAg, data._aggregator);
    }

    function getUnderlyingPrice(bytes32 _underlying, bytes32 _strikeAsset)
        public
        view
        returns (uint256 price, uint8 decimal)
    {
        IOddzPriceOracle aggregator = activeAggregator[_underlying][_strikeAsset];
        require(address(aggregator) != address(0), "Invalid assets");

        (price, decimal) = aggregator.getPrice(_underlying, _strikeAsset);
    }
}
