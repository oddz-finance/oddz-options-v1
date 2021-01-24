// SPDX-License-Identifier: BSD-4-Clause
pragma solidity ^0.7.0;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IOddzAsset {
    event NewAsset(uint32 indexed id, bytes32 indexed _name, bool _status);
    event AssetActivate(uint32 indexed id, bytes32 indexed _name);
    event AssetDeactivate(uint32 indexed id, bytes32 indexed _name);

    struct Asset {
        uint32 id;
        bytes32 name;
        bool active;
        uint256 precision;
    }

    /**
     * @notice Add asset
     * @param _name Symbol of the asset e.g. BTC, ETH
     * @param _precision Percentage precision for the asset
     * @return assetId Asset ID
     */
    function addAsset(bytes32 _name, uint256 _precision) external returns (uint32 assetId);

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
}
