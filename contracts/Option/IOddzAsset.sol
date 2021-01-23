// SPDX-License-Identifier: BSD-4-Clause
pragma solidity ^0.7.0;

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
}