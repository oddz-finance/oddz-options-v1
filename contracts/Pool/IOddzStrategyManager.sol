// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "./IOddzLiquidityPoolManager.sol";
import "./IOddzWriteStrategy.sol";

interface IOddzStrategyManager {
    event CreatedStrategy(address indexed _strategy, address indexed _user);
    event ChangedStrategy(address indexed _old, address indexed _new, address indexed _user);
    event AddedLiquidity(address indexed _strategy, address indexed _provider, uint256 _amount);
    event RemovedLiquidity(address indexed _strategy, address indexed _provider, uint256 _amount);

    /**
     * @notice Create Strategy
     * @param _pools Pools in the strategy
     * @param _percentageShares Percentage shares of pools
     * @param _amount Amount to deposit in strategy
     */
    function createStrategy(
        IOddzLiquidityPool[] memory _pools,
        uint256[] memory _percentageShares,
        uint256 _amount
    ) external;

    /**
     * @notice Change Strategy
     * @param _old Strategy to change from
     * @param _new Stratrgy to change to
     */
    function changeStrategy(IOddzWriteStrategy _old, IOddzWriteStrategy _new) external;

    /**
     * @notice Add Liquidity to Strategy
     * @param _strategy Address of the strategy
     * @param _amount Amount to deposit in strategy
     */
    function addLiquidity(IOddzWriteStrategy _strategy, uint256 _amount) external;

    /**
     * @notice Remove Liquidity from Strategy
     * @param _strategy Address of the strategy
     * @param _amount Amount to withdraw from strategy
     */
    function removeLiquidity(IOddzWriteStrategy _strategy, uint256 _amount) external;
}
