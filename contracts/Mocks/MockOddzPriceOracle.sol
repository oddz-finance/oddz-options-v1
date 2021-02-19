// SPDX-License-Identifier: BSD-4-Clause
pragma solidity ^0.7.0;

import "../Oracle/IOddzPriceOracle.sol";

contract MockOddzPriceOracle is IOddzPriceOracle {
    uint256 public price;

    constructor(uint256 _price) {
        price = _price;
    }

    function getUnderlyingPrice(uint32 _asset, uint32 _strikeAsset) public view override returns (uint256) {
        return price;
    }

    function setUnderlyingPrice(uint256 _price) external {
        price = _price;
    }
}
