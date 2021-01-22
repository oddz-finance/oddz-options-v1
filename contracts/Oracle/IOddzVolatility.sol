// SPDX-License-Identifier: BSD-4-Clause
pragma solidity ^0.7.0;

import "../Option/IOddzOption.sol";

/**
 * @title Implied volatility caculation for Oddz options
 * @notice Oddz options IV
 */
interface IOddzVolatility {
    /**
     * @notice Function to calculate the Implied volatility of the underlying asset
     * @param _underlying underlying asset
     * @param _optionType type of the option
     * @param _expiration expiration time in unix timestamp
     * @param _currentPrice current price of the underlying asset
     * @param _strikePrice strike price of the option
     * @return iv implied volatility for the underlying asset
     * @return decimal implied volatility decimal
     */
    function calculateIv(
        uint32 _underlying,
        IOddzOption.OptionType _optionType,
        uint256 _expiration,
        uint256 _currentPrice,
        uint256 _strikePrice
    ) external view returns (uint256 iv, uint256 decimal);
}
