// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "./IOddzStakingManager.sol";
import "./IOddzTokenStaking.sol";
import "../Libs/DateTimeLibrary.sol";

contract OddzStakingManager is AccessControl, IOddzStakingManager {
    using Address for address;
    using SafeERC20 for IERC20;

    /**
     * @dev Token
     * @param _address Address of the token
     * @param _stakingContract staking contract address for the token
     * @param _lockupDuration Lock up duration for the token withdrawal
     * @param _rewardsLockupDuration Lock up duration for the rewards withdrawal
     * @param _txnFeeReward Percentage txn fee reward
     * @param _settlementFeeReward Percentage settlement fee reward
     * @param _allotedReward Percentage oddz reward alloted
     * @param _active Token is active or not
     */
    struct Token {
        IERC20 _address;
        IOddzTokenStaking _stakingContract;
        uint256 _lockupDuration;
        uint256 _rewardsLockupDuration;
        uint8 _txnFeeReward;
        uint8 _settlementFeeReward;
        uint8 _allotedReward;
        bool _active;
    }

    /**
     * @dev Emitted when new token is added
     * @param _address Address of the token
     * @param _stakingContract Stacking contract address
     * @param _lockupDuration Lock up duration for the token withdrawal
     */
    event TokenAdded(address indexed _address, address indexed _stakingContract, uint256 _lockupDuration);

    /**
     * @dev Emitted when token is deactivated
     * @param _address Address of the token
     */
    event TokenDeactivate(address indexed _address);

    /**
     * @dev Emitted when token is activated
     * @param _address Address of the token
     */
    event TokenActivate(address indexed _address);

    /**
     * @dev Emitted when txn fee and settlement fee is deposited
     * @param _sender Address of the depositor
     * @param _type  DepositType (Transaction or Settlement)
     * @param _amount Amount deposited
     */
    event Deposit(address indexed _sender, DepositType indexed _type, uint256 _amount);

    /**
     * @dev Emitted when rewards are claimed
     * @param _staker Address of the staker
     * @param _token  Address of the token staked
     * @param _amount Amount rewarded
     */
    event Claim(address indexed _staker, address indexed _token, uint256 _amount);

    /**
     * @dev Emitted when tokens are staked
     * @param _staker Address of the staker
     * @param _token  Address of the token staked
     * @param _amount Amount staked
     */
    event Stake(address indexed _staker, address indexed _token, uint256 _amount);

    /**
     * @dev Emitted when tokens are withdrawn
     * @param _staker Address of the staker
     * @param _token  Address of the token staked
     * @param _amount Amount withdrawn
     */
    event Withdraw(address indexed _staker, address indexed _token, uint256 _amount);

    /**
     * @dev Emitted when rewards are transferred
     * @param _staker Address of the staker
     * @param _token  Address of the token staked
     * @param _reward Rewards transferred
     */
    event TransferReward(address indexed _staker, address indexed _token, uint256 _reward);

    bytes32 public constant TIMELOCKER_ROLE = keccak256("TIMELOCKER_ROLE");

    IERC20 public oddzToken;
    mapping(IERC20 => Token) public tokens;
    Token[] public tokensList;

    modifier validToken(IERC20 _token) {
        _validateToken(_token);
        _;
    }

    modifier tokenNotAdded(IERC20 _token) {
        require(address(tokens[_token]._address) == address(0), "Staking: token already added");
        _;
    }

    modifier inactiveToken(IERC20 _token) {
        require(tokens[_token]._active == false, "Staking: token is already active");
        _;
    }

    modifier validStaker(IERC20 _token, address _staker) {
        require(tokens[_token]._stakingContract.isValidStaker(_staker), "Staking: invalid staker");
        _;
    }

    modifier validDuration(uint256 _duration) {
        require(_duration >= 1 days && _duration <= 30 days, "Staking: invalid staking duration");
        _;
    }

    modifier onlyOwner(address _address) {
        require(hasRole(DEFAULT_ADMIN_ROLE, _address), "caller has no access to the method");
        _;
    }

    modifier onlyTimeLocker(address _address) {
        require(hasRole(TIMELOCKER_ROLE, _address), "caller has no access to the method");
        _;
    }

    constructor(IERC20 _oddzToken) {
        oddzToken = _oddzToken;
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(TIMELOCKER_ROLE, msg.sender);
        _setRoleAdmin(TIMELOCKER_ROLE, TIMELOCKER_ROLE);
    }

    function setTimeLocker(address _address) external {
        require(_address != address(0), "Invalid timelocker address");
        grantRole(TIMELOCKER_ROLE, _address);
    }

    function removeTimeLocker(address _address) external {
        revokeRole(TIMELOCKER_ROLE, _address);
    }

    /**
     * @notice Set lockup duration for the token
     * @param _token token address
     * @param _duration lockup duration
     */
    function setLockupDuration(IERC20 _token, uint256 _duration)
        external
        onlyTimeLocker(msg.sender)
        validToken(_token)
        validDuration(_duration)
    {
        tokens[_token]._lockupDuration = _duration;
    }

    /**
     * @notice Set reward lockup duration for the token
     * @param _token token address
     * @param _duration lockup duration
     */
    function setRewardLockupDuration(IERC20 _token, uint256 _duration)
        external
        onlyTimeLocker(msg.sender)
        validToken(_token)
        validDuration(_duration)
    {
        tokens[_token]._rewardsLockupDuration = _duration;
    }

    function setRewardPercentages(
        IERC20[] calldata _tokens,
        uint8[] calldata _txnFeeRewards,
        uint8[] calldata _settlementFeeRewards,
        uint8[] calldata _allotedRewards
    ) public onlyTimeLocker(msg.sender) {
        require(
            _tokens.length == _txnFeeRewards.length &&
                _tokens.length == _settlementFeeRewards.length &&
                _tokens.length == _allotedRewards.length,
            "Staking: invalid input of rewards"
        );
        uint8 totalTxnFee;
        uint8 totalSettlementFee;
        uint8 totalAllotedFee;
        for (uint8 i = 0; i < _tokens.length; i++) {
            _validateToken(_tokens[i]);
            tokens[_tokens[i]]._txnFeeReward = _txnFeeRewards[i];
            totalTxnFee += _txnFeeRewards[i];
            tokens[_tokens[i]]._settlementFeeReward = _settlementFeeRewards[i];
            totalSettlementFee += _settlementFeeRewards[i];
            tokens[_tokens[i]]._allotedReward = _allotedRewards[i];
            totalAllotedFee += _allotedRewards[i];
        }
        require(
            totalTxnFee == 100 && totalSettlementFee == 100 && totalAllotedFee == 100,
            "Staking: invalid reward percentages"
        );
    }

    /**
     * @notice Deactivate token
     * @param _token token address
     */
    function deactivateToken(
        IERC20 _token,
        IERC20[] calldata _tokens,
        uint8[] calldata _txnFeeRewards,
        uint8[] calldata _settlementFeeRewards,
        uint8[] calldata _allotedRewards
    ) external onlyTimeLocker(msg.sender) validToken(_token) {
        tokens[_token]._active = false;
        setRewardPercentages(_tokens, _txnFeeRewards, _settlementFeeRewards, _allotedRewards);
        emit TokenDeactivate(address(_token));
    }

    /**
     * @notice Activate token
     * @param _token token address
     */
    function activateToken(IERC20 _token) external onlyOwner(msg.sender) inactiveToken(_token) {
        tokens[_token]._active = true;
        emit TokenActivate(address(_token));
    }

    function deposit(uint256 _amount, DepositType _depositType) external override {
        oddzToken.safeTransferFrom(msg.sender, address(this), _amount);
        uint8 totalPerc;
        for (uint256 i = 0; i < tokensList.length; i++) {
            if (!tokensList[i]._active) continue;
            uint8 feePerc;
            if (_depositType == DepositType.Transaction) feePerc = tokensList[i]._txnFeeReward;
            else if (_depositType == DepositType.Settlement) feePerc = tokensList[i]._settlementFeeReward;
            else feePerc = tokensList[i]._allotedReward;
            totalPerc += feePerc;

            (tokensList[i]._stakingContract).allocateRewards((_amount * feePerc) / 100);
        }
        require(totalPerc == 100, "Staking: invalid fee allocation for tokens");

        emit Deposit(msg.sender, _depositType, _amount);
    }

    function addToken(
        IERC20 _address,
        IOddzTokenStaking _stakingContract,
        uint256 _lockupDuration,
        uint256 _rewardsLockupDuration,
        uint8 _txnFeeReward,
        uint8 _settlementFeeReward,
        uint8 _allotedReward
    )
        external
        onlyOwner(msg.sender)
        validDuration(_lockupDuration)
        validDuration(_rewardsLockupDuration)
        tokenNotAdded(_address)
    {
        require(address(_address).isContract(), "Staking: invalid token address");
        require(address(_stakingContract).isContract(), "Staking: invalid staking contract address");
        tokens[_address] = Token(
            _address,
            _stakingContract,
            _lockupDuration,
            _rewardsLockupDuration,
            _txnFeeReward,
            _settlementFeeReward,
            _allotedReward,
            true
        );
        tokensList.push(tokens[_address]);

        emit TokenAdded(address(_address), address(_stakingContract), _lockupDuration);
    }

    function stake(IERC20 _token, uint256 _amount) external override validToken(_token) {
        require(_amount > 0, "Staking: invalid amount");
        tokens[_token]._stakingContract.stake(msg.sender, _amount);

        emit Stake(msg.sender, address(_token), _amount);
    }

    function withdraw(IERC20 _token, uint256 _amount)
        external
        override
        validToken(_token)
        validStaker(_token, msg.sender)
    {
        require(
            _amount <= IERC20(address(tokens[_token]._stakingContract)).balanceOf(msg.sender),
            "Staking: Amount is too large"
        );

        uint256 date = DateTimeLibrary.getPresentDayTimestamp();
        require(
            date - tokens[_token]._stakingContract.getLastStakedAt(msg.sender) >= tokens[_token]._lockupDuration,
            "Staking: cannot withdraw within lockup period"
        );
        _transferRewards(msg.sender, _token, date);
        tokens[_token]._stakingContract.unstake(msg.sender, _amount);

        emit Withdraw(msg.sender, address(_token), _amount);
    }

    /**
     * @notice Claim rewards by the staker
     * @param _token Address of the staked token
     */
    function claimRewards(IERC20 _token) external validToken(_token) validStaker(_token, msg.sender) {
        uint256 date = DateTimeLibrary.getPresentDayTimestamp();
        require(
            date - tokens[_token]._stakingContract.getLastStakedAt(msg.sender) >= tokens[_token]._rewardsLockupDuration,
            "Staking: cannot claim rewards within lockup period"
        );
        _transferRewards(msg.sender, _token, date);
    }

    /**
     * @notice Get profit info of the staker
     * @param _token Address of the staked token
     */
    function getProfitInfo(IERC20 _token) external view validToken(_token) returns (uint256 profit) {
        profit = tokens[_token]._stakingContract.getRewards(msg.sender);
    }

    /**
     * @notice Transfer rewards to the staker
     * @param _staker Staker Address
     * @param _token Address of the staked token
     * @param _date current date
     */
    function _transferRewards(
        address _staker,
        IERC20 _token,
        uint256 _date
    ) private returns (uint256 reward) {
        if (_date - tokens[_token]._stakingContract.getLastStakedAt(_staker) >= tokens[_token]._rewardsLockupDuration) {
            reward = tokens[_token]._stakingContract.withdrawRewards(_staker);
            oddzToken.safeTransfer(_staker, reward);

            emit TransferReward(_staker, address(_token), reward);
        }
    }

    /**
     * @notice Validate token
     * @param _token token address
     */
    function _validateToken(IERC20 _token) private view {
        require(address(tokens[_token]._address) != address(0), "Staking: token not added");
        require(tokens[_token]._active == true, "Staking: token is not active");
    }
}
