// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./IPancakeSwap.sol";
import "../../../Swap/ISwapUnderlyingAsset.sol";
import "../Oracle/IOddzPriceOracleManager.sol";

contract PancakeSwapForUnderlyingAsset is Ownable, ISwapUnderlyingAsset {
    using SafeERC20 for ERC20;

    IPancakeSwap public pancakeSwap;
    IOddzPriceOracleManager public oracle;

    constructor(address _router, IOddzPriceOracleManager _oracle) {
        pancakeSwap = IPancakeSwap(_router);
        oracle = _oracle;
    }

    /**
     * @notice Function to swap Tokens
     * @param _fromToken address of the asset to swap from
     * @param _toToken address of the asset to swap to
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
        uint16 _slippage
    ) public override onlyOwner returns (uint256[] memory result) {
        address[] memory path = new address[](2);
        path[0] = _fromToken;
        path[1] = _toToken;
        ERC20(_fromToken).safeApprove(address(pancakeSwap), _amountIn);

        (uint256 cp, uint8 decimal) =
            oracle.getUnderlyingPrice(
                assets[_toToken],
                0x5553440000000000000000000000000000000000000000000000000000000000
            );
        uint256 swapAmount = _amountIn / (cp / 10**decimal);
        uint256 amountOutMin = swapAmount - (swapAmount * _slippage) / 10000;
        result = pancakeSwap.swapExactTokensForTokens(_amountIn, amountOutMin, path, address(this), _deadline);
        // converting address to address payable
        ERC20(address(uint160(_toToken))).safeTransfer(_account, result[1]);
    }
}
