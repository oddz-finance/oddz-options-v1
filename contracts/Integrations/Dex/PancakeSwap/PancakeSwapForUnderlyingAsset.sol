// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./IPancakeSwap.sol";
import "../../../Swap/ISwapUnderlyingAsset.sol";

contract PancakeSwapForUnderlyingAsset is Ownable, ISwapUnderlyingAsset {
    using SafeERC20 for ERC20;

    IPancakeSwap public pancakeSwap;

    constructor(address _router) {
        pancakeSwap = IPancakeSwap(_router);
    }

    /**
     * @notice Function to swap Tokens
     * @param _fromToken address of the asset to swap from
     * @param _toToken address of the asset to swap to
     * @param _account account to send the swapped tokens to
     * @param _amountIn amount of fromTokens to swap from
     * @param _amountOutMin min amount of output tokens
     * @param _deadline deadline timestamp for txn to be valid
     * @param _slippage Slippage percentage
     */

    function swapTokensForUA(
        address _fromToken,
        address _toToken,
        address _account,
        uint256 _amountIn,
        uint256 _amountOutMin,
        uint256 _deadline,
        uint16 _slippage
    ) public override onlyOwner returns (uint256[] memory result) {
        address[] memory path = new address[](2);
        path[0] = _fromToken;
        path[1] = _toToken;
        ERC20(_fromToken).safeApprove(address(pancakeSwap), _amountIn);
        _amountOutMin = _amountOutMin - (_amountOutMin * _slippage) / 10000;
        result = pancakeSwap.swapExactTokensForTokens(_amountIn, _amountOutMin, path, address(this), _deadline);
        // converting address to address payable
        ERC20(address(uint160(_toToken))).safeTransfer(_account, result[1]);
    }
}
