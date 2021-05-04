// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";

/**
 * @title Oddz Staking
 * @notice Oddz Staking contract
 */
interface IOddzStaking {
    /**
     * @dev Deposit Type details
     */
    enum DepositType { Transaction, Settlement }

    /**
     * @dev Token
     * @param _name Name of the token
     * @param _address Address of the token
     * @param _stakingContract staking contract address for the token
     * @param _rewardFrequency Reward distribution frequency
     * @param _txnFeeReward Percentage txn fee reward
     * @param _settlementFeeReward Percentage settlement fee reward
     * @param _lockupDuration Lock up duration for the token withdrawal
     * @param _lastDistributed last distributeds date for the token
     */
    struct Token {
        bytes32 _name;
        address _address;
        address _stakingContract;
        uint256 _rewardFrequency;
        uint256 _txnFeeReward;
        uint256 _settlementFeeReward;
        uint256 _lockupDuration;
        uint256 _lastDistributed;
        bool _active;
    }

    /**
     * @dev Emitted when new token is added
     * @param _address Address of the token
     * @param _name Name of the token
     * @param _stakingContract Stacking contract address
     * @param _rewardFrequency Reward distribution frequency
     * @param _lockupDuration Lock up duration for the token withdrawal
     */
    event TokenAdded(
        address indexed _address,
        bytes32 indexed _name,
        address indexed _stakingContract,
        uint256 _rewardFrequency,
        uint256 _lockupDuration
    );

    /**
     * @dev Emitted when token is deactivated
     * @param _address Address of the token
     * @param _name Name of the token
     */
    event TokenDeactivate(address indexed _address, bytes32 indexed _name);

    /**
     * @dev Emitted when token is activated
     * @param _address Address of the token
     * @param _name Name of the token
     */
    event TokenActivate(address indexed _address, bytes32 indexed _name);

    /**
     * @dev Emitted when txn fee and settlement fee is deposited
     * @param _sender Address of the depositor
     * @param _type  DepositType (Transaction or Settlement)
     * @param _amount Amount deposited
     */
    event Deposit(address indexed _sender, DepositType indexed _type, uint256 _amount);

    /**
     * @dev Emitted when rewards are claimed
     * @param _staker Address of the staker
     * @param _token  Address of the token staked
     * @param _amount Amount rewarded
     */
    event Claim(address indexed _staker, address indexed _token, uint256 _amount);

    /**
     * @dev Emitted when tokens are staked
     * @param _staker Address of the staker
     * @param _token  Address of the token staked
     * @param _amount Amount staked
     */
    event Stake(address indexed _staker, address indexed _token, uint256 _amount);

    /**
     * @dev Emitted when tokens are withdrawn
     * @param _staker Address of the staker
     * @param _token  Address of the token staked
     * @param _amount Amount withdrawn
     */
    event Withdraw(address indexed _staker, address indexed _token, uint256 _amount);

    /**
     * @dev Emitted when rewards are distributed
     * @param _staker Address of the staker
     * @param _token  Address of the token staked
     * @param _reward Rewards distributed
     */
    event DistributeReward(address indexed _staker, address indexed _token, uint256 _reward);

    /**
     * @dev Emitted when rewards are transferred
     * @param _staker Address of the staker
     * @param _token  Address of the token staked
     * @param _reward Rewards transferred
     */
    event TransferReward(address indexed _staker, address indexed _token, uint256 _reward);

    /**
     * @notice Withdraw staked tokens
     * @param _token Address of the staked token
     * @param _amount Amount to withdraw
     */
    function withdraw(address _token, uint256 _amount) external;

    /**
     * @notice Distribute rewards
     * @param _token Address of the staked token
     * @param _stakers Array of staker
     */
    function distributeRewards(address _token, address[] memory _stakers) external;

    /**
     * @notice Stake tokens
     * @param _token Address of the staked token
     * @param _amount Amount to stake
     */
    function stake(address _token, uint256 _amount) external;

    /**
     * @notice Deposit txn fee  and settlement fee in usdc
     * @param _amount Amount to deposit
     * @param _depositType DepositType (Transaction or Settlement)
     */
    function deposit(uint256 _amount, DepositType _depositType) external;
}
