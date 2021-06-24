// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title Oddz Staking
 * @notice Oddz Staking contract
 */
interface IOddzStakingManager {
    /**
     * @dev Deposit Type details
     */
    enum DepositType { Transaction, Settlement, Rewards }

    /**
     * @notice Withdraw staked tokens
     * @param _token Address of the staked token
     * @param _amount Amount to withdraw
     */
    function withdraw(IERC20 _token, uint256 _amount) external;

    /**
     * @notice Stake tokens
     * @param _token Address of the staked token
     * @param _amount Amount to stake
     */
    function stake(IERC20 _token, uint256 _amount) external;

    /**
     * @notice Deposit txn fee  and settlement fee in usdc
     * @param _amount Amount to deposit
     * @param _depositType DepositType (Transaction or Settlement)
     */
    function deposit(uint256 _amount, DepositType _depositType) external;
}
