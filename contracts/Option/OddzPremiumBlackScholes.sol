pragma solidity ^0.7.0;

import "./IOddzPremium.sol";
import "../Libs/BlackScholes.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

contract OddzPremiumBlackScholes is IOddzPremium, Ownable {
    using SafeMath for uint256;
    /**
     * @dev The percentage precision. (100000 = 100%)
     */
    uint256 internal constant PERCENTAGE_PRECISION = 100000;

    /**
     * @notice Function to get option premium using Black Scholes model
     * @param _isCallOption True if the option type is CALL, false for PUT.
     * @param _precision current price and strike price precision
     * @param _currentPrice underlying asset current price
     * @param _strikePrice underlying asset strike price
     * @param _expiration Option period in unix timestamp
     * @param _amount Option amount
     * @param _iv implied volatility of the underlying asset
     */
    function getPremium(
        bool _isCallOption,
        uint8 _precision,
        uint256 _currentPrice,
        uint256 _strikePrice,
        uint256 _expiration,
        uint256 _amount,
        uint256 _iv
    ) public view override onlyOwner returns (uint256 optionPremium) {
        optionPremium = BlackScholes.getOptionPrice(
            _isCallOption,
            _strikePrice,
            _currentPrice,
            10**_precision,
            _expiration,
            _iv,
            0,
            0,
            PERCENTAGE_PRECISION
        );
        // _amount in wei
        optionPremium = optionPremium.mul(_amount).div(1e18);
    }
}
