// SPDX-License-Identifier: BSD-4-Clause
pragma solidity ^0.7.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title Oddz USD Liquidity Pool
 * @notice Accumulates liquidity in USD from LPs
 */
interface IOddzLiquidityPool {
    struct LockedLiquidity {
        uint256 amount;
        uint256 premium;
        bool locked;
    }

    event Profit(uint256 indexed _id, uint256 _amount);
    event Loss(uint256 indexed _id, uint256 _amount);
    event Provide(address indexed _account, uint256 _amount, uint256 _writeAmount);
    event Withdraw(address indexed _account, uint256 _amount, uint256 _writeAmount);

    /**
     * @notice A provider supplies USD pegged stablecoin to the pool and receives oUSD tokens
     * @return mint Amount of tokens minted
     */
    function provide() external payable returns (uint256 mint);

    /**
     * @notice Provider burns oUSD and receives USD from the pool
     * @param _amount Amount of USD to receive
     * @return burn Amount of tokens to be burnt
     */
    function withdraw(uint256 _amount) external returns (uint256 burn);

    /**
     * @notice called by Oddz call options to lock the funds
     * @param _id Id of the LockedLiquidity same as option Id
     * @param _amount Amount of funds that should be locked in an option
     */

    function lock(uint256 _id, uint256 _amount) external payable;

    /**
     * @notice called by Oddz option to unlock the funds
     * @param _id Id of LockedLiquidity that should be unlocked
     */
    function unlock(uint256 _id) external;

    /**
     * @notice called by Oddz call options to send funds to LPs after an option's expiration
     * @param _account Provider account address
     * @param _amount Funds that should be sent
     */
    function send(
        uint256 _id,
        address payable _account,
        uint256 _amount
    ) external;

    /**
     * @notice Returns the amount of USD available for withdrawals
     * @return balance Unlocked balance
     */
    function availableBalance() external view returns (uint256 balance);

    /**
     * @notice Returns the total balance of USD provided to the pool
     * @return balance Pool balance
     */
    function totalBalance() external view returns (uint256 balance);
}
