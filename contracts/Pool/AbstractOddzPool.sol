// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "./IOddzLiquidityPool.sol";
import "../Libs/DateTimeLibrary.sol";
import "../Libs/ABDKMath64x64.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";

abstract contract AbstractOddzPool is Ownable, IOddzLiquidityPool {
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
        bool isNegative;
        bool enabled;
    }
    mapping(uint256 => PremiumPool) public premiumDayPool;
    mapping(uint256 => uint256) internal daysExercise;
    uint256 public surplus;

    // premium
    mapping(address => uint256) public lpPremium;
    mapping(address => mapping(uint256 => uint256)) public lpPremiumDistributionMap;

    /**
     * @notice Add liquidity for the day
     * @param _amount USD value
     * @param _account Address of the Liquidity Provider
     */
    function addLiquidity(uint256 _amount, address _account) public override onlyOwner {
        require(_amount > 0, "LP Error: Amount is too small");
        uint256 date = getPresentDayTimestamp();
        updateLiquidity(date, _amount, TransactionType.ADD);
        updateLpBalance(TransactionType.ADD, date, _amount, _account);
        latestLiquidityDateMap[_account] = date;
        oUsdSupply += _amount;

        emit AddLiquidity(_account, _amount);
    }

    /**
     * @notice Provider burns oUSD and receives USD from the pool
     * @param _amount Amount of USD to receive
     * @param _oUSD Amount of oUSD to be burnt
     * @param _account Address of the Liquidity Provider
     */
    function removeLiquidity(
        uint256 _amount,
        uint256 _oUSD,
        address _account
    ) public override onlyOwner {
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

    /**
     * @notice called by Oddz call options to lock the funds
     * @param _amount Amount of funds that should be locked in an option
     * @param _premium premium allocated to the pool
     */
    function lockLiquidity(uint256 _amount, uint256 _premium) public override onlyOwner {
        require(_amount <= availableBalance(), "LP Error: Amount is too large.");
        lockedAmount = lockedAmount + _amount;
        oUsdSupply += _premium;
    }

    /**
     * @notice called by Oddz option to unlock the funds
     * @param _amount Amount of funds that should be unlocked in an option
     */
    function unlockLiquidity(uint256 _amount) public override onlyOwner {
        require(_amount > 0, "LP Error: Amount is too small");
        lockedAmount = lockedAmount - _amount;
    }

    /**
     * @notice latest transaction date of the user
     * @param _account Address of the Liquidity Provider
     * @return balance account balance
     */
    function latestLiquidityDate(address _account) public view override returns (uint256) {
        return latestLiquidityDateMap[_account];
    }

    /**
     * @notice current balance of the user
     * @param _account Address of the Liquidity Provider
     * @return balance account balance
     */
    function activeLiquidity(address _account) public view override returns (uint256) {
        return activeLiquidityByDate(_account, getPresentDayTimestamp());
    }

    /**
     * @notice active liquitdity for the date
     * @param _date UTC timestamp of the date
     * @param _account Address of the Liquidity Provider
     * @return balance account balance
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

    /**
     * @notice returns user premium allocated for the date
     * @param _account Address of the Liquidity Provider
     * @param _date premium eligible date
     * @return premium Premium distribution amount for the date
     */
    function getPremiumDistribution(address _account, uint256 _date) public view override returns (uint256) {
        return lpPremiumDistributionMap[_account][_date];
    }

    /**
     * @notice fetches user premium
     * @param _account Address of the Liquidity Provider
     */
    function getPremium(address _account) public view override returns (uint256) {
        return lpPremium[_account];
    }

    /**
     * @notice Allocate premium to pool
     * @param _lid liquidity ID
     * @param _amount Premium amount
     */
    function unlockPremium(uint256 _lid, uint256 _amount) public override onlyOwner {
        PremiumPool storage dayPremium = premiumDayPool[getPresentDayTimestamp()];
        dayPremium.collected = dayPremium.collected + _amount;

        emit Profit(_lid, _amount);
    }

    /**
     * @notice Allocate premium to pool
     * @param _lid liquidity ID
     * @param _amount Premium amount
     * @param _transfer Amount i.e will be transferred to option owner
     */
    function exercisePremium(
        uint256 _lid,
        uint256 _amount,
        uint256 _transfer
    ) public override onlyOwner {
        uint256 date = getPresentDayTimestamp();
        PremiumPool storage dayPremium = premiumDayPool[date];
        dayPremium.collected = dayPremium.collected + _amount;
        daysExercise[date] += _transfer;

        if (_amount >= _transfer) emit Profit(_lid, _amount - _transfer);
        else emit Loss(_lid, _transfer - _amount);
    }

    /**
     * @notice Enable premium distribution for a date
     * @param _date Premium eligibility date
     */
    function enablePremiumDistribution(uint256 _date) public override {
        require(_date < getPresentDayTimestamp(), "LP Error: Invalid Date");
        PremiumPool storage premium = premiumDayPool[_date];
        require(!premium.enabled, "LP Error: Premium eligibilty already updated for the date");
        premium.enabled = true;
        if (premium.collected + surplus >= daysExercise[_date]) {
            premium.eligible = premium.collected + surplus - daysExercise[_date];
            premium.isNegative = false;
        } else {
            premium.eligible = daysExercise[_date] - premium.collected + surplus;
            premium.isNegative = true;
        }
        surplus = 0;
    }

    /**
     * @notice gets premium distribution status for a date
     * @param _date Premium eligibility date
     */
    function isPremiumDistributionEnabled(uint256 _date) public view override returns (bool) {
        return premiumDayPool[_date].enabled;
    }

    /**
     * @notice returns eligible premium for a date
     * @param _date Premium date
     */
    function getEligiblePremium(uint256 _date) public view override returns (uint256) {
        return premiumDayPool[_date].eligible;
    }

    /**
     * @notice returns distributed premium for a date
     * @param _date Premium date
     */
    function getDistributedPremium(uint256 _date) public view override returns (uint256) {
        return premiumDayPool[_date].distributed;
    }

    /**
     * @notice allocated premium to provider
     * @param _account Address of the Liquidity Provider
     * @param _amount Premium amount
     * @param _date premium eligible date
     */
    function allocatePremiumToProvider(
        address _account,
        uint256 _amount,
        uint256 _date
    ) public override onlyOwner {
        lpPremiumDistributionMap[_account][_date] = _amount;
        if (premiumDayPool[_date].isNegative) {
            if (lpPremium[_account] > 0) {
                if (lpPremium[_account] > _amount) {
                    lpPremium[_account] -= _amount;
                    _amount = 0;
                } else {
                    _amount -= lpPremium[_account];
                    lpPremium[_account] = 0;
                }
            }
            negativeLpBalance[_account] += _amount;
        } else {
            if (negativeLpBalance[_account] > 0) {
                if (negativeLpBalance[_account] > _amount) {
                    negativeLpBalance[_account] -= _amount;
                    _amount = 0;
                } else {
                    _amount -= negativeLpBalance[_account];
                    negativeLpBalance[_account] = 0;
                }
            }
            lpPremium[_account] += _amount;
        }

        premiumDayPool[_date].distributed = premiumDayPool[_date].distributed + _amount;
    }

    /**
     * @notice forfeite user premium
     * @param _account Address of the Liquidity Provider
     * @param _amount Premium amount
     */
    function forfeitPremium(address _account, uint256 _amount) public override onlyOwner {
        lpPremium[_account] -= _amount;
        surplus += _amount;

        emit PremiumForfeited(_account, _amount);
    }

    /**
     * @notice helper to convert premium to oUSD and sets the premium to zero
     * @param _account Address of the Liquidity Provider
     * @return premium Premium balance
     */
    function collectPremium(address _account) public override onlyOwner returns (uint256 premium) {
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

    /**
     * @notice Returns the amount of USD available for withdrawals
     * @return balance Unlocked balance
     */
    function availableBalance() public view override returns (uint256) {
        return totalBalance() - lockedAmount;
    }

    /**
     * @notice Returns the total balance of USD provided to the pool
     * @return balance Pool balance
     */
    function totalBalance() public view override returns (uint256) {
        return poolBalance;
    }

    /**
     * @notice Returns the total supply allocated for the pool
     * @return balance total supply allocated to the pool
     */
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

        if (_date > latestLiquidityEvent) latestLiquidityEvent = _date;
    }

    /**
     * @dev get day based on the timestamp
     */
    function getPresentDayTimestamp() internal view returns (uint256 activationDate) {
        (uint256 year, uint256 month, uint256 day) = DateTimeLibrary.timestampToDate(block.timestamp);
        activationDate = DateTimeLibrary.timestampFromDate(year, month, day);
    }
}
