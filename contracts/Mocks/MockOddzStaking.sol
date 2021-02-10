// SPDX-License-Identifier: BSD-4-Clause
pragma solidity ^0.7.0;

import "../Staking/IOddzStaking.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

contract MockOddzStaking is IOddzStaking {
    using SafeMath for uint256;

    function redeemProfit() external override returns (uint256 _profit) {}

    function profitInfo(address _staker) external view override returns (uint256) {}

    function deposit(uint256 _amount, DepositType _type) external override {}
}
