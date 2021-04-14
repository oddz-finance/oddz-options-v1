// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "./IOddzAsset.sol";

contract OddzAssetManager is Ownable, IOddzAsset {
    mapping(bytes32 => Asset) public assetNameMap;

    mapping(address => AssetPair) public addressPairMap;
    mapping(bytes32 => mapping(bytes32 => AssetPair)) public pairMap;

    modifier validAsset(bytes32 _underlying) {
        require(assetNameMap[_underlying]._active == true, "Invalid Asset");
        _;
    }

    modifier inactiveAsset(bytes32 _underlying) {
        require(assetNameMap[_underlying]._active == false, "Asset is active");
        _;
    }

    modifier validAssetPair(address _address) {
        require(addressPairMap[_address]._active == true, "Invalid Asset pair");
        _;
    }

    modifier inactiveAssetPair(address _address) {
        require(addressPairMap[_address]._active == false, "Asset pair is active");
        _;
    }

    // Asset functions
    function getAsset(bytes32 _asset) public view returns (Asset memory asset) {
        asset = assetNameMap[_asset];
    }

    function getPrecision(bytes32 _asset) public view returns (uint8 precision) {
        precision = getAsset(_asset)._precision;
    }

    function getAssetAddressByName(bytes32 _asset) public view returns (address asset) {
        require(_asset != "", "invalid asset name");
        require(getAsset(_asset)._address != address(0), "Invalid asset address");
        asset = getAsset(_asset)._address;
    }

    // Asset pair functions
    function getPair(address _address) public view returns (AssetPair memory pair) {
        pair = addressPairMap[_address];
    }

    function getPrimaryFromPair(address _address) public view returns (bytes32 primary) {
        primary = getPair(_address)._primary;
    }

    function getStrikeFromPair(address _address) public view returns (bytes32 strike) {
        strike = getPair(_address)._strike;
    }

    function getStatusOfPair(address _address) public view returns (bool status) {
        status = getPair(_address)._active;
    }

    function getPurchaseLimit(address _address) public view returns (uint256 limit) {
        limit = getPair(_address)._limit;
    }

    /**
     * @notice Used for adding the new asset
     * @param _name Name for the underlying asset
     * @param _precision Precision for the underlying asset
     */
    function addAsset(
        bytes32 _name,
        address _address,
        uint8 _precision
    ) external override onlyOwner {
        require(assetNameMap[_name]._name == "", "Asset already present");
        require(_address != address(0), "invalid address");

        Asset memory asset = Asset({ _name: _name, _address: _address, _active: true, _precision: _precision });
        assetNameMap[_name] = asset;

        emit NewAsset(asset._name, asset._address);
    }

    /**
     * @notice Used for activating the asset
     * @param _asset underlying asset
     */
    function activateAsset(bytes32 _asset) external override onlyOwner inactiveAsset(_asset) {
        Asset storage asset = assetNameMap[_asset];
        asset._active = true;

        emit AssetActivate(asset._name, asset._address);
    }

    /**
     * @notice Used for deactivating the asset
     * @param _asset underlying asset
     */
    function deactivateAsset(bytes32 _asset) external override onlyOwner validAsset(_asset) {
        Asset storage asset = assetNameMap[_asset];
        asset._active = false;

        emit AssetDeactivate(asset._name, asset._address);
    }

    /**
     * @notice Add trade asset pair
     * @param _primary primary asset name
     * @param _strike strike asset name
     */
    function addAssetPair(
        bytes32 _primary,
        bytes32 _strike,
        uint256 _limit
    ) external override onlyOwner validAsset(_primary) validAsset(_strike) {
        require(pairMap[_primary][_strike]._primary == 0, "Asset pair already present");

        address pairAddr = address(uint160(uint256(keccak256(abi.encodePacked(_primary, _strike, _limit)))));

        AssetPair memory pair =
            AssetPair({ _address: pairAddr, _primary: _primary, _strike: _strike, _limit: _limit, _active: true });
        addressPairMap[pairAddr] = pair;
        pairMap[_primary][_strike] = pair;

        emit NewAssetPair(pair._address, pair._primary, pair._strike, _limit);
    }

    /**
     * @notice Activate an asset pair
     * @param _address asset pair address
     */
    function activateAssetPair(address _address) external override onlyOwner inactiveAssetPair(_address) {
        AssetPair storage pair = addressPairMap[_address];
        pair._active = true;

        emit AssetActivatePair(pair._address, pair._primary, pair._strike);
    }

    /**
     * @notice Deactivate an asset pair
     * @param _address asset pair address
     */
    function deactivateAssetPair(address _address) external override onlyOwner validAssetPair(_address) {
        AssetPair storage pair = addressPairMap[_address];
        pair._active = false;

        emit AssetDeactivatePair(pair._address, pair._primary, pair._strike);
    }

    /**
     * @notice Set purchase limit
     * @param _address asset pair address
     * @param _limit Purchase limit for an asset pair
     */
    function setPurchaseLimit(address _address, uint256 _limit) external override onlyOwner validAssetPair(_address) {
        AssetPair storage pair = addressPairMap[_address];
        pair._limit = _limit;

        emit SetPurchaseLimit(pair._address, pair._primary, pair._strike, _limit);
    }
}
