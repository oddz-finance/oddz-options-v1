// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

interface IOddzPriceOracleManager {
    function getUnderlyingPrice(bytes32 _underlying, bytes32 _strike)
        external
        view
        returns (uint256 price, uint8 decimal);
}
