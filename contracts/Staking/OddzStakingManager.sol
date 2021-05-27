// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "./IOddzStaking.sol";
import "./AbstractTokenStaking.sol";
import "../Libs/DateTimeLibrary.sol";
import "./OddzTokenStaking.sol";
import "./OUsdTokenStaking.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract OddzStakingManager is Ownable, IOddzStaking {
    using Address for address;
    using SafeERC20 for IERC20;

    IERC20 public oddzToken;

    mapping(address => Token) public tokens;
    Token[] public tokensList;

    modifier validToken(address _token) {
        require(tokens[_token]._address != address(0), "Staking: token not added");
        require(tokens[_token]._active == true, "Staking: token is not active");
        _;
    }

    modifier inactiveToken(address _token) {
        require(tokens[_token]._active == false, "Staking: token is already active");
        _;
    }

    modifier validStaker(address _token, address _staker) {
        require(
            AbstractTokenStaking(tokens[_token]._stakingContract).isValidStaker(_staker),
            "Staking: invalid staker"
        );
        _;
    }

    modifier validDuration(uint256 _duration) {
        require(_duration >= 1 days, "Staking: invalid staking duration");
        _;
    }

    constructor(IERC20 _oddzToken) {
        oddzToken = _oddzToken;
    }

    /**
     * @notice Set lockup duration for the token
     * @param _token token address
     * @param _duration lockup duration
     */
    function setLockupDuration(address _token, uint256 _duration)
        external
        onlyOwner
        validToken(_token)
        validDuration(_duration)
    {
        tokens[_token]._lockupDuration = _duration;
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

    function deposit(uint256 _amount, DepositType _depositType) external override {
        oddzToken.safeTransferFrom(msg.sender, address(this), _amount);

        uint256 date = DateTimeLibrary.getPresentDayTimestamp();
        uint8 totalPerc;
        for (uint256 i = 0; i < tokensList.length; i++) {
            if (!tokensList[i]._active) continue;
            uint8 feePerc;
            if (_depositType == DepositType.Transaction) feePerc = tokensList[i]._txnFeeReward;
            else feePerc = tokensList[i]._settlementFeeReward;
            totalPerc += feePerc;

            AbstractTokenStaking(tokensList[i]._stakingContract).allocateRewards(date, (_amount * feePerc) / 100);
        }
        require(totalPerc == 100, "Staking: invalid fee allocation for tokens");

        emit Deposit(msg.sender, _depositType, _amount);
    }

    function addToken(
        bytes32 _name,
        address _address,
        address _stakingContract,
        uint256 _lockupDuration,
        uint8 _txnFeeReward,
        uint8 _settlementFeeReward
    ) external onlyOwner validDuration(_lockupDuration) {
        require(_address.isContract(), "Staking: invalid token address");
        require(_stakingContract.isContract(), "Staking: invalid staking contract");
        tokens[_address] = Token(
            _name,
            _address,
            _stakingContract,
            _lockupDuration,
            0,
            _txnFeeReward,
            _settlementFeeReward,
            true
        );
        AbstractTokenStaking(_stakingContract).setToken(_address);
        tokensList.push(tokens[_address]);

        emit TokenAdded(_address, _name, _stakingContract, _lockupDuration);
    }

    function stake(address _token, uint256 _amount) external override validToken(_token) {
        require(_amount > 0, "Staking: invalid amount");
        AbstractTokenStaking(tokens[_token]._stakingContract).stake(
            msg.sender,
            _amount,
            DateTimeLibrary.getPresentDayTimestamp()
        );

        emit Stake(msg.sender, _token, _amount);
    }

    function withdraw(address _token, uint256 _amount)
        external
        override
        validToken(_token)
        validStaker(_token, msg.sender)
    {
        require(
            _amount <= AbstractTokenStaking(tokens[_token]._stakingContract).balance(msg.sender),
            "Staking: Amount is too large"
        );

        uint256 date = DateTimeLibrary.getPresentDayTimestamp();
        require(
            date - AbstractTokenStaking(tokens[_token]._stakingContract).getLastStakedAt(msg.sender) >=
                tokens[_token]._lockupDuration,
            "Staking: cannot withdraw within lockup period"
        );
        _transferRewards(msg.sender, _token, date);
        AbstractTokenStaking(tokens[_token]._stakingContract).unstake(msg.sender, _amount, date);

        emit Withdraw(msg.sender, _token, _amount);
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
            reward = AbstractTokenStaking(tokens[_token]._stakingContract).withdrawRewards(_staker, _date);
            oddzToken.safeTransfer(_staker, reward);

            emit TransferReward(_staker, _token, reward);
        }
    }

    /**
     * @notice Claim rewards by the staker
     * @param _token Address of the staked token
     */
    function claimRewards(address _token) external validToken(_token) validStaker(_token, msg.sender) {
        uint256 date = DateTimeLibrary.getPresentDayTimestamp();
        require(
            date - AbstractTokenStaking(tokens[_token]._stakingContract).getLastStakedAt(msg.sender) >
                tokens[_token]._lockupDuration,
            "Staking: cannot claim rewards within lockup period"
        );
        _transferRewards(msg.sender, _token, date);
    }

    /**
     * @notice Get profit info of the staker
     * @param _token Address of the staked token
     */
    function getProfitInfo(address _token) external view validToken(_token) returns (uint256 profit) {
        profit = AbstractTokenStaking(tokens[_token]._stakingContract).getRewards(
            msg.sender,
            DateTimeLibrary.getPresentDayTimestamp()
        );
    }
}