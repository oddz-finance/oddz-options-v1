// SPDX-License-Identifier: BSD-4-Clause
pragma solidity ^0.7.0;

import "./IOddzAsset.sol";

contract OddzAssetManager is Ownable, IOddzAsset {
    Asset[] public assets;
    mapping(bytes32 => Asset) internal assetNameMap;
    mapping(uint32 => Asset) internal assetIdMap;

    AssetPair[] public pairs;
    mapping(uint32 => AssetPair) internal pairIdMap;
    mapping(uint32 => mapping(uint32 => AssetPair)) internal pairMap;

    modifier validAsset(uint32 _underlying) {
        require(assetIdMap[_underlying].active == true, "Invalid Asset");
        _;
    }

    modifier inactiveAsset(uint32 _underlying) {
        require(assetIdMap[_underlying].active == false, "Asset is active");
        _;
    }

    modifier validAssetPair(uint32 _pairId) {
        require(pairIdMap[_pairId].active == true, "Invalid Asset pair");
        _;
    }

    modifier inactiveAssetPair(uint32 _pairId) {
        require(pairIdMap[_pairId].active == false, "Asset pair is active");
        _;
    }

    /**
     * @notice Used for adding the new asset
     * @param _name Name for the underlying asset
     * @param _precision Precision for the underlying asset
     * @return assetId Asset id
     */
    function addAsset(bytes32 _name, uint256 _precision) external override onlyOwner returns (uint32 assetId) {
        require(assetNameMap[_name].name == "", "Asset already present");

        assetId = uint32(assets.length);
        Asset memory asset = Asset({ id: assetId, name: _name, active: true, precision: _precision });
        assetNameMap[_name] = asset;
        assetIdMap[assetId] = asset;
        assets.push(asset);

        emit NewAsset(asset.id, asset.name, asset.active);
    }

    /**
     * @notice Used for activating the asset
     * @param _assetId Id for the underlying asset
     * @return name of the underlying asset
     * @return status of the underlying asset
     */
    function activateAsset(uint32 _assetId)
        external
        override
        onlyOwner
        inactiveAsset(_assetId)
        returns (bytes32 name, bool status)
    {
        Asset storage asset = assetIdMap[_assetId];
        asset.active = true;
        status = asset.active;
        name = asset.name;

        emit AssetActivate(asset.id, asset.name);
    }

    /**
     * @notice Used for deactivating the asset
     * @param _assetId Id for the underlying asset
     * @return name of the underlying asset
     * @return status of the underlying asset
     */
    function deactivateAsset(uint32 _assetId)
        external
        override
        onlyOwner
        validAsset(_assetId)
        returns (bytes32 name, bool status)
    {
        Asset storage asset = assetIdMap[_assetId];
        asset.active = false;
        status = asset.active;
        name = asset.name;

        emit AssetDeactivate(asset.id, asset.name);
    }

    /**
     * @notice Add trade asset pair
     * @param _primary ID of the primary asset
     * @param _strike ID of the strike asset
     * @return pairId Asset pair ID
     */
    function addAssetPair(uint32 _primary, uint32 _strike)
        external
        override
        validAsset(_primary)
        validAsset(_strike)
        returns (uint32 pairId)
    {
        require(pairMap[_primary][_strike].primary == 0, "Asset pair already present");

        pairId = uint32(pairs.length);
        AssetPair memory pair = AssetPair({ id: pairId, primary: _primary, strike: _strike, active: true });
        pairIdMap[pairId] = pair;
        pairs.push(pair);
        pairMap[_primary][_strike] = pair;

        emit NewAssetPair(pair.id, pair.primary, pair.strike, pair.active);
    }

    /**
     * @notice Activate an asset pair
     * @param _pairId ID of an valid asset
     * @return pairId Asset symbol
     * @return status Asset Status
     */
    function activateAssetPair(uint32 _pairId)
        external
        override
        inactiveAssetPair(_pairId)
        returns (uint32 pairId, bool status)
    {
        AssetPair storage pair = pairIdMap[_pairId];
        pair.active = true;
        status = pair.active;
        pairId = pair.id;

        emit AssetActivatePair(pair.id, pair.primary, pair.strike);
    }

    /**
     * @notice Deactivate an asset pair
     * @param _pairId ID of an valid asset
     * @return pairId Asset symbol
     * @return status Asset Status
     */
    function deactivateAssetPair(uint32 _pairId)
        external
        override
        validAssetPair(_pairId)
        returns (uint32 pairId, bool status)
    {
        AssetPair storage pair = pairIdMap[_pairId];
        pair.active = false;
        status = pair.active;
        pairId = pair.id;

        emit AssetDeactivatePair(pair.id, pair.primary, pair.strike);
    }
}
