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

    /**
     * @dev USDC fee balance details
     */
    uint256 public txnFeeBalance;
    uint256 public settlementFeeBalance;

    modifier validToken(address _token) {
        require(tokens[_token]._address != address(0), "token not added");
        require(tokens[_token]._active == true, "token is not active");
        _;
    }

    modifier inactiveToken(address _token) {
        require(tokens[_token]._active == false, "token is already active");
        _;
    }

    modifier validStaker(address _token, address _staker){
        require(AbstractTokenStaking(tokens[_token]._stakingContract).isValidStaker(_staker), "invalid staker");
        _;
    }
   
   
    constructor(IERC20 _usdcToken) {
        usdcToken = _usdcToken;
    }

    /**
     * @notice Set lockup duration for the token
     * @param _token token address
     * @param _duration lockup duration
     */
    function setLockupDuration(address _token, uint256 _duration) external onlyOwner validToken(_token) {
        tokens[_token]._lockupDuration = _duration;
    }

    /**
     * @notice Set reward distribution frequency for the token
     * @param _token token address
     * @param _frequency reward frequency
     */
    function setRewardFrequency(address _token, uint256 _frequency) external onlyOwner validToken(_token) {
        tokens[_token]._rewardFrequency = _frequency;
    }

    /**
     * @notice Deactivate token
     * @param _token token address
     */
    function deactivateToken(address _token) external onlyOwner validToken(_token) {
        tokens[_token]._active = false;
        emit TokenDeactivate(_token, tokens[_token]._name);
    }

    /**
     * @notice Activate token
     * @param _token token address
     */
    function activateToken(address _token) external onlyOwner inactiveToken(_token) {
        tokens[_token]._active = true;
        emit TokenActivate(_token, tokens[_token]._name);
    }

    function addToken(
        bytes32 _name,
        address _address,
        address _stakingContract,
        uint256 _rewardFrequency,
        uint256 _lockupDuration,
        uint8 _txnFeeReward,
        uint8 _settlementFeeReward
    ) external onlyOwner {
        require(_address.isContract(), "invalid token address");
        require(_stakingContract.isContract(), "invalid staking contract");
        tokens[_address] = Token(
            _name,
            _address,
            _stakingContract,
            _rewardFrequency,
            _lockupDuration,
            0,
            _txnFeeReward,
            _settlementFeeReward,
            true
        );
        AbstractTokenStaking(_stakingContract).setToken(_address);
        emit TokenAdded(_address, _name, _stakingContract, _rewardFrequency, _lockupDuration);
    }

    function deposit(uint256 _amount, DepositType _depositType) external override {
        if (_depositType == DepositType.Transaction) {
            txnFeeBalance += _amount;
        } else if (_depositType == DepositType.Settlement) {
            settlementFeeBalance += _amount;
        }
        usdcToken.safeTransferFrom(msg.sender, address(this), _amount);
        emit Deposit(msg.sender, _depositType, _amount);
    }

    function stake(address _token, uint256 _amount) external override validToken(_token){
        require(_amount > 0, "invalid amount");

        uint256 date = getPresentDayTimestamp();
        AbstractTokenStaking(tokens[_token]._stakingContract).stake(msg.sender, _amount, date);

        emit Stake(msg.sender, _token, _amount);
    }

    function withdraw(
                address _token, 
                uint256 _amount
                ) 
                external 
                override 
                validToken(_token) 
                validStaker(_token, msg.sender)
                {
        require(
            _amount <= AbstractTokenStaking(tokens[_token]._stakingContract).balance(msg.sender),
            "Amount is too large"
        );

        uint256 date = getPresentDayTimestamp();
        require(
            date - AbstractTokenStaking(tokens[_token]._stakingContract).getLastStakedAt(msg.sender) >=
                tokens[_token]._lockupDuration,
            "cannot withdraw within lockup period"
        );
        _transferRewards(msg.sender, _token, date);
        AbstractTokenStaking(tokens[_token]._stakingContract).burn(msg.sender, _amount);
        usdcToken.safeTransfer(msg.sender, _amount);

        emit Withdraw(msg.sender, _token, _amount);
    }

    function distributeRewards(
                        address _token, 
                        address[] memory _stakers
                        ) 
                        external 
                        override 
                        validToken(_token) 
                        {
        uint256 date = getPresentDayTimestamp();

        if (date - tokens[_token]._lastDistributed < tokens[_token]._rewardFrequency) {
            return;
        }
        if (txnFeeBalance == 0 && settlementFeeBalance == 0) {
            return;
        }
        uint256 txnFeeRewardsAvailable = (txnFeeBalance * tokens[_token]._txnFeeReward) / 100;
        uint256 settlementFeeRewardsAvailable = (settlementFeeBalance * tokens[_token]._settlementFeeReward) / 100;

        uint256 txnFeeRewardsDistributed;
        uint256 settlementFeeRewardsDistributed;

        for (uint256 sid = 0; sid < _stakers.length; sid++) {
            (uint256 txnFeeReward, uint256 settlementFeeReward) =
                _distributeRewards(_token, _stakers[sid], txnFeeRewardsAvailable, settlementFeeRewardsAvailable);

            txnFeeRewardsDistributed += txnFeeReward;
            settlementFeeRewardsDistributed += settlementFeeReward;
        }
        txnFeeBalance -= txnFeeRewardsDistributed;
        settlementFeeBalance -= settlementFeeRewardsDistributed;
        tokens[_token]._lastDistributed = date;
    }

    /**
     * @notice Distribute rewards per staker
     * @param _token Address of the staked token
     * @param _staker Staker Address
     * @param _txnFeeBalance Transaction fee available for token
     * @param _settlementFeeBalance Settlement fee available for token
     */
    function _distributeRewards(
        address _token,
        address _staker,
        uint256 _txnFeeBalance,
        uint256 _settlementFeeBalance
    ) private returns (uint256 txnFeeReward, uint256 settlementFeeReward) {
        Token storage token = tokens[_token];

        txnFeeReward =
            (_txnFeeBalance * AbstractTokenStaking(token._stakingContract).balance(_staker)) /
            AbstractTokenStaking(token._stakingContract).supply();
        settlementFeeReward =
            (_settlementFeeBalance * AbstractTokenStaking(token._stakingContract).balance(_staker)) /
            AbstractTokenStaking(token._stakingContract).supply();

        AbstractTokenStaking(token._stakingContract).addRewards(_staker, txnFeeReward + settlementFeeReward);

        emit DistributeReward(_staker, _token, txnFeeReward + settlementFeeReward);
    }

    /**
     * @notice Transfer rewards to the staker
     * @param _staker Staker Address
     * @param _token Address of the staked token
     * @param _date current date
     */
    function _transferRewards(
        address _staker,
        address _token,
        uint256 _date
    ) private returns (uint256 reward) {
        if (
            _date - AbstractTokenStaking(tokens[_token]._stakingContract).getLastStakedAt(_staker) >=
            tokens[_token]._lockupDuration
        ) {
            reward = AbstractTokenStaking(tokens[_token]._stakingContract).removeRewards(_staker);
            usdcToken.transfer(_staker, reward);
            emit TransferReward(_staker, _token, reward);
        }
    }

    /**
     * @notice Claim rewards by the staker
     * @param _token Address of the staked token
     */
    function claimRewards(address _token) external validToken(_token) validStaker(_token, msg.sender){
        uint256 date = getPresentDayTimestamp();
        require(
            date - AbstractTokenStaking(tokens[_token]._stakingContract).getLastStakedAt(msg.sender) >
                tokens[_token]._lockupDuration,
            "cannot claim rewards within lockup period"
        );
        _transferRewards(msg.sender, _token, date);
    }

    /**
     * @notice Get profit info of the staker
     * @param _token Address of the staked token
     */
    function getProfitInfo(address _token) external view validToken(_token) returns (uint256 profit) {
        profit = AbstractTokenStaking(tokens[_token]._stakingContract).getRewards(msg.sender);
    }

    /**
     * @notice Get day based on timestamp
     * @return date start time of date
     */
    function getPresentDayTimestamp() internal view returns (uint256 date) {
        (uint256 year, uint256 month, uint256 day) = DateTimeLibrary.timestampToDate(block.timestamp);
        date = DateTimeLibrary.timestampFromDate(year, month, day);
    }
}
