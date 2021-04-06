pragma solidity =0.8.3;

interface IOddzPremium {
    /**
     * @dev Premium details
     * @param isCallOption True if the option type is CALL, false for PUT.
     * @param precision current price and strike price precision
     * @param ivDecimal iv precision
     * @param currentPrice underlying asset current price
     * @param strikePrice underlying asset strike price
     * @param expiration Option period in unix timestamp
     * @param amount Option amount
     * @param iv implied volatility of the underlying asset
     */
    struct PremiumDetails {
        bool isCallOption;
        uint8 precision;
        uint8 ivDecimal;
        uint256 currentPrice;
        uint256 strikePrice;
        uint256 expiration;
        uint256 amount;
        uint256 iv;
    }

    /**
     * @notice Function to get option premium
     */
    function getPremium(PremiumDetails memory premiumDetails) external view returns (uint256 premium);
}
