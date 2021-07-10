pragma solidity 0.8.3;

import "./IOddzLiquidityPoolManager.sol";
import "./OddzWriteStrategy.sol";

interface IOddzStrategyManager {
    event CreatedStrategy(address indexed _strategy, address indexed _user);
    event ChangedStrategy(address indexed _old, address indexed _new, address indexed _user);

    function createStrategy(
        IOddzLiquidityPool[] memory _pools,
        uint256[] memory _percentageShares,
        uint256[] memory _shares,
        uint256 _amount
    ) external;

    function changeStrategy(
        IOddzWriteStrategy _old,
        IOddzWriteStrategy _new
    ) external;
}
