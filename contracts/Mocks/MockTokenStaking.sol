// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "../Staking/OddzTokenStaking.sol";
import "../Libs/DateTimeLibrary.sol";

contract MockTokenStaking {
    OddzTokenStaking staking;

    constructor(OddzTokenStaking _staking) {
        staking = _staking;
    }

    function stake() public {
        staking.stake(msg.sender, 1000, DateTimeLibrary.getPresentDayTimestamp());
    }

    function burn() public {
        staking.unstake(msg.sender, 1000, DateTimeLibrary.getPresentDayTimestamp());
    }

    function setToken(address _token) public {
        staking.setToken(_token);
    }
}
