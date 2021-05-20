// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "../Oracle/IOddzPriceOracleManager.sol";

contract MockPriceOracleUser {
    IOddzPriceOracleManager public priceOracleManager;

    constructor(IOddzPriceOracleManager _priceOracleManager) {
        priceOracleManager = _priceOracleManager;
    }

    function getPrice() public view returns (uint256 price, uint8 decimal) {
        (price, decimal) = priceOracleManager.getUnderlyingPrice("ETH", "USD");
    }
}
