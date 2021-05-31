// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./IPancakeSwap.sol";
import "../../../Swap/ISwapUnderlyingAsset.sol";

contract PancakeSwapForUnderlyingAsset is Ownable, ISwapUnderlyingAsset {
    using SafeERC20 for ERC20;

    IPancakeSwap pancakeSwap;

    constructor(address _router) {
        pancakeSwap = IPancakeSwap(_router);
    }

    /**
     * @notice Function to swap Tokens
     * @param _fromToken name of the asset to swap from
     * @param _toToken name of the asset to swap to
     * @param _account account to send the swapped tokens to
     * @param _amountIn amount of fromTokens to swap from
     * @param _deadline deadline timestamp for txn to be valid
     * @param _slippage Slippage percentage
     */

    function swapTokensForUA(
        address _fromToken,
        address _toToken,
        address _account,
        uint256 _amountIn,
        uint256 _deadline,
        uint8 _slippage
    ) public override onlyOwner returns (uint256[] memory result) {
        address[] memory path = new address[](2);
        path[0] = _fromToken;
        path[1] = _toToken;
        ERC20(_fromToken).safeApprove(address(pancakeSwap), _amountIn);
        // gets amount of output tokens for input tokens
        uint[] memory amounts = pancakeSwap.getAmountsOut(_amountIn, path);
        // /1000 --> slippage decimals restricted to 2 (0.09)
        uint256 amountOutMin = amounts[amounts.length - 1] * _slippage / 1000; 
        result = pancakeSwap.swapExactTokensForTokens(_amountIn, amountOutMin, path, address(this), _deadline);
        // converting address to address payable
        ERC20(address(uint160(_toToken))).safeTransfer(_account, result[1]);
    }
}
