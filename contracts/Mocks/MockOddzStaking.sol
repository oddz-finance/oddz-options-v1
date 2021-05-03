// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "../Staking/IOddzStaking.sol";

contract MockOddzStaking is IOddzStaking {
    function withdraw(address _token, uint256 _amount) external override {}

    function distributeRewards(address _token, address[] memory _stakers) external override {}

    function stake(address _token, uint256 _amount) external override {}

    function deposit(uint256 _amount, DepositType _depositType) external override {}
}
