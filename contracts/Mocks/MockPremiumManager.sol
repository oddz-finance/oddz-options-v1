pragma solidity ^0.7.0;

import "../Option/OddzOptionPremiumManager.sol";

contract MockPremiumManager {
    OddzOptionPremiumManager public premiumManager;

    constructor(OddzOptionPremiumManager _premiumManager) {
        premiumManager = _premiumManager;
    }

    function getPremium() public view returns (uint256 optionPremium) {
        uint256 cp = 1600 * (10**8);
        uint256 sp = 1700 * (10**8);
        optionPremium = premiumManager.getPremium(true, 8, cp, sp, 86400, 1e18, 180000, "B_S");
    }
}
