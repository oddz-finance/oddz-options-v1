pragma solidity 0.8.3;

import "./IOddzLiquidityPool.sol";

interface IOddzWriteStrategy {
    function getPools() external view returns (IOddzLiquidityPool[] memory);

    function getShares() external view returns (uint256[] memory);
}
