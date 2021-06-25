pragma solidity 0.8.3;

import "./IOddzLiquidityPoolManager.sol";

interface IOddzStrategyManager {
    enum ManageStrategy { ACTIVATE, DEACTIVATE }
    event CreatedStrategy(address indexed _strategy, address indexed _user);
    event ChangedStrategy(address indexed _old, address indexed _new, address indexed _user);
    event AddedLiquidity(address indexed _strategy, address indexed _provider, uint256 _amount);
    event RemovedLiquidity(address indexed _strategy, address indexed _provider, uint256 _amount);

    function createStrategy(
        IOddzLiquidityPool[] memory _pools,
        uint256[] memory _shares,
        uint256 _amount
    ) external returns (address strategy);

    function changeStrategy(address _old, address _new) external;
}
