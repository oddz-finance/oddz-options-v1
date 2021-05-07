// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "../Oracle/IOddzPriceOracle.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MockOddzPriceOracle is Ownable, IOddzPriceOracle {
    uint256 public price;
    uint8 public decimals = 8;
    uint256 public updatedAt =uint256(block.timestamp);
    uint256 public delayInSeconds = 30 * 60;
    constructor(uint256 _price) {
        price = _price;
    }

    function getPrice(bytes32 _underlying, bytes32 _strike) public view override onlyOwner returns (uint256, uint8) {
        require(updatedAt > uint256(block.timestamp) - delayInSeconds, "Chain link Price Out Of Sync");

        return (price, decimals);
    }

    function setUnderlyingPrice(uint256 _price) external {
        price = _price;
    }

    function setDecimals(uint8 _decimals) external {
        decimals = _decimals;
    }

    function setUpdatedAt(uint256 _delay) external {
        updatedAt = uint256(block.timestamp) - _delay;
    }


    function setPairContract(
        bytes32 _underlying,
        bytes32 _strike,
        address _aggregator
    ) public override onlyOwner {}
}
