pragma solidity ^0.7.4;

interface ISwapUnderlyingAsset {
    /**
     * @notice Emitted when asset data is added
     * @param _assetName name of the asset
     * @param _assetAddress address of the asset
     */
    event AddedAssetAddress(bytes32 indexed _assetName, address _assetAddress);

    /**
     * @notice Emitted when asset data is updated
     * @param _assetName name of the asset
     * @param _assetAddress address of the asset
     */
    event UpdatedAssetAddress(bytes32 indexed _assetName, address _assetAddress);

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
    ) external returns (uint256[] memory swapResult);
}
