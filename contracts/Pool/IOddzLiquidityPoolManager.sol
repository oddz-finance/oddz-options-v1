// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./IOddzLiquidityPool.sol";

/**
 * @title Oddz USD Liquidity Pool
 * @notice Accumulates liquidity in USD from LPs
 */
interface IOddzLiquidityPoolManager {
    struct LockedLiquidity {
        uint256 _amount;
        uint256 _premium;
        bool _locked;
        IOddzLiquidityPool[] _pools;
        uint256[] _share;
    }

    /**
     * @notice A provider supplies USD pegged stablecoin to the pool and receives oUSD tokens
     * @param _pool Liquidity pool
     * @param _amount Amount in USD
     * @param _account Address of the Liquidity Provider
     * @return mint Amount of tokens minted
     */
    function addLiquidity(
        IOddzLiquidityPool _pool,
        uint256 _amount,
        address _account
    ) external returns (uint256 mint);

    /**
     * @notice Provider burns oUSD and receives USD from the pool
     * @param _pool Remove liquidity from a pool
     * @param _amount Amount of USD to receive
     * @return burn Amount of tokens to be burnt
     */
    function removeLiquidity(IOddzLiquidityPool _pool, uint256 _amount) external returns (uint256 burn);

    /**
     * @notice called by Oddz call options to lock the funds
     * @param _id Id of the LockedLiquidity same as option Id
     * @param _amount Amount of funds that should be locked in an option
     * @param _premium Premium that should be locked in an option
     */

    function lockLiquidity(
        uint256 _id,
        uint256 _amount,
        uint256 _premium,
        address _pair,
        bytes32 _model,
        uint8 _period
    ) external;

    /**
     * @notice called by Oddz option to unlock the funds
     * @param _id Id of LockedLiquidity that should be unlocked
     */
    function unlockLiquidity(uint256 _id) external;

    /**
     * @notice called by Oddz call options to send funds in USD to LPs after an option's expiration
     * @param _id Id of LockedLiquidity that should be unlocked
     * @param _account Provider account address
     * @param _amount Funds that should be sent
     */
    function send(
        uint256 _id,
        address _account,
        uint256 _amount
    ) external;

    /**
     * @notice called by Oddz call options to send funds in UA to LPs after an option's expiration
     * @param _id Id of LockedLiquidity that should be unlocked
     * @param _account Provider account address
     * @param _amount Funds that should be sent
     * @param _underlying underlying asset name
     * @param _strike strike asset name
     * @param _deadline deadline until which txn does not revert
     */
    function sendUA(
        uint256 _id,
        address _account,
        uint256 _amount,
        bytes32 _underlying,
        bytes32 _strike,
        uint32 _deadline
    ) external;

    /**
     * @notice Returns the total balance of USD provided to the pool
     * @return balance Pool balance
     */
    function totalBalance() external view returns (uint256 balance);
}
