// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "../Oracle/IOddzVolatilityOracle.sol";

contract MockOddzVolatility is IOddzVolatilityOracle {
    function getIv(
        bytes32 _undelying,
        bytes32 _strike,
        bool _type,
        uint256 _expiration,
        uint256 _currentPrice,
        uint256 _strikePrice
    ) public pure override returns (uint256 iv, uint8 decimals) {
        iv = 180000;
        decimals = 5;
    }

    function setPairContract(
        bytes32 _underlying,
        bytes32 _strike,
        address _aggregator,
        uint8 _aggregatorPeriod
    ) public override {}
}
