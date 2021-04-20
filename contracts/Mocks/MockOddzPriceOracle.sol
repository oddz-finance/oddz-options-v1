// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "../Oracle/IOddzPriceOracle.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MockOddzPriceOracle is Ownable, IOddzPriceOracle {
    uint256 public price;
    uint8 public decimals = 8;

    constructor(uint256 _price) {
        price = _price;
    }

    function getPrice(bytes32 _underlying, bytes32 _strike)
        public
        view
        override
        onlyOwner
        returns (uint256 , uint8 )
    {
        return(price,decimals);
    }

    function setUnderlyingPrice(uint256 _price) external {
        price = _price;
    }
    function setDecimals(uint8 _decimals) external {
        decimals = _decimals;
    }

    function setPairContract(
        bytes32 _underlying,
        bytes32 _strike,
        address _aggregator
    ) public override onlyOwner {}
}
