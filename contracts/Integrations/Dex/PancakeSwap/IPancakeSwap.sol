// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

interface IPancakeSwap {
    /**
     * @notice Function to swap exact tokens for tokens
     * @param _amountIn input tokens
     * @param _amountOutMin minimum output tokens
     * @param _path array of token addresses
     * @param _to receiver address
     * @param _deadline deadline after which transaction reverts.
     * @return amounts output tokens
     */
    function swapExactTokensForTokens(
        uint256 _amountIn,
        uint256 _amountOutMin,
        address[] calldata _path,
        address _to,
        uint256 _deadline
    ) external returns (uint256[] memory amounts);

    /**
     * @notice Function to get min amount output tokend
     * @param _amountIn input tokens
     * @param _path array of token addresses
     * @return amounts output tokens
     */
    function getAmountsOut(uint _amountIn, address[] memory _path)
        external
        view
        returns (uint[] memory amounts);
    
}
