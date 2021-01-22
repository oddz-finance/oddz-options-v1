// SPDX-License-Identifier: BSD-4-Clause
pragma solidity ^0.7.0;

import "../Oracle/IOddzPriceOracle.sol";

contract MockOddzPriceOracle is IOddzPriceOracle {
    uint256 public price;
    constructor (uint256 _price) {
        price = _price;
    }

    function getPrice(uint256 asset) public override view returns (uint256) {
        // should get the price for given asset
        return price;
    }

    function getUnderlyingPrice(uint256 cToken) public override view returns (uint256) {
        return price;
    }
}
