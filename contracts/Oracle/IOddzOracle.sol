// SPDX-License-Identifier: BSD-4-Clause
pragma solidity ^0.7.0;

interface IOddzOracle {
    /**
      * @dev Function to get the price for an asset
      * @param asset Asset
      * @return uint256 the price in 1e8
    */
    function getPrice(address asset) external view returns (uint256);
    /**
      * @dev Function to get the price for an underlying asset
      * @param cToken Underlying Asset
      * @return uint256 the price in 1e8
    */
    function getUnderlyingPrice(uint cToken) external view returns (uint256);
}
