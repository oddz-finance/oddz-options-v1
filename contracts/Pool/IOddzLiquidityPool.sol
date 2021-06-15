// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

/**
 * @title Oddz USD Liquidity Pool
 * @notice Accumulates liquidity in USD from LPs
 */
interface IOddzLiquidityPool {
    event AddLiquidity(address indexed _account, uint256 _amount);
    event RemoveLiquidity(address indexed _account, uint256 _amount, uint256 _burn);
    event LockLiquidity(uint256 _amount);
    event UnlockLiquidity(uint256 _amount);
    event PremiumCollected(address indexed _account, uint256 _amount);
    event PremiumForfeited(address indexed _account, uint256 _amount);
    event Profit(uint256 indexed _id, uint256 _amount);
    event Loss(uint256 indexed _id, uint256 _amount);

    enum TransactionType { ADD, REMOVE }
    struct PoolDetails {
        bytes32 _strike;
        bytes32 _underlying;
        bytes32 _optionType;
        bytes32 _model;
        bytes32 _maxExpiration;
    }

    /**
     * @notice returns pool parameters info
     */
    function poolDetails()
        external
        view
        returns (
            bytes32 _strike,
            bytes32 _underlying,
            bytes32 _optionType,
            bytes32 _model,
            bytes32 _maxExpiration
        );

    /**
     * @notice Add liquidity for the day
     * @param _amount USD value
     * @param _account Address of the Liquidity Provider
     */
    function addLiquidity(uint256 _amount, address _account) external;

    /**
     * @notice Provider burns oUSD and receives USD from the pool
     * @param _amount Amount of USD to receive
     * @param _oUSD Amount of oUSD to be burnt
     * @param _account Address of the Liquidity Provider
     * @param _lockDuration premium lockup days
     */
    function removeLiquidity(
        uint256 _amount,
        uint256 _oUSD,
        address _account,
        uint256 _lockDuration
    ) external;

    /**
     * @notice called by Oddz call options to lock the funds
     * @param _amount Amount of funds that should be locked in an option
     * @param _premium premium allocated to the pool
     */
    function lockLiquidity(uint256 _amount, uint256 _premium) external;

    /**
     * @notice called by Oddz option to unlock the funds
     * @param _amount Amount of funds that should be unlocked in an option
     */
    function unlockLiquidity(uint256 _amount) external;

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
     * @notice Allocate premium to pool
     * @param _lid liquidity ID
     * @param _amount Premium amount
     */
    function unlockPremium(uint256 _lid, uint256 _amount) external;

    /**
     * @notice Allocate premium to pool
     * @param _lid liquidity ID
     * @param _amount Premium amount
     * @param _transfer Amount i.e will be transferred to option owner
     */
    function exercisePremium(
        uint256 _lid,
        uint256 _amount,
        uint256 _transfer
    ) external;

    /**
     * @notice fetches user premium
     * @param _provider Address of the Liquidity Provider
     */
    function getPremium(address _provider) external view returns (uint256 rewards, bool isNegative);

    /**
     * @notice helper to convert premium to oUSD and sets the premium to zero
     * @param _provider Address of the Liquidity Provider
     * @param _lockDuration premium lockup days
     * @return premium Premium balance
     */
    function collectPremium(address _provider, uint256 _lockDuration) external returns (uint256 premium);
}
