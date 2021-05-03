// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "./IOddzStaking.sol";
import "./AbstractTokenStaking.sol";
import "../Libs/DateTimeLibrary.sol";
import "./OddzTokenStaking.sol";
import "./ODevTokenStaking.sol";
import "./OUsdTokenStaking.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "hardhat/console.sol";

contract OddzStakingManager is Ownable, IOddzStaking {
    using Address for address;
    using SafeERC20 for IERC20;

    IERC20 usdcToken;

    mapping(address => Token) public tokens;


    uint256 public txnFeeBalance;
    uint256 public settlementFeeBalance;

    modifier validToken(address _token) {
        require(_token.isContract(), "invalid token address");
        require(tokens[_token]._active == true, "token is not active");
        _;
    }

    modifier inactiveToken(address _token) {
        require(tokens[_token]._active == false, "token is already active");
        _;
    }

    constructor(IERC20 _usdcToken) {
        usdcToken = _usdcToken;
    }

    function setLockupDuration(address _token, uint256 _duration) external onlyOwner {
        require(_token.isContract(), "invalid token address");
        tokens[_token]._lockupDuration = _duration;
    }

    function setRewardFrequency(address _token, uint256 _rate) external onlyOwner {
        require(_token.isContract(), "invalid token address");
        tokens[_token]._rewardFrequency = _rate;
    }

    function deactivateToken(address _token) external onlyOwner validToken(_token) {
        tokens[_token]._active = false;
        emit TokenDeactivate(_token, tokens[_token]._name);
    }

    function activateToken(address _token) external onlyOwner inactiveToken(_token) {
        tokens[_token]._active = true;
        emit TokenActivate(_token, tokens[_token]._name,);
    }

    function addToken(
        bytes32 _name,
        address _address,
        address _stakingContract,
        uint256 _rewardFrequency,
        uint256 _lockupDuration,
        uint256 _txnFeeReward,
        uint256 _settlementFeeReward
    ) external onlyOwner {
        require(_address.isContract(), "invalid token address");
        require(_stakingContract.isContract(), "invalid staking contract");
        tokens[_address] = Token(
            _name,
            _address,
            _stakingContract,
            _rewardFrequency,
            _txnFeeReward,
            _settlementFeeReward,
            _lockupDuration,
            0,
            true
        );
        emit TokenAdded(_address, _name, _stakingContract, _rewardFrequency, _lockupDuration);
    }

    
    function deposit(uint256 _amount, DepositType _depositType) external override  { 
        if (_depositType == DepositType.Transaction) {
            txnFeeBalance += _amount;
        } else if (_depositType == DepositType.Settlement) {
            settlementFeeBalance += _amount;
        }else{
            revert("invalid deposit type");
        }
        usdcToken.transferFrom(msg.sender, address(this), _amount);
        emit Deposit(msg.sender, _depositType, _amount);
    }

    function stake(address _token, uint256 _amount) external override validToken(_token) {
        require(_amount > 0, "invalid amount");

        uint256 date = getPresentDayTimestamp();
        AbstractTokenStaking(tokens[_token]._stakingContract).stake(_token, msg.sender, _amount, date);

        emit Stake(msg.sender, _token, _amount);
    }

    function withdraw(address _token, uint256 _amount) external override {
        require(_token.isContract(), "invalid token address");
        require(
            _amount < AbstractTokenStaking(tokens[_token]._stakingContract).balance(msg.sender), 
            "Amount is too large");

        uint256 date = getPresentDayTimestamp();
        _transferRewards(msg.sender, _token, date);
        AbstractTokenStaking(tokens[_token]._stakingContract).burn(msg.sender, _amount);
        usdcToken.safeTransfer(msg.sender, _amount);
    }

    function distributeRewards(address _token, address[] memory _stakers) external override {
        require(_token.isContract(), "invalid token address");

        for (uint256 sid = 0; sid < _stakers.length; sid++) {
            _distributeRewards(_token, _stakers[sid]);
        }
    }

    function _distributeRewards(address _token, address _staker) private {
        uint256 date = getPresentDayTimestamp();
        Token storage token = tokens[_token];

        if (date - token._lastDistributed < token._rewardFrequency) {
            return;
        }

        uint256 reward = txnFeeBalance 
                        * token._txnFeeReward 
                        * AbstractTokenStaking(token._stakingContract).balance(_staker);
        reward += settlementFeeBalance 
                  * token._settlementFeeReward 
                  * AbstractTokenStaking(token._stakingContract).balance(_staker);
        AbstractTokenStaking(token._stakingContract).addRewards(_staker, reward);

        emit DistributeReward(_staker, _token, reward);
    }

    function _transferRewards(
        address _staker,
        address _token,
        uint256 _date
    ) private returns (uint256 reward) {
        if (
            _date - AbstractTokenStaking(tokens[_token]._stakingContract).getLastStakedAt(_staker) 
            >= 
            tokens[_token]._lockupDuration
            ) {

            reward = AbstractTokenStaking(tokens[_token]._stakingContract).removeRewards(_staker);    
            usdcToken.transfer(_staker, reward);
            emit TransferReward(_staker, _token, reward);
        }
    }

    function claimRewards(address _token) external { 
        require(_token.isContract(), "invalid token address");

        uint256 date = getPresentDayTimestamp();
        _transferRewards(msg.sender, _token, date);
    }

    function getProfitInfo(address _token) external view returns (uint256 profit) {
        require(_token.isContract(), "invalid token address");

        profit = AbstractTokenStaking(tokens[_token]._stakingContract).getRewards(msg.sender); 
            
    }

    /**
     * @dev get day based on the timestamp
     */
    function getPresentDayTimestamp() internal view returns (uint256 activationDate) {
        (uint256 year, uint256 month, uint256 day) = DateTimeLibrary.timestampToDate(block.timestamp);
        activationDate = DateTimeLibrary.timestampFromDate(year, month, day);
    }
}
