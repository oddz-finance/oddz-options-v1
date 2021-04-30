// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "./IOddzLiquidityPool.sol";
import "../Libs/DateTimeLibrary.sol";
import "../Libs/ABDKMath64x64.sol";
import "../Swap/DexManager.sol";
import "../OddzSDK.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "hardhat/console.sol";

contract OddzLiquidityPool is AccessControl, IOddzLiquidityPool, ERC20("Oddz USD LP token", "oUSD") {
    using Address for address;
    using SafeERC20 for IERC20;

    /**
     * @dev reqBalance represents minimum required balance out of 10
     * Range between 6 and 9
     * e.g. 8 represents 80% of the balance
     */
    uint8 public reqBalance = 8;

    /**
     * @dev Liquidity specific data definitions
     */
    uint256 public lockedAmount;
    enum TransactionType { ADD, REMOVE }
    struct LPBalance {
        uint256 currentBalance;
        uint256 transactionDate;
    }
    mapping(uint256 => uint256) public daysActiveLiquidity;
    mapping(address => LPBalance[]) public lpBalanceMap;
    mapping(address => uint256) public latestLiquidityDateMap;
    LockedLiquidity[] public lockedLiquidity;
    uint256 public latestLiquidityEvent;
    IERC20 public token;

    /**
     * @dev Premium specific data definitions
     */
    uint256 public premiumLockupDuration = 14 days;
    struct PremiumPool {
        uint256 collected;
        uint256 eligible;
        uint256 distributed;
        bool enabled;
    }
    mapping(uint256 => PremiumPool) public premiumDayPool;
    uint256 public surplus;
    mapping(uint256 => uint256) internal daysExercise;
    mapping(address => uint256) public lpPremium;
    mapping(address => mapping(uint256 => uint256)) public lpPremiumDistributionMap;

    /**
     * @dev DEX manager
     */
    DexManager public dexManager;

    /**
     * @dev Oddz SDK
     */
    OddzSDK public sdk;

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

    modifier validLiquidty(uint256 _id) {
        LockedLiquidity storage ll = lockedLiquidity[_id];
        require(ll.locked, "LP Error: LockedLiquidity with given id has already been unlocked");
        _;
    }

    modifier reqBalanceValidRange(uint8 _reqBalance) {
        require(_reqBalance >= 6 && _reqBalance <= 9, "LP Error: required balance valid range [6 - 9]");
        _;
    }

    function setSdk(OddzSDK _sdk) external onlyOwner(msg.sender) {
        require(address(_sdk).isContract(), "invalid SDK contract address");
        sdk = _sdk;
    }

    constructor(IERC20 _token, DexManager _dexManager) {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        token = _token;
        dexManager = _dexManager;
    }

    function addLiquidity(uint256 _amount, address _account) external override returns (uint256 mint) {
        mint = _amount;
        address sender_ = msg.sender == address(sdk) ? _account : msg.sender;

        require(mint > 0, "LP Error: Amount is too small");
        uint256 date = getPresentDayTimestamp();
        // transfer user eligible premium
        transferEligiblePremium(date, sender_);
        updateLiquidity(date, _amount, TransactionType.ADD);
        updateLpBalance(TransactionType.ADD, date, _amount, sender_);
        latestLiquidityDateMap[sender_] = date;

        _mint(sender_, mint);
        emit AddLiquidity(sender_, _amount, mint);

        token.safeTransferFrom(sender_, address(this), _amount);
    }

    function removeLiquidity(uint256 _amount) external override returns (uint256 burn) {
        require(
            _amount * 10 <= availableBalance() * reqBalance,
            "LP Error: Not enough funds on the pool contract. Please lower the amount."
        );

        uint256 date = getPresentDayTimestamp();

        // burn = _amount + fetch eligible premium if any
        burn = _amount + transferEligiblePremium(date, msg.sender);
        require(burn <= balanceOf(msg.sender), "LP Error: Amount is too large");
        require(burn > 0, "LP Error: Amount is too small");

        updateLiquidity(date, _amount, TransactionType.REMOVE);
        updateLpBalance(TransactionType.REMOVE, date, _amount, msg.sender);

        // Forfeit premium if less than premium locked period
        updateUserPremium(latestLiquidityDateMap[msg.sender], _amount, date);
        uint256 transferAmount = ABDKMath64x64.mulu(ABDKMath64x64.divu(totalBalance(), totalSupply()), burn);

        _burn(msg.sender, burn);
        emit RemoveLiquidity(msg.sender, transferAmount, burn);

        token.safeTransfer(msg.sender, transferAmount);
    }

    function lockLiquidity(
        uint256 _id,
        uint256 _amount,
        uint256 _premium
    ) public override onlyManager(msg.sender) {
        require(_id == lockedLiquidity.length, "LP Error: Invalid id");
        require((lockedAmount + _amount) <= (totalBalance() - _premium), "LP Error: Amount is too large.");
        lockedLiquidity.push(LockedLiquidity(_amount, _premium, true));
        lockedAmount = lockedAmount + _amount;

        // Allocate premium to the self until premium unlock
        _mint(address(this), _premium);
    }

    function unlockLiquidity(uint256 _id) public override onlyManager(msg.sender) validLiquidty(_id) {
        LockedLiquidity storage ll = lockedLiquidity[_id];
        ll.locked = false;
        lockedAmount = lockedAmount - ll.amount;
        PremiumPool storage dayPremium = premiumDayPool[getPresentDayTimestamp()];
        dayPremium.collected = dayPremium.collected + ll.premium;

        emit Profit(_id, ll.premium);
    }

    function send(
        uint256 _id,
        address _account,
        uint256 _amount
    ) public override onlyManager(msg.sender) validLiquidty(_id) {
        (uint256 lockedPremium, uint256 transferAmount) = updateAndFetchLockedLiquidity(_id, _account, _amount);
        // Transfer Funds
        token.safeTransfer(_account, transferAmount);
        // Send event
        emitSendEvent(_id, lockedPremium, transferAmount);
    }

    function sendUA(
        uint256 _id,
        address _account,
        uint256 _amount,
        bytes32 _underlying,
        bytes32 _strike,
        uint32 _deadline
    ) public override onlyManager(msg.sender) validLiquidty(_id) {
        (uint256 lockedPremium, uint256 transferAmount) = updateAndFetchLockedLiquidity(_id, _account, _amount);
        address exchange = dexManager.getExchange(_underlying, _strike);
        // Transfer Funds
        token.safeTransfer(exchange, transferAmount);
        // block.timestamp + deadline --> deadline from the current block
        dexManager.swap(_strike, _underlying, exchange, _account, transferAmount, block.timestamp + _deadline);
        // Send event
        emitSendEvent(_id, lockedPremium, transferAmount);
    }

    /**
     * @notice Returns LP's balance in USD
     * @param _account Liquidity provider's address
     * @return share Liquidity provider's balance in USD
     */
    function usdBalanceOf(address _account) external view returns (uint256 share) {
        if (totalSupply() > 0)
            share = ABDKMath64x64.mulu(ABDKMath64x64.divu(totalBalance(), totalSupply()), balanceOf(_account));
        else share = 0;
    }

    /**
     * @notice Returns LP's active liquidty
     * @param _account Liquidity provider's address
     * @return share liquidity provider's active liquidity
     */
    function activeLiquidity(address _account) public view returns (uint256 share) {
        share = activeLiqudityByDate(_account, getPresentDayTimestamp());
    }

    /**
     * @notice Returns LP's active liqudity based on input date
     * @param _account Liquidity provider's address
     * @param _date unix timestamp of the date
     * @return share liquidity provider's active liquidity
     */
    function activeLiqudityByDate(address _account, uint256 _date) public view returns (uint256 share) {
        LPBalance[] storage lpBalanceList = lpBalanceMap[_account];
        uint256 len = lpBalanceList.length;
        while (len > 0 && lpBalanceList[len - 1].transactionDate > _date) {
            len--;
        }
        if (len > 0) return lpBalanceList[len - 1].currentBalance;
        else return 0;
    }

    /**
     * @notice Updates liquidity provider balance
     * @param _type Transaction type
     * @param _date Epoch time for 00:00:00 hours of the date
     * @param _amount amount of liquidity added/removed
     */
    function updateLpBalance(
        TransactionType _type,
        uint256 _date,
        uint256 _amount,
        address _sender
    ) private {
        uint256 balance = activeLiquidity(_sender);
        if (_type == TransactionType.ADD) balance = balance + _amount;
        else balance = balance - _amount;

        LPBalance[] storage lpBalance = lpBalanceMap[_sender];

        if (lpBalance.length > 0 && lpBalance[lpBalance.length - 1].transactionDate == _date)
            lpBalance[lpBalance.length - 1].currentBalance = balance;
        else lpBalance.push(LPBalance(balance, _date));
    }

    /**
     * @notice Updates Premium Eligibility for the given date
     * @param _date Epoch time for 00:00:00 hours of the date
     */
    function updatePremiumEligibility(uint256 _date) public {
        require(_date < getPresentDayTimestamp(), "LP Error: Invalid Date");
        PremiumPool storage premium = premiumDayPool[_date];
        require(!premium.enabled, "LP Error: Premium eligibilty already updated for the date");
        premium.enabled = true;
        premium.eligible = premium.collected + surplus - daysExercise[_date];
        surplus = 0;
    }

    /**
     * @notice Distributes the Premium for the Liquidity Provider for the given date
     * @param _date Epoch time for 00:00:00 hours of the date
     * @param _lp active liquidity provider address
     */
    function distributePremiumPerLP(uint256 _date, address _lp) private {
        LPBalance[] storage lpBalance = lpBalanceMap[_lp];
        uint256 len = lpBalance.length;
        // Invalid liquidity provider
        if (len <= 0) return;
        require(lpPremiumDistributionMap[_lp][_date] <= 0, "LP Error: Premium already distributed for the provider");
        while (len > 0 && lpBalance[len - 1].transactionDate > _date) {
            len--;
        }
        uint256 lpEligible =
            (premiumDayPool[_date].eligible * lpBalance[len - 1].currentBalance) / getDaysActiveLiquidity(_date);
        lpPremiumDistributionMap[_lp][_date] = lpEligible;
        lpPremium[_lp] = lpPremium[_lp] + lpEligible;
        premiumDayPool[_date].distributed = premiumDayPool[_date].distributed + lpEligible;
        transferEligiblePremium(getPresentDayTimestamp(), _lp);
    }

    /**
     * @notice Distributes the Premium for the Liquidity Providers for the given date
     * @param _date Epoch time for 00:00:00 hours of the date
     * @param _lps List of the active liquidity provider addresses
     */
    function distributePremium(uint256 _date, address[] memory _lps) public {
        require(_date < getPresentDayTimestamp(), "LP Error: Invalid Date");
        if (!premiumDayPool[_date].enabled) {
            updatePremiumEligibility(_date);
        }
        require(premiumDayPool[_date].eligible > 0, "LP Error: No premium collected for the date");
        require(
            premiumDayPool[_date].eligible > premiumDayPool[_date].distributed,
            "LP Error: Premium already distributed for this date"
        );
        for (uint256 lpid = 0; lpid < _lps.length; lpid++) {
            distributePremiumPerLP(_date, _lps[lpid]);
        }
    }

    function transferPremium() external {
        uint256 date = getPresentDayTimestamp();
        require(
            (date - latestLiquidityDateMap[msg.sender]) > premiumLockupDuration,
            "LP Error: Address not eligible for premium collection"
        );
        transferEligiblePremium(date, msg.sender);
    }

    /**
     * @notice sends the eligible premium for the provider address while add liquidity
     * @param _date liquidity date
     * @param _lp liquidity provider address
     */
    function transferEligiblePremium(uint256 _date, address _lp) private returns (uint256 premium) {
        if (_date - (latestLiquidityDateMap[_lp]) <= premiumLockupDuration) return 0;

        premium = lpPremium[_lp];
        lpPremium[_lp] = 0;
        _transfer(address(this), _lp, premium);

        emit PremiumCollected(_lp, premium);
    }

    /**
     * @notice updates eligible premium for the provider address while remove liquidity
     * @param _latestLiquidityDate Latest liquidity by the provider
     * @param _amount amount of liquidity removed
     * @param _date liquidity date
     */
    function updateUserPremium(
        uint256 _latestLiquidityDate,
        uint256 _amount,
        uint256 _date
    ) private {
        if (lpPremium[msg.sender] <= 0) return;
        uint256 balance = activeLiquidity(msg.sender);
        require(balance > 0, "LP Error: current balance is less than or equal to zero");
        if (_date - (_latestLiquidityDate) <= premiumLockupDuration) {
            uint256 lostPremium = (lpPremium[msg.sender] * _amount) / activeLiquidity(msg.sender);
            lpPremium[msg.sender] = lpPremium[msg.sender] - lostPremium;
            surplus = surplus + lostPremium;

            emit PremiumForfeited(msg.sender, lostPremium);
        }
    }

    /**
     * @notice Updates liquidity for a given date
     * @param _date liquidity date
     * @param _amount amount of liquidity added/removed
     * @param _type transaction type
     */
    function updateLiquidity(
        uint256 _date,
        uint256 _amount,
        TransactionType _type
    ) private {
        if (_type == TransactionType.ADD) {
            daysActiveLiquidity[_date] = getDaysActiveLiquidity(_date) + _amount;
        } else {
            daysActiveLiquidity[_date] = getDaysActiveLiquidity(_date) - _amount;
        }
        latestLiquidityEvent = _date;
    }

    /**
     * @notice Get active liquidity for a date
     * @param _date liquidity date
     */
    function getDaysActiveLiquidity(uint256 _date) private returns (uint256 _liquidity) {
        // Skip for the first time liqiduity
        if (daysActiveLiquidity[_date] == 0 && latestLiquidityEvent != 0) {
            uint256 stDate = latestLiquidityEvent;
            while (stDate <= _date) {
                daysActiveLiquidity[stDate] = daysActiveLiquidity[latestLiquidityEvent];
                stDate = stDate + 1 days;
            }
        }
        _liquidity = daysActiveLiquidity[_date];
    }

    /**
     * @notice update and returns locked liquidity
     * @param _lid Id of LockedLiquidity that should be unlocked
     * @param _account Provider account address
     * @param _amount Funds that should be sent
     */
    function updateAndFetchLockedLiquidity(
        uint256 _lid,
        address _account,
        uint256 _amount
    ) private returns (uint256 lockedPremium, uint256 transferAmount) {
        LockedLiquidity storage ll = lockedLiquidity[_lid];
        require(_account != address(0), "LP Error: Invalid address");

        ll.locked = false;
        uint256 date = getPresentDayTimestamp();
        lockedAmount = lockedAmount - ll.amount;
        lockedPremium = ll.premium;
        transferAmount = _amount;
        if (_amount > ll.amount) transferAmount = ll.amount;

        // Premium calculation
        premiumDayPool[date].collected = premiumDayPool[date].collected + lockedPremium;
        daysExercise[date] = daysExercise[date] + ll.amount;
    }

    /**
     * @notice Emit Profit/Loss event based on exercise
     * @param _lid Id of LockedLiquidity that should be unlocked
     * @param _lockedPremium Locked premium in the pool
     * @param _transferAmount Funds that is sent to option buyer
     */
    function emitSendEvent(
        uint256 _lid,
        uint256 _lockedPremium,
        uint256 _transferAmount
    ) private {
        if (_transferAmount <= _lockedPremium) emit Profit(_lid, _lockedPremium - _transferAmount);
        else emit Loss(_lid, _transferAmount - _lockedPremium);
    }

    function availableBalance() public view override returns (uint256 balance) {
        return totalBalance() - lockedAmount;
    }

    function totalBalance() public view override returns (uint256 balance) {
        // though balance is oUSD its 1 - 1 minted for premium in USD
        return token.balanceOf(address(this)) - balanceOf(address(this));
    }

    /**
     @dev sets the manager for the liqudity pool contract
     @param _address manager contract address
     Note: This can be called only by the owner
     */
    function setManager(address _address) public {
        require(_address != address(0) && _address.isContract(), "LP Error: Invalid manager address");
        grantRole(MANAGER_ROLE, _address);
    }

    /**
     @dev removes the manager for the liqudity pool contract for valid managers
     @param _address manager contract address
     Note: This can be called only by the owner
     */
    function removeManager(address _address) public {
        revokeRole(MANAGER_ROLE, _address);
    }

    /**
     @dev sets required balance
     @param _reqBalance required balance between 6 and 9
     Note: This can be called only by the owner
     */
    function setReqBalance(uint8 _reqBalance) public onlyOwner(msg.sender) reqBalanceValidRange(_reqBalance) {
        reqBalance = _reqBalance;
    }

    /**
     * @dev get day based on the timestamp
     */
    function getPresentDayTimestamp() internal view returns (uint256 activationDate) {
        (uint256 year, uint256 month, uint256 day) = DateTimeLibrary.timestampToDate(block.timestamp);
        activationDate = DateTimeLibrary.timestampFromDate(year, month, day);
    }
}
