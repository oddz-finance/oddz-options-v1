// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "@openzeppelin/contracts/access/Ownable.sol";
interface IOddzStaking {

    enum DepositType { Settlement, Transaction, Others }

    struct Token{
        bytes32 _name;
        address _address;
        address _stakingContract;
        uint256 _rewardRate;
        uint256 _txnFeeReward;
        uint256 _settlementFeeReward;
        uint256 _lockupDuration;
        uint256 _lastDistributed;
        bool _active;
    }

    

    struct StakerDetails{
        address _staker;
        uint256 _balance;
        uint256 _lastStakedAt;
        uint256 _rewards;
    }

    event LpTokenAdded(address indexed _address, uint256 _rewardRate, uint256 _lockupDuration, uint256 _timestamp);
    event LpTokenDeactivate(address indexed _address, uint256 _timestamp);
    event Deposit(uint256 indexed _time, uint256 _amount, DepositType _type);
    event Claim(address indexed _staker, uint256 _amount);
    event Stake(address indexed _staker, uint256 indexed _amount, uint256 _time);
    event Distribute(uint256 _amount, uint256 _time);

    function withdraw(address _token, uint256 _amount) external returns (uint256 _profit);

    function distributeRewards(address _token, address[] memory _stakers) external;

    function stake(address _token, uint256 _amount) external;

    function deposit(uint256 _amount, DepositType _depositType) external;
}
