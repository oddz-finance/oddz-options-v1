// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "./IOddzLiquidityPoolManager.sol";
import "./OddzWriteStrategy.sol";

interface IOddzStrategyManager {
    event CreatedStrategy(address indexed _strategy, address indexed _user);
    event ChangedStrategy(address indexed _old, address indexed _new, address indexed _user);
    event AddedLiquidity(address indexed _strategy, address indexed _provider, uint256 _amount);
    event RemovedLiquidity(address indexed _strategy, address indexed _provider, uint256 _amount);

    function createStrategy(
        IOddzLiquidityPool[] memory _pools,
        uint256[] memory _percentageShares,
        uint256 _amount
    ) external;

    function changeStrategy(IOddzWriteStrategy _old, IOddzWriteStrategy _new) external;

    function addLiquidity(IOddzWriteStrategy _strategy, uint256 _amount) external;

    function removeLiquidity(IOddzWriteStrategy _strategy, uint256 _amount) external;
}
