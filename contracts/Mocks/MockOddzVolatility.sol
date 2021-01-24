// SPDX-License-Identifier: BSD-4-Clause
pragma solidity ^0.7.0;

import "../Oracle/IOddzVolatility.sol";

contract MockOddzVolatility is IOddzVolatility {
    uint256 public iv;
    uint256 public decimal;

    function calculateIv(
        uint32 _undelying,
        IOddzOption.OptionType _optionType,
        uint256 _expiration,
        uint256 _currentPrice,
        uint256 _strikePrice
    ) public view override returns (uint256, uint256) {
        return (1, 1);
    }
}
