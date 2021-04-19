// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

interface ISwapUnderlyingAsset {
    /**
     * @notice Function to swap Tokens
     * @param _fromToken address of the asset to swap from
     * @param _toToken address of the asset to swap to
     * @param _account account to send the swapped tokens to
     * @param _amountIn amount of fromTokens to swap from
     * @param _deadline deadline timestamp for txn to be valid
     */
    function swapTokensForUA(
        address _fromToken,
        address _toToken,
        address  _account,
        uint256 _amountIn,
        uint256 _deadline
    ) external returns (uint256[] memory swapResult);
}
