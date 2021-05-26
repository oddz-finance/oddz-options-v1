// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

interface IOddzAsset {
    struct Asset {
        bool _active;
        uint8 _precision;
        bytes32 _name;
        address _address;
    }

    struct AssetPair {
        bool _active;
        bytes32 _primary;
        bytes32 _strike;
        address _address;
        uint256 _limit;
        uint256 _maxDays;
        uint256 _minDays;
    }

    // Asset functions
    function getAsset(bytes32 _asset) external view returns (Asset memory asset);

    function getPrecision(bytes32 _asset) external view returns (uint8 precision);

    function getAssetAddressByName(bytes32 _asset) external view returns (address asset);

    // Asset pair functions
    function getPair(address _address) external view returns (AssetPair memory pair);

    function getPrimaryFromPair(address _address) external view returns (bytes32 primary);

    function getStatusOfPair(address _address) external view returns (bool status);

    function getPurchaseLimit(address _address) external view returns (uint256 limit);

    function getMaxPeriod(address _address) external view returns (uint256 maxPeriod);

    function getMinPeriod(address _address) external view returns (uint256 minPeriod);
}
