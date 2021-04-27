// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "./IOddzStaking.sol";
import "../Option/OddzOptionManager.sol";
import "../Libs/DateTimeLibrary.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract OddzStaking is ERC20("Oddz Staking token", "sOddz") {
    using SafeERC20 for IERC20;

    OddzOptionManager optionManager;
    IERC20 usdcToken;
    
    mapping(address => NativeToken) nativeTokens;
    mapping(address => LpToken) lpTokens;
    // user => token => bal
    mapping(address => mapping(address => uint256)) balances;
    // user => token => time
    mapping(address => mapping(address => uint256)) lastStakedAt;
    // user => token => rewards
    mapping(address => mapping(address => uint256)) stakerRewards;
    
    address[] public stakers;

    uint256 public txnFeeBalance;
    uint256 public settlementFeeBalance;
    uint256 lockupDuration = 7 days;

    modifier validToken(address _token) {
        require(lpTokens[_token].active == true, "token is not active");
        _;
    }

    modifier inactiveToken(address _token) {
        require(lpTokens[_token].active == false, "token is already active");
        _;
    }

    constructor(
        OddzOptionManager _optionManager,
        IERC20 _usdcToken
        ){
        optionManager = _optionManager;
        usdcToken = _usdcToken;
    }


    function setLockupDuration(uint256 _duration) external onlyOwner{
        lockupDuration = _duration/1 days;
    }

    function setRewardRate(address _token, uint256 _rate) external onlyOwner{
        lpTokens[_token]._rewardRate = _rate;
    }

    function deactivateToken(address _token) external onlyOwner{
        lpTokens[_token]._active = false;
        emit LpTokenDeactivate(_token, block.timestamp);
    }
    function activateToken(address _token) external onlyOwner{
        lpTokens[_token]._active = true;
    }

    function addLpToken(address _token, uint256 _rewardRate, uint256 _tokenRewards, uint256 _lockupDuration) external {
        lpTokens[_token] = LpToken(_token, _rewardRate, _tokenReward, _lockupDuration);
    }

    function addNativeToken(
                    address _token, 
                    uint256 _rewardRate, 
                    uint256 _lockupDuration, 
                    uint256 _txnFeeReward, 
                    uint256 _settlementFeeReward
                    ) external{
        nativeTokens[_token] = NativeToken(_token, _rewardRate, _txnFeeReward, _settlementFeeReward,  _lockupDuration);
    }


    function deposit(uint256 _amount, DepositType _depositType) external {
        if(_depositType == DepositType.Transaction){
            txnFeeBalance += _amount;
        }else if (_depositType == DepositType.Transaction){
            settlementFeeBalance += _amount;
        }

        emit Deposit(block.timestamp, _amount, _depositType);
    }

    function stake(address _token, uint256 _amount) external validToken(_token){
        require(_amount > 0, "invalid amount");

        uint256 _date = getPresentDayTimestamp();
        _mint(msg.sender, _amount);
        IERC20(_token).transferFrom(msg.sender, address(this), _amount);
        balances[msg.sender][_token] += _amount;
        lastStakedAt[msg.sender][_token] = _date;

        emit Stake(msg.sender, _amount, block.timestamp);
    }

    function withdraw(address _token, uint256 _amount) external returns(uint256 burn){
        require(_amount < balanceOf(msg.sender), "Amount is too large");

        burn =_amount + claimRewards(_token);
        _burn(msg.sender, _burn);
        usdcToken.safeTransfer(msg.sender, _amount);
        balances[msg.sender][_token] -= _amount;

    }


    function distributeRewards(address _token, address[] memory _stakers) external {
        
        for (uint256 sid = 0; _stakers.length; sid++){
            _distributeRewards(_token, _stakers[sid]);
        }
    }

    function _distributeRewards(address _token, address _staker) private {
        uint256 reward;
        uint256 _date = getPresentDayTimestamp();
        if(_token == nativeTokens[_token]._address){
            _distributeRewardsToNativeHolders(_token, _staker, _date);
        }else {
            _distributeRewardsToLpHolders(_token, _staker, _oddz);
        }
    }

    function _distributeRewardsToNativeHolders(address _token, address _staker, uint256 _date) private {
        if(_date - nativeTokens[_token]._lastDistributed < nativeTokens[_token]._rewardRate){
            return;
        }
        
        uint256 reward = txnFeeBalance * _token._txnFeeReward * balances[_staker][_token._address];
        reward += settlementFeeBalance * _token._settlementFeeReward * balances[_staker][_token._address];
        stakerRewards[_staker][_token] +=reward;
         if(lastStakedAt[_staker][_token] >= nativeTokens[_token]._lockupDuration){
            _transferRewards(_staker, _token);
        }
        
    }

    function _distributeRewardsToLpHolders(address _token, address _staker, uint256 _oddz) private {
        if(_date - lpTokens[_token]._lastDistributed < lpTokens[_token].rewardRate){
            return;
        }
        
        uint256 reward = 0;
        stakerRewards[staker][token] += reward;
         if(_date - lastStakedAt[_staker][_token] >= lpTokens[_token]._lockupDuration){
            _transferRewards(_staker,_token);
        }
    }

    function _transferRewards(address _staker, address _token) private{
        _mint(_staker, stakerRewards[_staker][token]);
        stakerRewards[_staker][token]=0;
    }

    function claimRewards(address _token) external returns (uint256 reward){
        if(_date - lpTokens[_token]._lastDistributed >= lpTokens[_token].rewardRate){
            reward = rewards[msg.sender][_token];
            _transferRewards(msg.sender, _token);
            rewards[msg.sender][_token] = 0;
        }
        
    }

    /**
     * @dev get day based on the timestamp
     */
    function getPresentDayTimestamp() internal view returns (uint256 activationDate) {
        (uint256 year, uint256 month, uint256 day) = DateTimeLibrary.timestampToDate(block.timestamp);
        activationDate = DateTimeLibrary.timestampFromDate(year, month, day);
    }

    



}