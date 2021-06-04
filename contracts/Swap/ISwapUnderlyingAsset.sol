// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

interface ISwapUnderlyingAsset {
    /**
     * @notice Function to swap Tokens
     * @param _fromToken name of the asset to swap from
     * @param _toToken name of the asset to swap to
     * @param _account account to send the swapped tokens to
     * @param _amountIn amount of fromTokens to swap from
     * @param _deadline deadline timestamp for txn to be valid
     * @param _slippage slippage percentage

     */
    function swapTokensForUA(
        bytes32 _fromToken,
        bytes32 _toToken,
        address _account,
        uint256 _amountIn,
        uint256 _deadline,
        uint16 _slippage
    ) external returns (uint256[] memory swapResult);
}
