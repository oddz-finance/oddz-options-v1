// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

interface IOddzIVOracleManager {
    function calculateIv(
        bytes32 _underlying,
        bytes32 _strike,
        uint256 _expiration,
        uint256 _currentPrice,
        uint256 _strikePrice
    ) external view returns (uint256 iv, uint8 decimals);
}
