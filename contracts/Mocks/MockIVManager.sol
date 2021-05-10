// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "../Oracle/OddzIVOracleManager.sol";
import "../Option/IOddzOption.sol";

contract MockIVManager {
    OddzIVOracleManager public ivManager;

    constructor(OddzIVOracleManager _ivManager) {
        ivManager = _ivManager;
    }

    function calculateIv(uint256 _time) public view returns (uint256 iv, uint8 decimals) {
        (iv, decimals) = ivManager.calculateIv("ETH", "USD", _time, 161200000000, 160000000000);
    }
}
