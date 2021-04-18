// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "./IOddzAsset.sol";
import "hardhat/console.sol";

contract OddzAssetManager is Ownable, IOddzAsset {
    mapping(bytes32 => Asset) public assetNameMap;
    mapping(address => AssetPair) public addressPairMap;

    modifier validAsset(bytes32 _asset) {
        require(assetNameMap[_asset]._active == true, "Invalid Asset");
        _;
    }

    modifier inactiveAsset(bytes32 _asset) {
        require(assetNameMap[_asset]._active == false, "Asset is active");
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

    function getMaxPeriod(address _address) public view returns (uint256 maxPeriod) {
        maxPeriod = getPair(_address)._maxDays;
    }

    function getMinPeriod(address _address) public view returns (uint256 minPeriod) {
        minPeriod = getPair(_address)._minDays;
    }

    function validMaxDays(uint256 _maxDays, uint256 _minDays) private pure {
        require(_maxDays >= _minDays && _maxDays > 1 days && _maxDays <= 365 days, "Invalid max days");
    }

    function validMinDays(uint256 _minDays, uint256 _maxDays) private pure {
        require(_minDays > 1 days && _minDays <= _maxDays, "Invalid min days");
    }

    /**
     * @notice Add asset
     * @param _name Symbol of the asset e.g. BTC, ETH
     * @param _address Address of the asset
     * @param _precision Percentage precision for the asset
     */
    function addAsset(
        bytes32 _name,
        address _address,
        uint8 _precision
    ) external onlyOwner {
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
    function activateAsset(bytes32 _asset) external onlyOwner inactiveAsset(_asset) {
        Asset storage asset = assetNameMap[_asset];
        asset._active = true;

        emit AssetActivate(asset._name, asset._address);
    }

    /**
     * @notice Used for deactivating the asset
     * @param _asset underlying asset
     */
    function deactivateAsset(bytes32 _asset) external onlyOwner validAsset(_asset) {
        Asset storage asset = assetNameMap[_asset];
        asset._active = false;

        emit AssetDeactivate(asset._name, asset._address);
    }

    /**
     * @notice Add trade asset pair
     * @param _primary primary asset name
     * @param _strike strike asset name
     * @param _limit purchase limit for the pair
     * @param _maxDays maximum option period
     * @param _minDays minimum option period
     */
    function addAssetPair(
        bytes32 _primary,
        bytes32 _strike,
        uint256 _limit,
        uint256 _maxDays,
        uint256 _minDays
    ) external onlyOwner validAsset(_primary) validAsset(_strike) {
        address pair = address(uint160(uint256(keccak256(abi.encode(_primary, _strike)))));
        require(addressPairMap[pair]._address == address(0), "Asset pair already present");

        AssetPair memory assetPair =
            AssetPair({
                _address: pair,
                _primary: _primary,
                _strike: _strike,
                _limit: _limit,
                _maxDays: _maxDays,
                _minDays: _minDays,
                _active: true
            });
        addressPairMap[pair] = assetPair;

        emit NewAssetPair(
            assetPair._address,
            assetPair._primary,
            assetPair._strike,
            assetPair._limit,
            assetPair._maxDays,
            assetPair._minDays
        );
    }

    /**
     * @notice Activate an asset pair
     * @param _address asset pair address
     */
    function activateAssetPair(address _address) external onlyOwner inactiveAssetPair(_address) {
        AssetPair storage pair = addressPairMap[_address];
        pair._active = true;

        emit AssetActivatePair(pair._address, pair._primary, pair._strike);
    }

    /**
     * @notice Deactivate an asset pair
     * @param _address asset pair address
     */
    function deactivateAssetPair(address _address) external onlyOwner validAssetPair(_address) {
        AssetPair storage pair = addressPairMap[_address];
        pair._active = false;

        emit AssetDeactivatePair(pair._address, pair._primary, pair._strike);
    }

    /**
     * @notice Activate an asset pair
     * @param _address asset pair address
     * @param _maxDays maximum option period
     */
    function updateMaxPeriod(address _address, uint256 _maxDays) external onlyOwner validAssetPair(_address) {
        AssetPair storage pair = addressPairMap[_address];
        validMaxDays(_maxDays, pair._minDays);
        pair._maxDays = _maxDays;

        emit AssetPairMaxPeriodUpdate(pair._address, pair._primary, pair._strike, pair._maxDays);
    }

    /**
     * @notice Deactivate an asset pair
     * @param _address asset pair address
     * @param _minDays minimum option period
     */
    function updateMinPeriod(address _address, uint256 _minDays) external onlyOwner validAssetPair(_address) {
        AssetPair storage pair = addressPairMap[_address];
        validMinDays(_minDays, pair._maxDays);
        pair._minDays = _minDays;

        emit AssetPairMinPeriodUpdate(pair._address, pair._primary, pair._strike, pair._minDays);
    }

    /**
     * @notice Set purchase limit
     * @param _address asset pair address
     * @param _limit purchase limit for the pair
     */
    function setPurchaseLimit(address _address, uint256 _limit) external onlyOwner validAssetPair(_address) {
        AssetPair storage pair = addressPairMap[_address];
        pair._limit = _limit;

        emit SetPurchaseLimit(pair._address, pair._primary, pair._strike, _limit);
    }
}
