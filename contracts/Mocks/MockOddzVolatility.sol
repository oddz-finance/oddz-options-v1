// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "../Oracle/IOddzVolatilityOracle.sol";

contract MockOddzVolatility is IOddzVolatilityOracle {

    uint256 iv = 180000;
    uint8 decimals = 5;

    function getIv(
        bytes32 _underlying,
        bytes32 _strike,
        uint256 _expiration,
        uint256 _currentPrice,
        uint256 _strikePrice
    ) public view override returns (uint256, uint8) {
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
}
