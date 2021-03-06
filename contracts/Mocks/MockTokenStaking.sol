// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "../Staking/OddzTokenStaking.sol";

contract MockTokenStaking {
    OddzTokenStaking staking;

    constructor(OddzTokenStaking _staking) {
        staking = _staking;
    }

    function stake() public {
        staking.stake(msg.sender, 1000);
    }

    function burn() public {
        staking.unstake(msg.sender, 1000);
    }
}
