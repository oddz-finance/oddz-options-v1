// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "../Oracle/IOddzVolatilityOracle.sol";

contract MockOddzVolatility is IOddzVolatilityOracle {
    uint256 iv = 180000;
    uint8 decimals = 5;
    uint256 public updatedAt = uint256(block.timestamp);
    uint256 public delayInSeconds = 30 * 60;

    function getIv(
        bytes32 _underlying,
        bytes32 _strike,
        uint256 _expiration,
        uint256 _currentPrice,
        uint256 _strikePrice
    ) public view override returns (uint256, uint8) {
        require(updatedAt > uint256(block.timestamp) - delayInSeconds, "Chain link IV Out Of Sync");

        return (iv, decimals);
    }

    function setIv(uint256 _iv, uint8 _decimals) public {
        iv = _iv;
        decimals = _decimals;
    }

    function setPairContract(
        bytes32 _underlying,
        bytes32 _strike,
        address _aggregator,
        uint8 _aggregatorPeriod
    ) public override {}

    function setUpdatedAt(uint256 _delay) external {
        updatedAt = uint256(block.timestamp) - _delay;
    }
}
