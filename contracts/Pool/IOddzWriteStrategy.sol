// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "./IOddzLiquidityPool.sol";

interface IOddzWriteStrategy {
    /**
     * @notice Get pools in strategy
     */
    function getPools() external view returns (IOddzLiquidityPool[] memory);

    /**
     * @notice Get shares of pools in strategy
     */
    function getShares() external view returns (uint256[] memory);

    /**
     * @notice Get user liquidity in strategy
     * @param _provider Address of provider
     */
    function userLiquidity(address _provider) external view returns (uint256);

    /**
     * @notice Add Liquidity to Strategy
     * @param _provider Address of provider
     * @param _liquidity Amount to deposit in strategy
     */
    function addLiquidity(address _provider, uint256 _liquidity) external;

    /**
     * @notice Remove Liquidity from Strategy
     * @param _provider Address of provider
     * @param _liquidity Amount to remove from strategy
     */
    function removeLiquidity(address _provider, uint256 _liquidity) external;
}
