pragma solidity ^0.7.4;

interface IPancakeSwap {
    /**
     * @notice Function to swap exact tokens for tokens
     * @param _amountIn input tokens
     * @param _amountOutMin minimum output tokens
     * @param _path array of token addresses
     * @param _to receiver address
     * @param _deadline deadline after which transaction reverts.
     */
    function swapExactTokensForTokens(
        uint256 _amountIn,
        uint256 _amountOutMin,
        address[] calldata _path,
        address _to,
        uint256 _deadline
    ) external returns (uint256[] memory amounts);
}
