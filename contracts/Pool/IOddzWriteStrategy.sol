pragma solidity 0.8.3;

import "./IOddzLiquidityPoolManager.sol";

interface IOddzWriteStrategy {
    struct Strategy {
        IOddzLiquidityPool[] _pools;
        uint256[] _shares;
    }

    enum TransactionType { ADD, REMOVE }

    function addLiquidity(address _provider, uint256 _amount) external;

    function removeLiquidity(address _provider, uint256 _amount) external;

    event AddedLiquidity(address indexed _provider, uint256 _amount);

    event RemovedLiquidity(address indexed _provider, uint256 _amount);
}
