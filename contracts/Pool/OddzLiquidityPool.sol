// SPDX-License-Identifier: BSD-4-Clause
pragma solidity ^0.7.0;

import "./IOddzLiquidityPool.sol";

contract OddzLiquidityPool is Ownable, IOddzLiquidityPool, ERC20("Oddz USD LP token", "oUSD") {
    function provide() external payable override returns (uint256 mint) {}

    function withdraw(uint256 _amount) external override returns (uint256 burn) {}

    function lock(uint256 _id, uint256 _amount) external payable override onlyOwner {}

    function unlock(uint256 _id) external override onlyOwner {}

    function send(
        uint256 _id,
        address payable _account,
        uint256 _amount
    ) external override onlyOwner {}

    function sendUA(
        uint256 _id,
        address payable _account,
        uint256 _amount
    ) external onlyOwner {}

    function availableBalance() public view override returns (uint256 balance) {}

    function totalBalance() public view override returns (uint256 balance) {}
}
