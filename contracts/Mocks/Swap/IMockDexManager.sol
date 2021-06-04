// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

interface IMockDexManager {
    function getExchange(bytes32 _underlying, bytes32 _strike) external view returns (address exchangeAddress);

    /**
     * @notice Function to swap Tokens
     * @param _fromToken name of the asset to swap from
     * @param _toToken name of the asset to swap to
     * @param _exchange address of the exchange
     * @param _account account to send the swapped tokens to
     * @param _amountIn amount of fromTokens to swap from
     * @param _deadline deadline timestamp for txn to be valid
     * @param _slippage slippage percentage
     * @return amount of swapped tokens
     */
    function swap(
        bytes32 _fromToken,
        bytes32 _toToken,
        address _exchange,
        address _account,
        uint256 _amountIn,
        uint256 _deadline,
        uint16 _slippage
    ) external returns (uint256);
}
