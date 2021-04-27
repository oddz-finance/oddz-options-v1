// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "./IOddzStaking.sol";
import "../Option/OddzOptionManager.sol";

contract OddzStaking{

    OddzOptionManager optionManager;
    mapping(address => Token) tokens;
    // user => token => bal
    mapping(address => mapping(address => uint256)) balances;
    uint256 lockupDuration = 7 days;

    constructor(OddzOptionManager _optionManager){
        optionManager = _optionManager;
    }

    modifier validToken(address _token) {
        require(tokens[_token].active == true, "token is not active");
        _;
    }

    modifier inactiveToken(address _token) {
        require(tokens[_token].active == false, "token is already active");
        _;
    }


    function setLockupDuration(uint256 _duration) external onlyOwner{
        lockupDuration = _duration/1 days;
    }

    function setRewardRate(address _token, uint256 _rate) external onlyOwner{
        tokens[_token]._rewardRate = _rate;
    }

    function deactivateToken(address _token) external onlyOwner{
        tokens[_token]._active = false;
    }
    function activateToken(address _token) external onlyOwner{
        token[_token]._active = true;
    }

    function deposit(address _token, uint256 _amount) external validToken(_token){
        require(_amount > 0, "invalid amount");
        balances[msg.sender][_token] += _amount;
        IERC20(_token).


    }

    function withdraw



}