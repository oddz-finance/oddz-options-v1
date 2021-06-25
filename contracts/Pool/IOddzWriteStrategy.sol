pragma solidity 0.8.3;

import "./IOddzLiquidityPool.sol";

interface IOddzWriteStrategy {
    enum TransactionType { ADD, REMOVE }

    function updateLiquidity(
        address _provider,
        uint256 _amount,
        TransactionType _transactionType
    ) external;

    function getPools() external returns (IOddzLiquidityPool[] memory);

    function getShares() external returns (uint256[] memory);
}
