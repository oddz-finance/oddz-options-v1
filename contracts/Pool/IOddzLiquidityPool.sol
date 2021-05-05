// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title Oddz USD Liquidity Pool
 * @notice Accumulates liquidity in USD from LPs
 */
interface IOddzLiquidityPool {
    event AddLiquidity(address indexed _account, uint256 _amount);
    event RemoveLiquidity(address indexed _account, uint256 _amount, uint256 _burn);
    event PremiumCollected(address indexed _accoint, uint256 _amount);
    event PremiumForfeited(address indexed _accoint, uint256 _amount);
    event Profit(uint256 indexed _id, uint256 _amount);
    event Loss(uint256 indexed _id, uint256 _amount);

    enum TransactionType { ADD, REMOVE }

    /**
     * @notice A provider supplies USD pegged stablecoin to the pool and receives oUSD tokens
     * @param _amount Liquidity struct
     * @param _account Address of the Liquidity Provider
     */
    function addLiquidity(uint256 _amount, address _account) external;

    /**
     * @notice Provider burns oUSD and receives USD from the pool
     * @param _amount Amount of USD to receive
     * @param _oUSD Amount of oUSD to be burnt
     * @param _account Address of the Liquidity Provider
     */
    function removeLiquidity(
        uint256 _amount,
        uint256 _oUSD,
        address _account
    ) external;

    /**
     * @notice called by Oddz call options to lock the funds
     * @param _amount Amount of funds that should be locked in an option
     */

    function lockLiquidity(uint256 _amount) external;

    /**
     * @notice called by Oddz option to unlock the funds
     * @param _amount Amount of funds that should be unlocked in an option
     */
    function unlockLiquidity(uint256 _amount) external;

    /**
     * @notice updates surplus amount
     */
    function updateSurplus(uint256 _amount, bool _positive) external;

    /**
     * @notice Returns the amount of USD available for withdrawals
     * @return balance Unlocked balance
     */
    function availableBalance() external view returns (uint256);

    /**
     * @notice Returns the total balance of USD provided to the pool
     * @return balance Pool balance
     */
    function totalBalance() external view returns (uint256);

    /**
     * @notice Returns the total supply allocated for the pool
     * @return balance total supply allocated to the pool
     */
    function totalSupply() external view returns (uint256);

    /**
     * @notice active liquitdity for the date
     * @param _date UTC timestamp of the date
     * @param _account Address of the Liquidity Provider
     * @return balance account balance
     */
    function activeLiquidityByDate(address _account, uint256 _date) external view returns (uint256);

    /**
     * @notice current balance of the user
     * @param _account Address of the Liquidity Provider
     * @return balance account balance
     */
    function activeLiquidity(address _account) external view returns (uint256);

    /**
     * @notice latest transaction date of the user
     * @param _account Address of the Liquidity Provider
     * @return balance account balance
     */
    function latestLiquidityDate(address _account) external view returns (uint256);

    /**
     * @notice Allocate premium to pool
     * @param _lid liquidity ID
     * @param _amount Premium amount
     */
    function unlockPremium(uint256 _lid, uint256 _amount) external;

    function exercisePremium(
        uint256 _lid,
        uint256 _amount,
        uint256 _transfer
    ) external;

    /**
     * @notice gets premium distribution status for a date
     * @param _date Premium eligibility date
     */
    function isPremiumDistributionEnabled(uint256 _date) external view returns (bool);

    /**
     * @notice returns eligible premium for a date
     * @param _date Premium date
     */
    function getEligiblePremium(uint256 _date) external view returns (uint256);

    /**
     * @notice returns distributed premium for a date
     * @param _date Premium date
     */
    function getDistributedPremium(uint256 _date) external view returns (uint256);

    /**
     * @notice Enable premium distribution for a date
     * @param _date Premium eligibility date
     */
    function enablePremiumDistribution(uint256 _date) external;

    /**
     * @notice allocated premium to provider
     * @param _account Address of the Liquidity Provider
     * @param _amount Premium amount
     * @param _date premium eligible date
     */
    function allocatePremiumToProvider(
        address _account,
        uint256 _amount,
        uint256 _date
    ) external;

    /**
     * @notice fetches user premium
     * @param _account Address of the Liquidity Provider
     */
    function getPremium(address _account) external view returns (uint256);

    /**
     * @notice forfeite user premium
     * @param _account Address of the Liquidity Provider
     * @param _amount Premium amount
     */
    function forfeitPremium(address _account, uint256 _amount) external;

    /**
     * @notice helper to convert premium to oUSD and sets the premium to zero
     * @param _account Address of the Liquidity Provider
     * @return premium Premium balance
     */
    function collectPremium(address _account) external returns (uint256 premium);

    /**
     * @notice returns user premium allocated for the date
     * @param _account Address of the Liquidity Provider
     * @param _date premium eligible date
     * @return premium Premium distribution amount for the date
     */
    function getPremiumDistribution(address _account, uint256 _date) external view returns (uint256);

    /**
     * @notice returns active liquidity for the date
     * @param _date premium eligible date
     * @return liquidity Liquidity
     */
    function getDaysActiveLiquidity(uint256 _date) external returns (uint256);
}
