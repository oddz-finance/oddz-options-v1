// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "../Staking/IOddzStaking.sol";

contract MockOddzStaking is IOddzStaking {
    function redeemProfit() external override returns (uint256 _profit) {}

    function profitInfo(address _staker) external view override returns (uint256) {}

    function deposit(uint256 _amount, DepositType _type) external override {}
}
