pragma solidity ^0.7.4;

import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./IPancakeSwap.sol";
import "hardhat/console.sol";
import "../../../Swap/ISwapUnderlyingAsset.sol";

contract PancakeSwapForUnderlyingAsset is Ownable, ISwapUnderlyingAsset {
    using SafeERC20 for ERC20;

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
     * @param _amountOutMin minimum amount of toTokens to swap to
     * @param _deadline deadline timestamp for txn to be valid
     */

    function swapTokensForUA(
        bytes32 _fromToken,
        bytes32 _toToken,
        address payable _account,
        uint256 _amountIn,
        uint256 _amountOutMin,
        uint256 _deadline
    ) external override returns (uint256[] memory result) {
        address[] memory path = new address[](2);
        path[0] = assetAddresses[_fromToken];
        path[1] = assetAddresses[_toToken];
        ERC20(path[0]).approve(address(pancakeSwap), _amountIn);
        result = pancakeSwap.swapExactTokensForTokens(_amountIn, _amountOutMin, path, address(this), _deadline);
        // converting address to address payable
        ERC20(address(uint160(path[1]))).safeTransfer(_account, result[1]);
    }

    /**
     * @notice Function to add asset address
     * @param _assetName name of the asset
     * @param _assetAddress address of the asset
     */

    function addAssetAddress(bytes32 _assetName, address _assetAddress) public override {
        require(_assetName != bytes32(""), "invalid asset name");
        if (assetAddresses[_assetName] == address(0)) {
            assetAddresses[_assetName] = _assetAddress;

            emit AddedAssetAddress(_assetName, _assetAddress);
        }
    }

    /**
     * @notice Function to update asset address
     * @param _assetName name of the asset
     * @param _assetAddress address of the asset
     */

    function updateAssetAddress(bytes32 _assetName, address _assetAddress) public override {
        require(_assetName != bytes32(""), "invalid asset name");
        require(assetAddresses[_assetName] != address(0), "asset address not present. please add the asset address");
        assetAddresses[_assetName] = _assetAddress;

        emit UpdatedAssetAddress(_assetName, _assetAddress);
    }
}
