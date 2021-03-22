pragma solidity ^0.7.4;

import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./IPancakeSwap.sol";
import "hardhat/console.sol";
import "../../../Swap/ISwapUnderlyingAsset.sol";

contract PancakeSwapForUnderlyingAsset is Ownable, ISwapUnderlyingAsset {
    using SafeERC20 for ERC20;

    uint256 amountOutMin = 0;
    mapping(bytes32 => address) public assetAddresses;

    IPancakeSwap pancakeSwap;

    constructor(address _pancakeSwap) public {
        pancakeSwap = IPancakeSwap(_pancakeSwap);
    }

    /**
     * @notice Function to swap Tokens
     * @param _fromToken name of the asset to swap from
     * @param _toToken name of the asset to swap to
     * @param _account account to send the swapped tokens to
     * @param _amountIn amount of fromTokens to swap from
     * @param _deadline deadline timestamp for txn to be valid
     */

    function swapTokensForUA(
        address _fromToken,
        address _toToken,
        address payable _account,
        uint256 _amountIn,
        uint256 _deadline
    ) public override onlyOwner returns (uint256[] memory result) {
        address[] memory path = new address[](2);
        path[0] = _fromToken;
        path[1] = _toToken;
        ERC20(_fromToken).approve(address(pancakeSwap), _amountIn);
        result = pancakeSwap.swapExactTokensForTokens(_amountIn, amountOutMin, path, address(this), _deadline);
        // converting address to address payable
        ERC20(address(uint160(_toToken))).safeTransfer(_account, result[1]);
    }
}