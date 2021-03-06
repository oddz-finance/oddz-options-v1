// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

/**
 * @title Oddz Staking
 * @notice Oddz Staking contract
 */
interface IOddzTokenStaking {
    /**
     * @notice Stake tokens
     * @param _staker Address of the staker
     * @param _amount Amount to stake
     */
    function stake(address _staker, uint256 _amount) external;

    /**
     * @notice unstake tokens of the staker
     * @param _staker Address of the staker
     * @param _amount Amount to burn and transfer
     */
    function unstake(address _staker, uint256 _amount) external;

    /**
     * @notice Allocates rewards to staker
     * @param _amount Amount of ODDZ token allocated
     */
    function allocateRewards(uint256 _amount) external;

    /**
     * @notice Get last staked date for the staker
     * @param _staker Address of the staker
     * @return lastStakedAt last staked date
     */
    function getLastStakedAt(address _staker) external view returns (uint256 lastStakedAt);

    /**
     * @notice Get staker rewards
     * @param _staker Address of the staker
     * @return rewards staker rewards
     */
    function getRewards(address _staker) external view returns (uint256 rewards);

    /**
     * @notice Remove staker rewards
     * @param _staker Address of the staker
     * @return rewards staker rewards
     */
    function withdrawRewards(address _staker) external returns (uint256 rewards);

    /**
     * @notice Return if the staker is valid
     * @param _staker Address of the staker
     * @return true/false for valid staker
     */
    function isValidStaker(address _staker) external view returns (bool);

    /**
     * @notice Call this method every day
     * @param _date stake as per the date
     * @return dayStake stake for the date
     */
    function getAndUpdateDaysActiveStake(uint256 _date) external returns (uint256 dayStake);
}
