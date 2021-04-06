// SPDX-License-Identifier: BSD-4-Clause
pragma solidity =0.8.3;

import "../Oracle/IOddzPriceOracle.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MockOddzPriceOracle is Ownable, IOddzPriceOracle {
    uint256 public oprice;

    constructor(uint256 _price) {
        oprice = _price;
    }

    function getPrice(bytes32 _underlying, bytes32 _strike)
        public
        view
        override
        onlyOwner
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
        bytes32 _strike,
        address _aggregator
    ) public override onlyOwner {}
}
