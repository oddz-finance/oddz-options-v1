// SPDX-License-Identifier: BSD-4-Clause
pragma solidity ^0.7.0;

import "../Oracle/IOddzVolatilityOracle.sol";

contract MockOddzVolatility is IOddzVolatilityOracle {
    uint256 public iv;
    uint256 public decimal;

    function getIv(
        bytes32 _undelying,
        bytes32 _strike,
        bool _type,
        uint256 _expiration,
        uint256 _currentPrice,
        uint256 _strikePrice
    ) public view override returns (uint256 iv, uint8 decimal) {
        iv = 180000;
        decimal = 5;
    }

    function setPairContract(
        bytes32 _underlying,
        bytes32 _strike,
        address _aggregator
    ) public override {}
}
