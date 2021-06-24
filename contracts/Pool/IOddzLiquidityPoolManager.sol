// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./IOddzLiquidityPool.sol";
import "../Option/IOddzOption.sol";

/**
 * @title Oddz USD Liquidity Pool
 * @notice Accumulates liquidity in USD from LPs
 */
interface IOddzLiquidityPoolManager {
    struct LockedLiquidity {
        uint256 _amount;
        uint256 _premium;
        bool _locked;
        address[] _pools;
        uint256[] _share;
    }

    struct LiquidityParams {
        uint256 _amount;
        uint256 _expiration;
        address _pair;
        bytes32 _model;
        IOddzOption.OptionType _type;
    }

    /**
     * @notice A provider supplies USD pegged stablecoin to the pool and receives oUSD tokens
     * @param _pool Liquidity pool
     * @param _amount Amount in USD
     * @return mint Amount of tokens minted
     */
    function addLiquidity(IOddzLiquidityPool _pool, uint256 _amount) external returns (uint256 mint);

    /**
     * @notice Provider burns oUSD and receives USD from the pool
     * @param _pool Remove liquidity from a pool
     * @param _amount Amount of USD to receive
     */
    function removeLiquidity(IOddzLiquidityPool _pool, uint256 _amount) external;

    /**
     * @notice called by Oddz call options to lock the funds
     * @param _id Id of the LockedLiquidity same as option Id
     * @param _liquidityParams liquidity related parameters
     * @param _premium Premium that should be locked in an option
     */

    function lockLiquidity(
        uint256 _id,
        LiquidityParams memory _liquidityParams,
        uint256 _premium
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
     * @param _slippage Slippage percentage
     */
    function sendUA(
        uint256 _id,
        address _account,
        uint256 _amount,
        bytes32 _underlying,
        bytes32 _strike,
        uint32 _deadline,
        uint16 _slippage
    ) external;
}
