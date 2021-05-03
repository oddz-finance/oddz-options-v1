// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "@openzeppelin/contracts/access/AccessControl.sol";
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

    event TokenAdded(
                address indexed _address, 
                bytes32 indexed _name, 
                uint256 _rewardRate, 
                uint256 _lockupDuration, 
                uint256 _timestamp);
    event TokenDeactivate(address indexed _address, bytes32 indexed _name, uint256 _timestamp);
    event TokenActivate(address indexed _address, bytes32 indexed _name, uint256 _timestamp);
    event Deposit(uint256 indexed _time, DepositType indexed _type, uint256 _amount );
    event Claim(address indexed _staker, address indexed _token, uint256 _amount);
    event Stake(address indexed _staker, address indexed _token, uint256 indexed _amount, uint256 _time);
    event DistributeReward(address indexed _staker, address indexed _token, uint256 _reward, uint256 _time);
    event TransferReward(address indexed _staker, address indexed _token, uint256 _amount, uint256 _time);

    function withdraw(address _token, uint256 _amount) external returns (uint256 _profit);

    function distributeRewards(address _token, address[] memory _stakers) external;

    function stake(address _token, uint256 _amount) external;

    function deposit(uint256 _amount, DepositType _depositType) external;
}
