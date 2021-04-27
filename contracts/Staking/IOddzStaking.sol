// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

interface IOddzStaking {

    struct token{
        address _address;
        uint256 _rewardRate;
        bool _active;
    }

    event Claim(address indexed _staker, uint256 _amount);
    event Deposit(address indexed _staker, uint256 indexed _amount, uint256 _time);
    event Distribute(uint256 _amount, uint256 _time);

    function withdraw(uint256 _amount) external returns (uint256 _profit);

    function distributeReward(uint256 _amount) external;

    function deposit(uint256 _amount) external;
}
