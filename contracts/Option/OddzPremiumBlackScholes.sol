// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "./IOddzPremium.sol";
import "../Libs/BlackScholes.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract OddzPremiumBlackScholes is IOddzPremium, Ownable {
    // using SafeMath for uint256;
    /**
     * @dev The percentage precision. (100000 = 100%)
     */
    uint256 internal constant PERCENTAGE_PRECISION = 100000;

    function getPremium(PremiumDetails memory _premiumDetails)
        public
        view
        override
        onlyOwner
        returns (uint256 optionPremium)
    {
        optionPremium = BlackScholes.getOptionPrice(
            _premiumDetails.isCallOption,
            _premiumDetails.strikePrice,
            _premiumDetails.currentPrice,
            10**_premiumDetails.precision,
            _premiumDetails.expiration,
            _premiumDetails.iv,
            0,
            0,
            10**_premiumDetails.ivDecimal
        );
        // _amount in wei
        optionPremium = optionPremium * _premiumDetails.amount / 1e18;
    }
}
