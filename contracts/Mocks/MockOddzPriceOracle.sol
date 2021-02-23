// SPDX-License-Identifier: BSD-4-Clause
pragma solidity ^0.7.0;

import "../Oracle/IOddzPriceOracle.sol";

contract MockOddzPriceOracle is IOddzPriceOracle {
    uint256 public oprice;

    constructor(uint256 _price) {
        oprice = _price;
    }

    function getPrice(bytes32 _asset, bytes32 _strikeAsset)
        public
        view
        override
        returns (uint256 price, uint8 decimals)
    {
        price = oprice;
        decimals = 8;
    }

    function setUnderlyingPrice(uint256 _price) external {
        oprice = _price;
    }

    function setPairContract(
        bytes32 _underlying,
        bytes32 _strikeAsset,
        address _aggregator
    ) public override {}
}
