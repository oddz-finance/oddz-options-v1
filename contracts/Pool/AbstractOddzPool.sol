// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "./IOddzLiquidityPool.sol";
import "../Libs/DateTimeLibrary.sol";
import "../Libs/ABDKMath64x64.sol";
import "@openzeppelin/contracts/utils/Address.sol";

abstract contract AbstractOddzPool is AccessControl, IOddzLiquidityPool {
    using Address for address;
    /**
     * @dev Liquidity specific data definitions
     */
    uint256 public poolBalance;
    uint256 public oUsdSupply;
    uint256 public lockedAmount;
    struct LPBalance {
        uint256 currentBalance;
        uint256 transactionDate;
    }
    mapping(address => LPBalance[]) public lpBalanceMap;
    // To distribute loss in the pool
    mapping(address => uint256) public negativeLpBalance;
    mapping(uint256 => uint256) public daysActiveLiquidity;
    mapping(address => uint256) public latestLiquidityDateMap;
    uint256 public latestLiquidityEvent;

    /**
     * @dev Premium specific data definitions
     */
    struct PremiumPool {
        uint256 collected;
        uint256 eligible;
        uint256 distributed;
        bool enabled;
    }
    mapping(uint256 => PremiumPool) public premiumDayPool;
    mapping(uint256 => uint256) internal daysExercise;
    uint256 public surplus;

    // premium
    mapping(address => uint256) public lpPremium;
    mapping(address => mapping(uint256 => uint256)) public lpPremiumDistributionMap;

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

    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function addLiquidity(uint256 _amount, address _account) public override onlyManager(msg.sender) {
        require(_amount > 0, "LP Error: Amount is too small");
        uint256 date = getPresentDayTimestamp();
        updateLiquidity(date, _amount, TransactionType.ADD);
        updateLpBalance(TransactionType.ADD, date, _amount, _account);
        latestLiquidityDateMap[_account] = date;
        oUsdSupply += _amount;

        emit AddLiquidity(_account, _amount);
    }

    function removeLiquidity(
        uint256 _amount,
        uint256 _oUSD,
        address _account
    ) public override onlyManager(msg.sender) {
        LPBalance[] memory lpBalance = lpBalanceMap[_account];
        require(
            _amount <= lpBalance[lpBalance.length - 1].currentBalance - negativeLpBalance[_account],
            "LP Error: Amount is too large"
        );
        require(_amount > 0, "LP Error: Amount is too small");

        uint256 date = getPresentDayTimestamp();
        updateLiquidity(date, _amount, TransactionType.REMOVE);
        updateLpBalance(TransactionType.REMOVE, date, _amount, _account);
        oUsdSupply -= _oUSD;

        emit RemoveLiquidity(_account, _amount, _oUSD);
    }

    function lockLiquidity(uint256 _amount) public override onlyManager(msg.sender) {
        require(_amount <= availableBalance(), "LP Error: Amount is too large.");
        lockedAmount = lockedAmount + _amount;
        oUsdSupply += _amount;
    }

    function unlockLiquidity(uint256 _amount) public override onlyManager(msg.sender) {
        require(_amount > 0, "LP Error: Amount is too small");
        lockedAmount = lockedAmount - _amount;
    }

    function latestLiquidityDate(address _account) public view override returns (uint256) {
        return latestLiquidityDateMap[_account];
    }

    /**
     * @notice Returns LP's active liquidty
     * @param _account Liquidity provider's address
     * @return balance liquidity provider's active liquidity
     */
    function activeLiquidity(address _account) public view override returns (uint256) {
        return activeLiquidityByDate(_account, getPresentDayTimestamp());
    }

    /**
     * @notice Returns LP's active liqudity based on input date
     * @param _account Liquidity provider's address
     * @param _date unix timestamp of the date
     * @return balance liquidity provider's active liquidity
     */
    function activeLiquidityByDate(address _account, uint256 _date) public view override returns (uint256) {
        LPBalance[] storage lpBalanceList = lpBalanceMap[_account];
        uint256 len = lpBalanceList.length;
        while (len > 0 && lpBalanceList[len - 1].transactionDate > _date) {
            len--;
        }
        if (len > 0) return lpBalanceList[len - 1].currentBalance;
        else return 0;
    }

    function updateSurplus(uint256 _amount, bool _positive) public override onlyManager(msg.sender) {
        surplus = _positive ? surplus + _amount : surplus - _amount;
    }

    function getPremiumDistribution(address _account, uint256 _date) public view override returns (uint256) {
        return lpPremiumDistributionMap[_account][_date];
    }

    function getPremium(address _account) public view override returns (uint256) {
        return lpPremium[_account];
    }

    function unlockPremium(uint256 _lid, uint256 _amount) public override onlyManager(msg.sender) {
        PremiumPool storage dayPremium = premiumDayPool[getPresentDayTimestamp()];
        dayPremium.collected = dayPremium.collected + _amount;

        emit Profit(_lid, _amount);
    }

    function exercisePremium(
        uint256 _lid,
        uint256 _amount,
        uint256 _transfer
    ) public override onlyManager(msg.sender) {
        uint256 date = getPresentDayTimestamp();
        PremiumPool storage dayPremium = premiumDayPool[date];
        dayPremium.collected = dayPremium.collected + _amount;
        daysExercise[date] += _transfer;
        updateLiquidity(date, _transfer, TransactionType.REMOVE);

        if (_amount >= _transfer) emit Profit(_lid, _amount - _transfer);
        else emit Loss(_lid, _transfer - _amount);
    }

    function enablePremiumDistribution(uint256 _date) public override {
        require(_date < getPresentDayTimestamp(), "LP Error: Invalid Date");
        PremiumPool storage premium = premiumDayPool[_date];
        require(!premium.enabled, "LP Error: Premium eligibilty already updated for the date");
        premium.enabled = true;
        premium.eligible = premium.collected + surplus - daysExercise[_date];
        surplus = 0;
    }

    function isPremiumDistributionEnabled(uint256 _date) public view override returns (bool) {
        return premiumDayPool[_date].enabled;
    }

    function getEligiblePremium(uint256 _date) public view override returns (uint256) {
        return premiumDayPool[_date].eligible;
    }

    function getDistributedPremium(uint256 _date) public view override returns (uint256) {
        return premiumDayPool[_date].distributed;
    }

    function allocatePremiumToProvider(
        address _account,
        uint256 _amount,
        uint256 _date
    ) public override onlyManager(msg.sender) {
        lpPremiumDistributionMap[_account][_date] = _amount;
        lpPremium[_account] += _amount;
        premiumDayPool[_date].distributed = premiumDayPool[_date].distributed + _amount;
    }

    function forfeitPremium(address _account, uint256 _amount) public override onlyManager(msg.sender) {
        lpPremium[_account] -= _amount;
        updateSurplus(_amount, true);

        emit PremiumForfeited(_account, _amount);
    }

    function collectPremium(address _account) public override onlyManager(msg.sender) returns (uint256 premium) {
        premium = lpPremium[_account];
        lpPremium[_account] = 0;

        emit PremiumCollected(_account, premium);
    }

    /**
     * @notice Get active liquidity for a date
     * @param _date liquidity date
     */
    function getDaysActiveLiquidity(uint256 _date) public override returns (uint256 _liquidity) {
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

    function availableBalance() public view override returns (uint256) {
        return totalBalance() - lockedAmount;
    }

    function totalBalance() public view override returns (uint256) {
        return poolBalance;
    }

    function totalSupply() public view override returns (uint256) {
        return oUsdSupply;
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
        address _account
    ) private {
        uint256 bal = activeLiquidity(_account);
        if (_type == TransactionType.ADD) bal = bal + _amount;
        else bal = bal - _amount;

        LPBalance[] storage lpBalance = lpBalanceMap[_account];

        if (lpBalance.length > 0 && lpBalance[lpBalance.length - 1].transactionDate == _date)
            lpBalance[lpBalance.length - 1].currentBalance = bal;
        else lpBalance.push(LPBalance(bal, _date));
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
            poolBalance += _amount;
        } else {
            daysActiveLiquidity[_date] = getDaysActiveLiquidity(_date) - _amount;
            poolBalance -= _amount;
        }

        latestLiquidityEvent = _date;
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
     * @dev get day based on the timestamp
     */
    function getPresentDayTimestamp() internal view returns (uint256 activationDate) {
        (uint256 year, uint256 month, uint256 day) = DateTimeLibrary.timestampToDate(block.timestamp);
        activationDate = DateTimeLibrary.timestampFromDate(year, month, day);
    }
}
