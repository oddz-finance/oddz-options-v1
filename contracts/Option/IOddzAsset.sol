// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IOddzAsset {
    event NewAsset(bytes32 indexed _name, address indexed _address);
    event AssetActivate(bytes32 indexed _name, address indexed _address);
    event AssetDeactivate(bytes32 indexed _name, address indexed _address);

    event NewAssetPair(address indexed _address, bytes32 indexed _primary, bytes32 indexed _strike, uint256 _limit);
    event AssetActivatePair(address indexed _address, bytes32 indexed _primary, bytes32 indexed _strike);
    event AssetDeactivatePair(address indexed _address, bytes32 indexed _primary, bytes32 indexed _strike);
    event SetPurchaseLimit(address indexed _address, bytes32 indexed _primary, bytes32 indexed _strike, uint256 _limit);

    struct Asset {
        bytes32 _name;
        address _address;
        bool _active;
        uint8 _precision;
    }

    struct AssetPair {
        address _address;
        bytes32 _primary;
        bytes32 _strike;
        bool _active;
        uint256 _limit;
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
    ) external;

    /**
     * @notice Activate an asset
     * @param _asset underlying asset
     */
    function activateAsset(bytes32 _asset) external;

    /**
     * @notice Deactivate an asset
     * @param _asset underlying asset
     */
    function deactivateAsset(bytes32 _asset) external;

    /**
     * @notice Add trade asset pair
     * @param _primary primary asset name
     * @param _strike strike asset name
     * @param _limit purchase limit for the pair
     */
    function addAssetPair(
        bytes32 _primary,
        bytes32 _strike,
        uint256 _limit
    ) external;

    /**
     * @notice Activate an asset pair
     * @param _address asset pair address
     */
    function activateAssetPair(address _address) external;

    /**
     * @notice Deactivate an asset pair
     * @param _address asset pair address
     */
    function deactivateAssetPair(address _address) external;

    /**
     * @notice Set purchase limit
     * @param _address asset pair address
     * @param _limit purchase limit for the pair
     */
    function setPurchaseLimit(address _address, uint256 _limit) external;
}
