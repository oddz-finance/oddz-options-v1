// SPDX-License-Identifier: BSD-4-Clause
pragma solidity ^0.7.0;


interface ILiquidityPool {
    struct LockedLiquidity { uint amount; uint premium; bool locked; }

    event Profit(uint indexed _id, uint _amount);
    event Loss(uint indexed _id, uint _amount);
    event Provide(address indexed _account, uint256 _amount, uint256 _writeAmount);
    event Withdraw(address indexed _account, uint256 _amount, uint256 _writeAmount);

    function provide() external payable returns (uint256 mint);
    function withdraw(uint256 _amount) external returns (uint256 burn);
    function lock(uint256 _id, uint256 _amount) external;
    function unlock(uint256 _id) external;
    function send(uint256 _id, address payable _account, uint256 _amount) external;
    function availableBalance() external view returns (uint256 amount);
    function totalBalance() external view returns (uint256 amount);
}