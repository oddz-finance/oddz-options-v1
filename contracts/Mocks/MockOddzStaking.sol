// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "../Staking/IOddzStaking.sol";

contract MockOddzStaking is IOddzStaking {
    function withdraw(address _token, uint256 _amount) override external returns (uint256 _profit){}

    function distributeRewards(address _token, address[] memory _stakers) override external{}

    function stake(address _token, uint256 _amount) override external{}
    function deposit(uint256 _amount, DepositType _depositType) override external {}
}
