// SPDX-License-Identifier: BSD-4-Clause
pragma solidity ^0.7.0;

import "./IOddzLiquidityPool.sol";

contract OddzLiquidityPool is Ownable, IOddzLiquidityPool, ERC20("Oddz USD LP token", "oUSD") {
    function provide() external override payable returns (uint256 mint) {

    }
    function withdraw(uint256 _amount) external override returns (uint256 burn) {

    }
    function lock(uint256 _id, uint256 _amount) external onlyOwner override payable{

    }
    function unlock(uint256 _id) external onlyOwner override {

    }
    function send(uint256 _id, address payable _account, uint256 _amount) external onlyOwner override {

    }
    function sendUA(uint256 _id, address payable _account, uint256 _amount) external onlyOwner {

    }
    function availableBalance() public override view returns (uint256 balance) {

    }
    function totalBalance() public override view returns (uint256 balance) {

    }
}