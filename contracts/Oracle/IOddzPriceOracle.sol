// SPDX-License-Identifier: BSD-4-Clause
pragma solidity ^0.7.0;

/**
 * @title Oddz Price Oracle
 * @notice Oddz price oracle contract
 */
interface IOddzPriceOracle {
    /**
     * @notice Function to get the price for an underlying asset
     * @param _asset Underlying Asset
     * @param _strikeAsset Strike Asset
     * @return uint256 the price in 1e8
     */
    function getUnderlyingPrice(uint32 _asset, uint32 _strikeAsset) external view returns (uint256);
}
