// SPDX-License-Identifier: BSD-4-Clause
pragma experimental ABIEncoderV2;
pragma solidity ^0.7.0;

import "./IOddzAsset.sol";

contract OddzAssetManager is Ownable, IOddzAsset {
    Asset[] public assets;
    mapping(bytes32 => Asset) public assetNameMap;
    mapping(uint32 => Asset) public assetIdMap;

    AssetPair[] public pairs;
    mapping(uint32 => AssetPair) public pairIdMap;
    mapping(uint32 => mapping(uint32 => AssetPair)) public pairMap;

    modifier validAsset(uint32 _underlying) {
        require(assetIdMap[_underlying]._active == true, "Invalid Asset");
        _;
    }

    modifier inactiveAsset(uint32 _underlying) {
        require(assetIdMap[_underlying]._active == false, "Asset is active");
        _;
    }

    modifier validAssetPair(uint32 _pairId) {
        require(pairIdMap[_pairId]._active == true, "Invalid Asset pair");
        _;
    }

    modifier inactiveAssetPair(uint32 _pairId) {
        require(pairIdMap[_pairId]._active == false, "Asset pair is active");
        _;
    }

    function getAssetAddressByName(bytes32 _name) public view returns (address asset) {
        require(_name != "", "invalid asset name");
        require(assetNameMap[_name]._address != address(0), "Invalid asset address");
        asset = assetNameMap[_name]._address;
    }

    function getStatusOfPair(uint32 _pairId) public view returns (bool status) {
        status = pairIdMap[_pairId]._active;
    }

    function getAsset(uint32 _assetId) public view returns (Asset memory asset) {
        asset = assetIdMap[_assetId];
    }

    function getPair(uint32 _pairId) public view returns (AssetPair memory pair) {
        pair = pairIdMap[_pairId];
    }

    function getPrimaryFromPair(uint32 _pairId) public view returns (uint32 primary) {
        primary = pairIdMap[_pairId]._primary;
    }

    function getStrikeFromPair(uint32 _pairId) public view returns (uint32 strike) {
        strike = pairIdMap[_pairId]._strike;
    }

    function getAssetName(uint32 _assetId) public view returns (bytes32 name) {
        name = assetIdMap[_assetId]._name;
    }

    function getPrecision(uint32 _assetId) public view returns (uint256 precision) {
        precision = assetIdMap[_assetId]._precision;
    }

    function getPurchaseLimit(uint32 _pairId) public view returns (uint256 limit) {
        limit = pairIdMap[_pairId]._limit;
    }

    /**
     * @notice Used for adding the new asset
     * @param _name Name for the underlying asset
     * @param _address Address of the underlying asset
     * @param _precision Precision for the underlying asset
     * @return assetId Asset id
     */
    function addAsset(
        bytes32 _name,
        address _address,
        uint256 _precision
    ) external override onlyOwner returns (uint32 assetId) {
        require(assetNameMap[_name]._name == "", "Asset already present");
        require(_address != address(0), "invalid address");

        assetId = uint32(assets.length);
        Asset memory asset =
            Asset({ _id: assetId, _name: _name, _address: _address, _active: true, _precision: _precision });
        assetNameMap[_name] = asset;
        assetIdMap[assetId] = asset;
        assets.push(asset);

        emit NewAsset(asset._id, asset._name, asset._active);
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
        asset._active = true;
        status = asset._active;
        name = asset._name;

        emit AssetActivate(asset._id, asset._name);
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
        asset._active = false;
        status = asset._active;
        name = asset._name;

        emit AssetDeactivate(asset._id, asset._name);
    }

    /**
     * @notice Add trade asset pair
     * @param _primary ID of the primary asset
     * @param _strike ID of the strike asset
     * @return pairId Asset pair ID
     */
    function addAssetPair(
        uint32 _primary,
        uint32 _strike,
        uint256 _limit
    ) external override onlyOwner validAsset(_primary) validAsset(_strike) returns (uint32 pairId) {
        require(pairMap[_primary][_strike]._primary == 0, "Asset pair already present");

        pairId = uint32(pairs.length);
        AssetPair memory pair =
            AssetPair({ _id: pairId, _primary: _primary, _strike: _strike, _limit: _limit, _active: true });
        pairIdMap[pairId] = pair;
        pairs.push(pair);
        pairMap[_primary][_strike] = pair;

        emit NewAssetPair(pair._id, pair._primary, pair._strike, pair._active, _limit);
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
        onlyOwner
        inactiveAssetPair(_pairId)
        returns (uint32 pairId, bool status)
    {
        AssetPair storage pair = pairIdMap[_pairId];
        pair._active = true;
        status = pair._active;
        pairId = pair._id;

        emit AssetActivatePair(pair._id, pair._primary, pair._strike);
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
        onlyOwner
        validAssetPair(_pairId)
        returns (uint32 pairId, bool status)
    {
        AssetPair storage pair = pairIdMap[_pairId];
        pair._active = false;
        status = pair._active;
        pairId = pair._id;

        emit AssetDeactivatePair(pair._id, pair._primary, pair._strike);
    }

    function setPurchaseLimit(uint32 _pairId, uint256 _limit) external override onlyOwner validAssetPair(_pairId) {
        AssetPair storage pair = pairIdMap[_pairId];
        pair._limit = _limit;

        emit SetPurchaseLimit(_pairId, pair._primary, pair._strike, _limit);
    }
}
