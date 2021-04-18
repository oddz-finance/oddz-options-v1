// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IOddzAsset {
    // Asset
    event NewAsset(bytes32 indexed _name, address indexed _address);
    event AssetActivate(bytes32 indexed _name, address indexed _address);
    event AssetDeactivate(bytes32 indexed _name, address indexed _address);

    struct Asset {
        bool _active;
        uint8 _precision;
        bytes32 _name;
        address _address;
    }

    // Asset pair
    event NewAssetPair(
        address indexed _address,
        bytes32 indexed _primary,
        bytes32 indexed _strike,
        uint256 _limit,
        uint256 _maxDays,
        uint256 _minDays
    );
    event AssetActivatePair(address indexed _address, bytes32 indexed _primary, bytes32 indexed _strike);
    event AssetDeactivatePair(address indexed _address, bytes32 indexed _primary, bytes32 indexed _strike);
    event SetPurchaseLimit(address indexed _address, bytes32 indexed _primary, bytes32 indexed _strike, uint256 _limit);
    event AssetPairMaxPeriodUpdate(
        address indexed _address,
        bytes32 indexed _primary,
        bytes32 indexed _strike,
        uint256 _maxDays
    );
    event AssetPairMinPeriodUpdate(
        address indexed _address,
        bytes32 indexed _primary,
        bytes32 indexed _strike,
        uint256 _minDays
    );

    struct AssetPair {
        bool _active;
        bytes32 _primary;
        bytes32 _strike;
        address _address;
        uint256 _limit;
        uint256 _maxDays;
        uint256 _minDays;
    }
}
