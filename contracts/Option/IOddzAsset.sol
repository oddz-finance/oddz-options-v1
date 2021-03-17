// SPDX-License-Identifier: BSD-4-Clause
pragma solidity ^0.7.0;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IOddzAsset {
    event NewAsset(uint32 indexed _id, bytes32 indexed _name, bool _status);
    event AssetActivate(uint32 indexed _id, bytes32 indexed _name);
    event AssetDeactivate(uint32 indexed _id, bytes32 indexed _name);

    event NewAssetPair(uint32 indexed _id, uint32 indexed _primary, uint32 indexed _strike, bool _status);
    event AssetActivatePair(uint32 indexed _id, uint32 indexed _primary, uint32 indexed _strike);
    event AssetDeactivatePair(uint32 indexed _id, uint32 indexed _primary, uint32 indexed _strike);

    struct Asset {
        uint32 id;
        bytes32 name;
        address assetAddress;
        bool active;
        uint256 precision;
    }

    struct AssetPair {
        uint32 id;
        uint32 primary;
        uint32 strike;
        bool active;
    }

    /**
     * @notice Add asset
     * @param _name Symbol of the asset e.g. BTC, ETH
     * @param _address Address of the asset
     * @param _precision Percentage precision for the asset
     * @return assetId Asset ID
     */
    function addAsset(
        bytes32 _name,
        address _address,
        uint256 _precision
    ) external returns (uint32 assetId);

    /**
     * @notice Activate an asset
     * @param _assetId ID of an valid asset
     * @return name Asset symbol
     * @return status Asset Status
     */
    function activateAsset(uint32 _assetId) external returns (bytes32 name, bool status);

    /**
     * @notice Deactivate an asset
     * @param _assetId ID of an valid asset
     * @return name Asset symbol
     * @return status Asset Status
     */
    function deactivateAsset(uint32 _assetId) external returns (bytes32 name, bool status);

    /**
     * @notice Add trade asset pair
     * @param _primary ID of the primary asset
     * @param _strike ID of the strike asset
     * @return pairId Asset pair ID
     */
    function addAssetPair(uint32 _primary, uint32 _strike) external returns (uint32 pairId);

    /**
     * @notice Activate an asset pair
     * @param _pairId ID of an valid asset
     * @return pairId Asset symbol
     * @return status Asset Status
     */
    function activateAssetPair(uint32 _pairId) external returns (uint32 pairId, bool status);

    /**
     * @notice Deactivate an asset pair
     * @param _pairId ID of an valid asset
     * @return pairId Asset symbol
     * @return status Asset Status
     */
    function deactivateAssetPair(uint32 _pairId) external returns (uint32 pairId, bool status);
}
