// SPDX-License-Identifier: BSD-4-Clause
pragma solidity ^0.7.0;


interface ILiquidityPool {
    struct LockedLiquidity { uint amount; uint premium; bool locked; }

    function unlock(uint256 id) external;
    function send(uint256 id, address payable account, uint256 amount) external;
    function totalBalance() external view returns (uint256 amount);
}