// SPDX-License-Identifier: BSD-4-Clause
pragma solidity ^0.7.0;

import "../Pool/IOddzLiquidityPool.sol";

contract MockOddzLiquidityPool is Ownable, IOddzLiquidityPool, ERC20("Oddz USD LP token", "MockoUSD") {
    function addLiquidity() external payable override returns (uint256 mint) {}

    function removeLiquidity(uint256 _amount) external override returns (uint256 burn) {}

    function lockLiquidity(uint256 _id, uint256 _amount, uint256 _premium) external override onlyOwner {}

    function unlockLiquidity(uint256 _id) external override onlyOwner {}

    function send(
        uint256 _id,
        address payable _account,
        uint256 _amount
    ) external override onlyOwner {}

    function availableBalance() public view override returns (uint256 balance) {}

    function totalBalance() public view override returns (uint256 balance) {}
}
