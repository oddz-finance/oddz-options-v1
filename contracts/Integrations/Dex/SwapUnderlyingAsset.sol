pragma solidity ^0.7.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./IDexSwap.sol";
import "./ISwapUnderlyingAsset.sol";

contract SwapUnderlyingAsset is ISwapUnderlyingAsset {
    mapping(bytes32 => address) assetAddresses;

    IDexSwap dexswap;

    constructor(address _dexswap) public {
        dexswap = IDexSwap(_dexswap);
    }

    function swapTokensForETH(
        address token1,
        bytes32 token2,
        uint256 amountIn,
        uint256 amountOutMin,
        uint256 deadline
    ) external {
        ERC20(token1).transferFrom(msg.sender, address(this), amountIn);
        address[] memory path = new address[](2);
        path[0] = token1;
        path[1] = assetAddresses[token2];
        ERC20(token1).approve(address(dexswap), amountIn);
        dexswap.swapExactTokensForTokens(amountIn, amountOutMin, path, msg.sender, deadline);
        emit Swapped(amountIn);
    }

    function addAssetAddress(bytes32 _assetName, address _assetAddress) public override {
        require(_assetName != bytes32(""), "invalid asset name");
        require(assetAddresses[_assetName] == address(0x0), "asset address already present");
        assetAddresses[_assetName] = _assetAddress;

        emit AddedAssetAddress(_assetName, _assetAddress);
    }

    function updateAssetAddress(bytes32 _assetName, address _assetAddress) public override {
        require(_assetName != bytes32(""), "invalid asset name");
        require(assetAddresses[_assetName] != address(0x0), "asset address not present. please add the asset address");
        assetAddresses[_assetName] = _assetAddress;

        emit UpdatedAssetAddress(_assetName, _assetAddress);
    }
}
