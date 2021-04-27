// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

interface IOddzStaking {

    enum DepositType { Settlement, Transaction, Others }

    struct NativeToken{
        address _address;
        uint256 _rewardRate;
        uint256 _txnFeeReward;
        uint256 _settlementFeeReward;
        uint256 _lockupDuration;
        uint256 _lastDistributed;
        bool _active;
    }

    struct LpToken{
        address _address;
        uint256 _rewardRate;
        uint256 _tokenReward;
        uint256 _lockupDuration;
        uint256 _lastDistributed;
        bool _active;
    }

    struct Staker{
        address _staker;
        uint256 _lastStakedOddzAt;
        uint256 _lastStakedOusdAt;
        uint256 _lastStakedLpTokenAt;
    }

    event LpTokenAdded(address indexed _address, uint256 _rewardRate, uint256 _lockupDuration, uint256 _timestamp);
    event LpTokenDeactivate(address indexed _address, uint256 _timestamp);
    event Deposit(uint256 indexed _time, uint256 _amount, DepositType _type);
    event Claim(address indexed _staker, uint256 _amount);
    event Stake(address indexed _staker, uint256 indexed _amount, uint256 _time);
    event Distribute(uint256 _amount, uint256 _time);

    function withdraw(uint256 _amount) external returns (uint256 _profit);

    function distributeReward(uint256 _amount) external;

    function stake(uint256 _amount) external;
}
