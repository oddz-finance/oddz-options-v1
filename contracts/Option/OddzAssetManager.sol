// SPDX-License-Identifier: BSD-4-Clause
pragma solidity ^0.7.0;

import "./IOddzAsset.sol";

contract OddzAssetManager is Ownable, IOddzAsset{

    Asset[] public assets;
    Asset public strikeAsset;
    mapping(bytes32 => Asset) internal assetNameMap;
    mapping(uint32 => Asset) internal assetIdMap;

    modifier validAsset(uint32 _underlying) {
        require(assetIdMap[_underlying].active == true, "Invalid Asset");
        _;
    }

    modifier inactiveAsset(uint32 _underlying) {
        require(assetIdMap[_underlying].active == false, "Asset is active");
        _;
    }

    function addAsset(bytes32 _name, uint256 _precision) external override onlyOwner returns (uint32 assetId) {
        require(assetNameMap[_name].active == false, "Asset already present");
        assetId = uint32(assets.length);
        Asset memory asset = Asset({ id: assetId, name: _name, active: true, precision: _precision });
        assetNameMap[_name] = asset;
        assetIdMap[assetId] = asset;
        assets.push(asset);

        emit NewAsset(asset.id, asset.name, asset.active);
    }

    function activateAsset(uint32 _assetId)
        external
        override
        onlyOwner
        inactiveAsset(_assetId)
        returns (bytes32 name, bool status)
    {
        Asset storage asset = assetIdMap[_assetId];
        asset.active = false;
        status = asset.active;
        name = asset.name;

        emit AssetActivate(asset.id, asset.name);
    }

    function deactivateAsset(uint32 _assetId)
        external
        override
        onlyOwner
        validAsset(_assetId)
        returns (bytes32 name, bool status)
    {
        Asset storage asset = assetIdMap[_assetId];
        asset.active = true;
        status = asset.active;
        name = asset.name;

        emit AssetDeactivate(asset.id, asset.name);
    }
}