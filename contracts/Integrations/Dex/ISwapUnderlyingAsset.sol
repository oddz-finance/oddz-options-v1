pragma solidity ^0.7.4;

interface ISwapUnderlyingAsset {
    event AddedAssetAddress(bytes32 indexed _assetName, address _assetAddress);
    event UpdatedAssetAddress(bytes32 indexed _assetName, address _assetAddress);
    event Swapped(uint256 indexed _amountIn);

    /**
     * @notice Function to add asset address
     * @param _assetName name of the asset
     * @param _assetAddress address of the asset
     */
    function addAssetAddress(bytes32 _assetName, address _assetAddress) external;

    /**
     * @notice Function to add asset address
     * @param _assetName name of the asset
     * @param _assetAddress address of the asset
     */
    function updateAssetAddress(bytes32 _assetName, address _assetAddress) external;
}
