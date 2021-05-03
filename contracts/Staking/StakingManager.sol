// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "./IOddzStaking.sol";
import "./ITokenStaking.sol";
import "../Libs/DateTimeLibrary.sol";
import "./OddzTokenStaking.sol";
import "./ODevTokenStaking.sol";
import "./OUsdTokenStaking.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract StakingManager is IOddzStaking,AccessControl {
    using Address for address;
    using SafeERC20 for IERC20;

    IERC20 usdcToken;
    
    mapping(address => Token) tokens;

    // user => token => StakerDetailsPerToken
    mapping(address => mapping(address => StakerDetails)) stakers;
   

    uint256 public txnFeeBalance;
    uint256 public settlementFeeBalance;

    /**
     * @dev Access control specific data definitions
     */
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

     modifier onlyOwner(address _address) {
        require(hasRole(DEFAULT_ADMIN_ROLE, _address), "LP Error: caller has no access to the method");
        _;
    }

    modifier onlyManager(address _address) {
        require(hasRole(MANAGER_ROLE, _address), "LP Error: caller has no access to the method");
        _;
    }

    modifier validToken(address _token) {
        require(tokens[_token]._active == true, "token is not active");
        _;
    }

    modifier inactiveToken(address _token) {
        require(tokens[_token]._active == false, "token is already active");
        _;
    }

    constructor(
        IERC20 _usdcToken
        ){
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        usdcToken = _usdcToken;
    }

    /**
     @dev sets the manager for the staking  contract
     @param _address manager contract address
     Note: This can be called only by the owner
     */
    function setManager(address _address) public {
        require(_address != address(0) && _address.isContract(), "LP Error: Invalid manager address");
        grantRole(MANAGER_ROLE, _address);
    }

    /**
     @dev removes the manager for the staking contract for valid managers
     @param _address manager contract address
     Note: This can be called only by the owner
     */
    function removeManager(address _address) public {
        revokeRole(MANAGER_ROLE, _address);
    }



    function setLockupDuration(address _token, uint256 _duration) external onlyOwner(msg.sender){
        tokens[_token]._lockupDuration = _duration;
    }

    function setRewardRate(address _token, uint256 _rate) external onlyOwner(msg.sender){
        tokens[_token]._rewardRate = _rate;
    }

    function deactivateToken(address _token) external onlyOwner(msg.sender){
        tokens[_token]._active = false;
        emit TokenDeactivate(_token, tokens[_token]._name, block.timestamp);
    }
    function activateToken(address _token) external onlyOwner(msg.sender){
        tokens[_token]._active = true;
        emit TokenActivate(_token, tokens[_token]._name, block.timestamp);
    }

    function addToken(
                    bytes32 _name,
                    address _address,
                    address _stakingContract, 
                    uint256 _rewardRate, 
                    uint256 _lockupDuration, 
                    uint256 _txnFeeReward, 
                    uint256 _settlementFeeReward
                    ) external onlyOwner(msg.sender){
        tokens[_address] = Token(
                            _name,
                            _address, 
                            _stakingContract,
                            _rewardRate, 
                            _txnFeeReward, 
                            _settlementFeeReward,  
                            _lockupDuration,
                            0,
                            true);
        emit TokenAdded(_address, _name, _rewardRate, _lockupDuration, block.timestamp);                
    }


    function deposit(uint256 _amount, DepositType _depositType) override external onlyManager(msg.sender){
        if(_depositType == DepositType.Transaction){
            txnFeeBalance += _amount;
        }else if (_depositType == DepositType.Settlement){
            settlementFeeBalance += _amount;
        }

        emit Deposit(block.timestamp, _depositType, _amount );
    }

    function stake(address _token, uint256 _amount) override external validToken(_token){
        require(_amount > 0, "invalid amount");

        uint256 date = getPresentDayTimestamp();
        ITokenStaking(tokens[_token]._stakingContract).stake(_token, msg.sender,_amount);
        stakers[msg.sender][_token]._balance += _amount;
        stakers[msg.sender][_token]._lastStakedAt = date;

        emit Stake(msg.sender, _token, _amount, block.timestamp);
    }

    function withdraw(address _token, uint256 _amount) override external returns(uint256 burn){
        require(_amount < ITokenStaking(tokens[_token]._stakingContract).balance(msg.sender), "Amount is too large");

        uint256 date = getPresentDayTimestamp();
        burn =_amount + _transferRewards(msg.sender,_token,date);
        ITokenStaking(tokens[_token]._stakingContract).burn(msg.sender, burn);
        usdcToken.safeTransfer(msg.sender, _amount);
        stakers[msg.sender][_token]._balance -= _amount;

    }


    function distributeRewards(address _token, address[] memory _stakers) override external {
        
        for (uint256 sid = 0; sid< _stakers.length; sid++){
            _distributeRewards(_token, _stakers[sid]);
        }
    }

    function _distributeRewards(address _token, address _staker) private {
        uint256 date = getPresentDayTimestamp();
        Token storage token = tokens[_token];
        
        if(date - tokens[_token]._lastDistributed < tokens[_token]._rewardRate){
            return;
        }
        
        uint256 reward = txnFeeBalance * token._txnFeeReward * stakers[_staker][_token]._balance;
        reward += settlementFeeBalance * token._settlementFeeReward * stakers[_staker][_token]._balance;
        stakers[_staker][_token]._rewards +=reward;
        _transferRewards(_staker, _token, date);
       
       emit DistributeReward(_staker, _token, reward, block.timestamp);
    }

    


    function _transferRewards(address _staker, address _token, uint256 _date) private returns (uint256 reward){
         if(_date - stakers[_staker][_token]._lastStakedAt >= tokens[_token]._lockupDuration){
            reward = stakers[msg.sender][_token]._rewards;
            ITokenStaking(tokens[_token]._stakingContract).mint(_staker, stakers[_staker][_token]._rewards);
            stakers[_staker][_token]._rewards=0;
            emit TransferReward(_staker, _token, reward, block.timestamp);
         }
    }

    function claimRewards(address _token) external {
        uint256 date = getPresentDayTimestamp();
        _transferRewards(msg.sender, _token, date);
        
    }

    function getProfit(address _token) external returns (uint256 profit){
        profit = ITokenStaking(tokens[_token]._stakingContract).balance(msg.sender) 
                - stakers[msg.sender][_token]._balance;
    }

    /**
     * @dev get day based on the timestamp
     */
    function getPresentDayTimestamp() internal view returns (uint256 activationDate) {
        (uint256 year, uint256 month, uint256 day) = DateTimeLibrary.timestampToDate(block.timestamp);
        activationDate = DateTimeLibrary.timestampFromDate(year, month, day);
    }

    



}