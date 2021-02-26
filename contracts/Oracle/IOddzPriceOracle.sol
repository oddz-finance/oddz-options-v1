// SPDX-License-Identifier: BSD-4-Clause
pragma solidity ^0.7.0;

/**
 * @title Oddz Price Oracle
 * @notice Oddz price oracle contract
 */
interface IOddzPriceOracle {
    /**
     * @dev Emitted when the new Oracle aggregator data has been added.
     * @param _underlying Address of the underlying asset.
     * @param _strikeAsset Address of the strike asset.
     * @param _aggregator Address of the aggregator.
     */
    event AddAssetPairAggregator(
        bytes32 indexed _underlying,
        bytes32 indexed _strikeAsset,
        address _oddzAggregator,
        address _aggregator
    );

    /**
     * @notice Function to get the price for an underlying asset
     * @param _asset Underlying Asset
     * @param _strikeAsset Strike Asset
     * @return price asset price
     * @return decimals asset price decimals
     */
    function getPrice(bytes32 _asset, bytes32 _strikeAsset) external view returns (uint256 price, uint8 decimals);

    /**
     * @notice Function to add the price for an underlying, strike asset pair
     * @param _asset Underlying Asset
     * @param _strikeAsset Strike Asset
     * @param _aggregator Address of the aggregator.
     */
    function setPairContract(
        bytes32 _asset,
        bytes32 _strikeAsset,
        address _aggregator
    ) external;
}
