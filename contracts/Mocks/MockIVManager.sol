pragma solidity ^0.7.0;

import "../Oracle/OddzIVOracleManager.sol";
import "../Option/IOddzOption.sol";

contract MockIVManager {
    OddzIVOracleManager public ivManager;

    constructor(OddzIVOracleManager _ivManager) {
        ivManager = _ivManager;
    }

    function calculateIv(uint256 _time) public view returns (uint256 iv, uint8 decimals) {
        uint256 cp = 1600 * (10**8);
        uint256 sp = 1700 * (10**8);
        (iv, decimals) = ivManager.calculateIv("ETH", "USD", IOddzOption.OptionType.Call, _time, cp, sp);
    }
}
