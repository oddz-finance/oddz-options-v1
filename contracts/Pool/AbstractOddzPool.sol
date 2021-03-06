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
    uint256 public lockedAmount;
    struct ProviderBalance {
        uint256 _amount;
        uint256 _date;
        uint256 _premiumAllocated;
        uint256 _lastPremiumCollected;
        bool _isNegativePremium;
    }
    mapping(address => ProviderBalance) public liquidityProvider;
    // To distribute loss in the pool
    mapping(uint256 => uint256) public daysActiveLiquidity;
    uint256 public latestLiquidityEvent;

    /**
     * @dev Premium specific data definitions
     */
    struct PremiumPool {
        uint256 _collected;
        uint256 _exercised;
        uint256 _surplus;
    }
    mapping(uint256 => PremiumPool) public premiumDayPool;

    function getBalance(address _provider) external view override returns (uint256 amount) {
        amount = liquidityProvider[_provider]._amount;
    }

    /**
     * @notice Add liquidity for the day
     * @param _amount USD value
     * @param _provider Address of the Liquidity Provider
     */
    function addLiquidity(uint256 _amount, address _provider) external override onlyOwner {
        require(_amount > 0, "LP Error: Amount is too small");
        _updateLiquidity(_amount, TransactionType.ADD);
        _allocatePremium(_provider);
        _updateProviderBalance(_provider, _amount, TransactionType.ADD);

        emit AddLiquidity(_provider, _amount);
    }

    /**
     * @notice Provider burns oUSD and receives USD from the pool
     * @param _amount Amount of oUSD to burn
     * @param _provider Address of the Liquidity Provider
     * @param _lockDuration premium lockup days
     */
    function removeLiquidity(
        uint256 _amount,
        address _provider,
        uint256 _lockDuration
    ) external override onlyOwner returns (uint256 transferAmount) {
        require(_amount > 0, "LP Error: Amount is too small");
        _allocatePremium(_provider);

        uint256 maxAllowedAmount = liquidityProvider[_provider]._amount;
        if (liquidityProvider[_provider]._isNegativePremium)
            maxAllowedAmount -= liquidityProvider[_provider]._premiumAllocated;
        require(_amount <= maxAllowedAmount, "LP Error: Amount is too large");

        transferAmount = (_amount * maxAllowedAmount) / liquidityProvider[_provider]._amount;
        _updateLiquidity(transferAmount, TransactionType.REMOVE);
        // using oUSD (i.e. _amount) for forfeit premium provides higher slash percentage
        _forfeitPremium(_provider, _amount, _lockDuration);
        // oUSD should be the balance of the user
        _updateProviderBalance(_provider, _amount, TransactionType.REMOVE);

        emit RemoveLiquidity(_provider, transferAmount, _amount);
    }

    /**
     * @notice called by Oddz call options to lock the funds
     * @param _amount Amount of funds that should be locked in an option
     */
    function lockLiquidity(uint256 _amount) external override onlyOwner {
        require(_amount <= availableBalance(), "LP Error: Amount is too large.");
        lockedAmount += _amount;

        emit LockLiquidity(_amount);
    }

    /**
     * @notice called by Oddz option to unlock the funds
     * @param _amount Amount of funds that should be unlocked in an option
     */
    function unlockLiquidity(uint256 _amount) external override onlyOwner {
        require(_amount > 0, "LP Error: Amount is too small");
        lockedAmount -= _amount;

        emit UnlockLiquidity(_amount);
    }

    /**
     * @notice Allocate premium to pool
     * @param _lid liquidity ID
     * @param _amount Premium amount
     */
    function unlockPremium(uint256 _lid, uint256 _amount) external override onlyOwner {
        PremiumPool storage dayPremium = premiumDayPool[DateTimeLibrary.getPresentDayTimestamp()];
        dayPremium._collected += _amount;

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
    ) external override onlyOwner {
        uint256 date = DateTimeLibrary.getPresentDayTimestamp();
        PremiumPool storage dayPremium = premiumDayPool[date];
        dayPremium._collected += _amount;
        dayPremium._exercised += _transfer;

        if (_amount >= _transfer) emit Profit(_lid, _amount - _transfer);
        else emit Loss(_lid, _transfer - _amount);
    }

    /**
     * @notice helper to convert premium to oUSD and sets the premium to zero
     * @param _provider Address of the Liquidity Provider
     * @param _lockupDuration premium lockup days
     * @return premium Premium balance
     */
    function collectPremium(address _provider, uint256 _lockupDuration)
        external
        override
        onlyOwner
        returns (uint256 premium)
    {
        if (liquidityProvider[_provider]._date == 0) return 0;
        if ((liquidityProvider[_provider]._date + _lockupDuration) > block.timestamp) return 0;

        _allocatePremium(_provider);
        if (liquidityProvider[_provider]._isNegativePremium) return 0;
        premium = liquidityProvider[_provider]._premiumAllocated;
        liquidityProvider[_provider]._premiumAllocated = 0;

        emit PremiumCollected(_provider, premium);
    }

    /**
     * @notice Get active liquidity for a date
     * @param _date liquidity date
     */
    function getDaysActiveLiquidity(uint256 _date) public returns (uint256 _liquidity) {
        require(_date <= DateTimeLibrary.getPresentDayTimestamp(), "LP Error: invalid date");
        if (daysActiveLiquidity[_date] > 0) return daysActiveLiquidity[_date];

        // Skip for the first time liqiduity
        if (latestLiquidityEvent == 0) return 0;

        uint256 stDate = latestLiquidityEvent;
        while (stDate <= _date) {
            stDate = stDate + 1 days;
            daysActiveLiquidity[stDate] = daysActiveLiquidity[latestLiquidityEvent];
        }

        if (_date > latestLiquidityEvent) latestLiquidityEvent = _date;
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
     * @notice Get staker rewards
     * @param _provider Address of the liquidity provider
     * @return rewards staker rewards
     * @return isNegative true if rewards is negative
     */
    function getPremium(address _provider) public view override returns (uint256 rewards, bool isNegative) {
        if (liquidityProvider[_provider]._amount == 0)
            return (liquidityProvider[_provider]._premiumAllocated, liquidityProvider[_provider]._isNegativePremium);

        uint256 startDate;
        if (liquidityProvider[_provider]._lastPremiumCollected > 0)
            startDate = liquidityProvider[_provider]._lastPremiumCollected;
        else startDate = liquidityProvider[_provider]._date;

        // premium calculation should not include current day
        uint256 count = (DateTimeLibrary.getPresentDayTimestamp() - startDate) / 1 days;
        rewards = liquidityProvider[_provider]._premiumAllocated;
        isNegative = liquidityProvider[_provider]._isNegativePremium;
        for (uint256 i = 0; i < count; i++) {
            (rewards, isNegative) = _getUserPremiumPerDay(startDate + (i * 1 days), rewards, isNegative, _provider);
        }
    }

    function _getUserPremiumPerDay(
        uint256 _date,
        uint256 _rewards,
        bool _isNegative,
        address _provider
    ) private view returns (uint256, bool) {
        uint256 dActiveLiquidity = daysActiveLiquidity[_date];
        require(dActiveLiquidity > 0, "LP Error: invalid day active liquidity");
        PremiumPool memory pd = premiumDayPool[_date];
        uint256 newReward;
        bool isNegativeReward;
        if (pd._exercised > (pd._collected + pd._surplus)) {
            newReward = pd._exercised - (pd._collected + pd._surplus);
            isNegativeReward = true;
        } else newReward = pd._collected + pd._surplus - pd._exercised;

        newReward = (newReward * liquidityProvider[_provider]._amount) / dActiveLiquidity;

        if (liquidityProvider[_provider]._isNegativePremium) {
            if (isNegativeReward) _rewards += newReward;
            else if (_rewards > newReward) _rewards -= newReward;
            else {
                _rewards = newReward - _rewards;
                _isNegative = false;
            }
        } else {
            if (!isNegativeReward) _rewards += newReward;
            else if (_rewards >= newReward) _rewards -= newReward;
            else {
                _rewards = newReward - _rewards;
                _isNegative = true;
            }
        }
        return (_rewards, _isNegative);
    }

    /**
     * @notice forfeite user premium
     * @param _provider Address of the Liquidity Provider
     * @param _withdrawalAmount Amount being withdrawn by the provider
     * @param _lockupDuration Premium lockup duration
     */
    function _forfeitPremium(
        address _provider,
        uint256 _withdrawalAmount,
        uint256 _lockupDuration
    ) private {
        if (liquidityProvider[_provider]._isNegativePremium) return;
        if ((liquidityProvider[_provider]._date + _lockupDuration) > block.timestamp) {
            uint256 _amount =
                (liquidityProvider[_provider]._premiumAllocated * _withdrawalAmount) /
                    liquidityProvider[_provider]._amount;
            liquidityProvider[_provider]._premiumAllocated -= _amount;
            premiumDayPool[DateTimeLibrary.getPresentDayTimestamp()]._surplus += _amount;

            emit PremiumForfeited(_provider, _amount);
        }
    }

    function _allocatePremium(address _provider) private {
        (liquidityProvider[_provider]._premiumAllocated, liquidityProvider[_provider]._isNegativePremium) = getPremium(
            _provider
        );
        liquidityProvider[_provider]._lastPremiumCollected = DateTimeLibrary.getPresentDayTimestamp();
    }

    /**
     * @notice Updates liquidity provider balance
     * @param _provider liquidity provider address
     * @param _amount amount of liquidity added/removed
     * @param _type Transaction type
     */
    function _updateProviderBalance(
        address _provider,
        uint256 _amount,
        TransactionType _type
    ) private {
        if (_type == TransactionType.ADD) liquidityProvider[_provider]._amount += _amount;
        else liquidityProvider[_provider]._amount -= _amount;

        liquidityProvider[_provider]._date = DateTimeLibrary.getPresentDayTimestamp();
    }

    /**
     * @notice Updates liquidity for a given date
     * @param _amount amount of liquidity added/removed
     * @param _type transaction type
     */
    function _updateLiquidity(uint256 _amount, TransactionType _type) private {
        uint256 date = DateTimeLibrary.getPresentDayTimestamp();
        if (_type == TransactionType.ADD) {
            daysActiveLiquidity[date] = getDaysActiveLiquidity(date) + _amount;
            poolBalance += _amount;
        } else {
            daysActiveLiquidity[date] = getDaysActiveLiquidity(date) - _amount;
            poolBalance -= _amount;
        }

        if (date > latestLiquidityEvent) latestLiquidityEvent = date;
    }
}
