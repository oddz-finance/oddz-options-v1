// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./IPancakeSwap.sol";
import "../../../Swap/ISwapUnderlyingAsset.sol";
import "../../../Option/IOddzAsset.sol";

contract PancakeSwapForUnderlyingAsset is Ownable, ISwapUnderlyingAsset {
    using SafeERC20 for ERC20;

    IPancakeSwap pancakeSwap;
    IOddzAsset assetManager;

    constructor(address _router, IOddzAsset _assetManager) {
        pancakeSwap = IPancakeSwap(_router);
        assetManager = _assetManager;
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
        bytes32 _fromToken,
        bytes32 _toToken,
        address _account,
        uint256 _amountIn,
        uint256 _deadline,
        uint16 _slippage
    ) public override onlyOwner returns (uint256[] memory result) {
        address[] memory path = new address[](2);
        address _fromTokenAddress = assetManager.getAssetAddressByName(_fromToken);
        address _toTokenAddress = assetManager.getAssetAddressByName(_toToken);
        path[0] = _fromTokenAddress;
        path[1] = _toTokenAddress;
        ERC20(_fromTokenAddress).safeApprove(address(pancakeSwap), _amountIn);
        // gets amount of output tokens for input tokens
        uint256[] memory amounts = pancakeSwap.getAmountsOut(_amountIn, path);
        // /10000 --> slippage% decimals restricted to 2 (2.55)
        uint256 amountOutMin = amounts[amounts.length - 1] - (amounts[amounts.length - 1] * _slippage) / 10000;
        result = pancakeSwap.swapExactTokensForTokens(_amountIn, amountOutMin, path, address(this), _deadline);
        // converting address to address payable
        ERC20(address(uint160(_toTokenAddress))).safeTransfer(_account, result[1]);
    }
}
