// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

interface IOddzOptionPremiumManager {
    /**
     * @notice Function to get option premium
     * @param _isCallOption True if the option type is CALL, false for PUT.
     * @param _precision current price and strike price precision
     * @param _currentPrice underlying asset current price
     * @param _strikePrice underlying asset strike price
     * @param _expiration Option period in unix timestamp
     * @param _amount Option amount
     * @param _iv implied volatility of the underlying asset
     * @param _model option premium model identifier
     * @return premium option premium amount
     */
    function getPremium(
        bool _isCallOption,
        uint8 _precision,
        uint8 _ivDecimal,
        uint256 _currentPrice,
        uint256 _strikePrice,
        uint256 _expiration,
        uint256 _amount,
        uint256 _iv,
        bytes32 _model
    ) external view returns (uint256 premium);
}
