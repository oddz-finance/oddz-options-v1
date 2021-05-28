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

    /**
     * @notice Add liquidity for the day
     * @param _amount USD value
     * @param _provider Address of the Liquidity Provider
     */
    function addLiquidity(uint256 _amount, address _provider) external override onlyOwner {
        require(_amount > 0, "LP Error: Amount is too small");
        _updateLiquidity(_amount, TransactionType.ADD);
        _allocatePremium(_provider);
        _updateProviderBalance(TransactionType.ADD, _amount, _provider);
        oUsdSupply += _amount;

        emit AddLiquidity(_provider, _amount);
    }

    /**
     * @notice Provider burns oUSD and receives USD from the pool
     * @param _amount Amount of USD to receive
     * @param _oUSD Amount of oUSD to be burnt
     * @param _provider Address of the Liquidity Provider
     * @param _lockDuration premium lockup days
     */
    function removeLiquidity(
        uint256 _amount,
        uint256 _oUSD,
        address _provider,
        uint256 _lockDuration
    ) external override onlyOwner {
        require(
            _amount <=
                liquidityProvider[_provider]._amount -
                    (
                        (liquidityProvider[_provider]._isNegativePremium)
                            ? liquidityProvider[_provider]._premiumAllocated
                            : 0
                    ),
            "LP Error: Amount is too large"
        );
        require(_amount > 0, "LP Error: Amount is too small");

        _updateLiquidity(_amount, TransactionType.REMOVE);
        _allocatePremium(_provider);
        _forfeitPremium(_provider, _amount, _lockDuration);
        _updateProviderBalance(TransactionType.REMOVE, _amount, _provider);
        oUsdSupply -= _oUSD;

        emit RemoveLiquidity(_provider, _amount, _oUSD);
    }

    /**
     * @notice called by Oddz call options to lock the funds
     * @param _amount Amount of funds that should be locked in an option
     * @param _premium premium allocated to the pool
     */
    function lockLiquidity(uint256 _amount, uint256 _premium) external override onlyOwner {
        require(_amount <= availableBalance(), "LP Error: Amount is too large.");
        lockedAmount = lockedAmount + _amount;
        oUsdSupply += _premium;
    }

    /**
     * @notice called by Oddz option to unlock the funds
     * @param _amount Amount of funds that should be unlocked in an option
     */
    function unlockLiquidity(uint256 _amount) external override onlyOwner {
        require(_amount > 0, "LP Error: Amount is too small");
        lockedAmount = lockedAmount - _amount;
    }

    /**
     * @notice Allocate premium to pool
     * @param _lid liquidity ID
     * @param _amount Premium amount
     */
    function unlockPremium(uint256 _lid, uint256 _amount) external override onlyOwner {
        PremiumPool storage dayPremium = premiumDayPool[DateTimeLibrary.getPresentDayTimestamp()];
        dayPremium._collected = dayPremium._collected + _amount;
        oUsdSupply -= _amount;

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
        oUsdSupply -= _transfer;

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
        require(!liquidityProvider[_provider]._isNegativePremium, "LP Error: Premium is negative");
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
     * @notice Returns the total supply allocated for the pool
     * @return balance total supply allocated to the pool
     */
    function totalSupply() external view override returns (uint256) {
        return oUsdSupply;
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

        (uint256 tLiquidty, uint256 tReward, uint256 tExercised, uint256 count) = _getPremium(_provider);

        if (tLiquidty == 0)
            return (liquidityProvider[_provider]._premiumAllocated, liquidityProvider[_provider]._isNegativePremium);

        rewards = liquidityProvider[_provider]._premiumAllocated;

        if (liquidityProvider[_provider]._isNegativePremium) {
            if (tExercised + rewards > tReward) rewards += tExercised - tReward;
            else {
                rewards = tReward - (tExercised + rewards);
                isNegative = false;
            }
        } else {
            if (tExercised > tReward + rewards) {
                rewards = tExercised - (tReward + rewards);
                isNegative = true;
            } else rewards += tReward - tExercised;
        }
        rewards = ((liquidityProvider[_provider]._amount * count * rewards) / tLiquidty);
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

    function _getPremium(address _provider)
        private
        view
        returns (
            uint256 tLiquidty,
            uint256 tReward,
            uint256 tExercised,
            uint256 count
        )
    {
        uint256 startDate;
        if (liquidityProvider[_provider]._lastPremiumCollected > 0)
            startDate = liquidityProvider[_provider]._lastPremiumCollected;
        else startDate = liquidityProvider[_provider]._date;

        // premium should always be calculated for one day less
        count = (DateTimeLibrary.getPresentDayTimestamp() - startDate) / 1 days;
        PremiumPool memory pd;
        for (uint256 i = 0; i < count; i++) {
            // (startDate + (i * 1 days), daysActiveLiquidity[startDate + (i * 1 days)]);
            tLiquidty += daysActiveLiquidity[startDate + (i * 1 days)];
            pd = premiumDayPool[startDate + (i * 1 days)];
            tReward += pd._collected + pd._surplus;
            tExercised += pd._exercised;
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
     * @param _type Transaction type
     * @param _amount amount of liquidity added/removed
     */
    function _updateProviderBalance(
        TransactionType _type,
        uint256 _amount,
        address _provider
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
