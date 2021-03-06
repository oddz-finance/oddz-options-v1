// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Implied volatility caculation for Oddz options
 * @notice Oddz options IV
 */
interface IOddzVolatilityOracle {
    /**
     * @dev Emitted when the new Oracle aggregator data has been added.
     * @param _underlying Address of the underlying asset.
     * @param _strike Address of the strike asset.
     * @param _oddzAggregator Address of the oddz aggregator.
     * @param _aggregator Address of the IV aggregator.
     * @param _aggregatorPeriod IV period (e.g. 1 day IV, 2 day IV, 14 day IV)
     */
    event AddAssetPairIVAggregator(
        bytes32 indexed _underlying,
        bytes32 indexed _strike,
        address _oddzAggregator,
        address _aggregator,
        uint8 _aggregatorPeriod
    );

    /**
     * @notice Function to get the Implied volatility of the underlying asset
     * @param _underlying underlying asset
     * @param _strike strike asset
     * @param _expiration expiration time in unix timestamp
     * @param _currentPrice current price of underlying asset
     * @param _strikePrice strike price of the option
     * @return iv implied volatility for the underlying asset
     * @return decimals implied volatility decimals
     */
    function getIv(
        bytes32 _underlying,
        bytes32 _strike,
        uint256 _expiration,
        uint256 _currentPrice,
        uint256 _strikePrice
    ) external view returns (uint256 iv, uint8 decimals);

    /**
     * @notice Function to add the price for an underlying, strike asset pair
     * @param _underlying Underlying Asset
     * @param _strike Strike Asset
     * @param _aggregator Address of the aggregator.
     * @param _aggregatorPeriod IV period (e.g. 1 day IV, 2 day IV, 14 day IV)
     */
    function setPairContract(
        bytes32 _underlying,
        bytes32 _strike,
        address _aggregator,
        uint8 _aggregatorPeriod
    ) external;
}
