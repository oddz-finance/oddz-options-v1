// SPDX-License-Identifier: BSD-4-Clause
pragma solidity ^0.7.0;

import "./IOddzLiquidityPool.sol";
import "../Libs/BokkyPooBahsDateTimeLibrary.sol";
import "hardhat/console.sol";

contract OddzLiquidityPool is Ownable, IOddzLiquidityPool, ERC20("Oddz USD LP token", "oUSD") {
    using SafeMath for uint256;
    using BokkyPooBahsDateTimeLibrary for uint256;

    uint256 public constant INITIAL_RATE = 1e3;
    uint256 public lockedAmount;
    uint256 public lockedPremium;
    uint256 public premiumLockupDuration = 14 days;
    /**
     * @dev reqBalance represents minum required balance and will be range between 5 and 9
     */
    uint8 public reqBalance = 8;

    struct Liquidity {
        uint256 id;
        address provider;
        uint256 date;
        uint256 amount;
        uint256 withdrawn;
    }

    struct PremiumPool {
        uint256 amount;
        bool distributed;
    }

    Liquidity[] public liquidityInfo;

    mapping(uint256 => uint256) public daysActiveLiquidity;

    /**
     * @dev The Provider aggregators data. (Provider address => epoch (Liquidity date) => Liquidity)
     */
    mapping(address => mapping(uint256 => Liquidity)) internal providerLiquidityMap;

    mapping(address => Liquidity[]) internal providerLiquidityList;

    mapping(uint256 => Liquidity[]) internal dayLiquidityList;

    /**
     * @dev premiumDayPool unlocked premium per day (date => PremiumPool)
     */
    mapping(uint256 => PremiumPool) internal premiumDayPool;

    uint256 public surplus;

    mapping(uint256 => uint256) internal daysExercise;

    mapping ( address => LPBalance[]) internal lpBalanceMap;

    enum TransactionType { ADD, REMOVE }

    struct LPBalance {
        uint256 currentBalance;
        TransactionType transactionType;
        uint256 transactionValue;
        uint256 transactionDate;
    }

    mapping ( address => uint256 ) public latestLiquidityDate;

    mapping ( address => uint256 ) public lpPremium;

    /**
     * @dev Liquidity Locked for all the active options
     */
    LockedLiquidity[] public lockedLiquidity;

    function addLiquidity() external payable override returns (uint256 mint) {
        uint256 supply = totalSupply();
        uint256 balance = totalBalance();
        if (supply > 0 && balance > 0) mint = msg.value.mul(supply).div(balance.sub(msg.value));
        else mint = msg.value.mul(INITIAL_RATE);

        require(mint > 0, "LP: Amount is too small");
        uint256 date = getPresentDayTimestamp();
        daysActiveLiquidity[date] = daysActiveLiquidity[date].add(msg.value);
        updateLpBalance(TransactionType.ADD, date);
        sendEligiblePremiumAdd(latestLiquidityDate[msg.sender], date);
        latestLiquidityDate[msg.sender] = date;

        _mint(msg.sender, mint);
        emit AddLiquidity(msg.sender, msg.value, mint);
    }

    function removeLiquidity(uint256 _amount) external override returns (uint256 burn) {
        require(
            _amount <= availableBalance(),
            "LP Error: Not enough funds on the pool contract. Please lower the amount."
        );

        burn = divisionCeiling(_amount.mul(totalSupply()), totalBalance());

        require(burn <= balanceOf(msg.sender), "LP: Amount is too large");
        require(burn > 0, "LP: Amount is too small");

        uint256 date = getPresentDayTimestamp();
        daysActiveLiquidity[date] = daysActiveLiquidity[date].sub(_amount);
        updateLpBalance(TransactionType.REMOVE, date);
        sendEligiblePremiumRemove(latestLiquidityDate[msg.sender], _amount, date);

        _burn(msg.sender, burn);
        emit RemoveLiquidity(msg.sender, _amount, burn);
        msg.sender.transfer(_amount);
    }

    function lockLiquidity(uint256 _id, uint256 _amount) external payable override onlyOwner {
        require(_id == lockedLiquidity.length, "LP: Invalid id");
        require(
            lockedAmount.add(_amount).mul(10) <= totalBalance().sub(msg.value).mul(reqBalance),
            "LP Error: Amount is too large."
        );

        lockedLiquidity.push(LockedLiquidity(_amount, msg.value, true));
        lockedPremium = lockedPremium.add(msg.value);
        lockedAmount = lockedAmount.add(_amount);
    }

    function unlockLiquidity(uint256 _id) external override onlyOwner {
        LockedLiquidity storage ll = lockedLiquidity[_id];
        require(ll.locked, "LockedLiquidity with given id has already been unlocked");
        ll.locked = false;

        lockedPremium = lockedPremium.sub(ll.premium);
        lockedAmount = lockedAmount.sub(ll.amount);
        premiumDayPool[getPresentDayTimestamp()].amount.add(ll.premium);

        emit Profit(_id, ll.premium);
    }

    function send(
        uint256 _id,
        address payable _account,
        uint256 _amount
    ) external override onlyOwner {
        LockedLiquidity storage ll = lockedLiquidity[_id];
        require(ll.locked, "LockedLiquidity with such id has already unlocked");
        require(_account != address(0), "Invalid address");

        ll.locked = false;
        uint256 date = getPresentDayTimestamp();
        premiumDayPool[date].amount.add(ll.premium);
        lockedPremium = lockedPremium.sub(ll.premium);
        lockedAmount = lockedAmount.sub(ll.amount);

        uint256 transferAmount = _amount > ll.amount ? ll.amount : _amount;
        daysExercise[date].add(transferAmount);
        _account.transfer(transferAmount);

        if (transferAmount <= ll.premium) emit Profit(_id, ll.premium - transferAmount);
        else emit Loss(_id, transferAmount - ll.premium);
    }

    function updateLpBalance(TransactionType _type, uint256 _date) private {
        LPBalance[] storage lpBalanceList = lpBalanceMap[msg.sender];

        uint256 currentBalance = msg.value;

        if (lpBalanceList.length > 0) {
            if (_type == TransactionType.ADD)
                currentBalance = lpBalanceList[lpBalanceList.length - 1].currentBalance.add(currentBalance);
            else
                currentBalance = lpBalanceList[lpBalanceList.length - 1].currentBalance.sub(currentBalance);
        }

        lpBalanceList.push(LPBalance(
            currentBalance,
            TransactionType.ADD,
            msg.value,
            _date
        ));
    }

    function updatePremiumEligibility(uint256 date) external onlyOwner {
        require(date < getPresentDayTimestamp(), "Invalid Date");
        PremiumPool storage premium = premiumDayPool[date];
        require(premium.distributed == false, "Premium already distrbution for this date");
        premium.distributed = true;
        uint256 premiumProfit = premium.amount + surplus - daysExercise[date];
        if (premiumProfit > 0) {
            distributePremium(premiumProfit, date);
        }
    }

    function distributePremium(uint256 _premiumProfit, uint256 _date) private {}

    function sendEligiblePremium(address payable _lpProvider) public onlyOwner {
        require(
            getPresentDayTimestamp().sub(latestLiquidityDate[_lpProvider]) > premiumLockupDuration,
            "LP: Address not eligible for premium collection"
        );
        uint256 premium = lpPremium[_lpProvider];
        lpPremium[_lpProvider] = 0;
        _lpProvider.transfer(premium);
        emit PremiumCollected(_lpProvider, premium);
    }

    function sendEligiblePremiumAdd(uint256 _latestLiquidityDate, uint256 _date) private {
        if (_date.sub(_latestLiquidityDate) <= premiumLockupDuration) {
            return;
        }
        uint256 premium = lpPremium[msg.sender];
        lpPremium[msg.sender] = 0;
        msg.sender.transfer(premium);
        emit PremiumCollected(msg.sender, premium);
    }

    function sendEligiblePremiumRemove(uint256 _latestLiquidityDate, uint256 _amount, uint256 _date) private {
        uint256 premium = lpPremium[msg.sender];
        if (premium <= 0) {
            return;
        }
        if (_date.sub(_latestLiquidityDate) <= premiumLockupDuration) {
            LPBalance[] memory lpBalance = lpBalanceMap[msg.sender];
            uint256 lostPremium = premium.sub(
                _amount.div(lpBalanceMap[msg.sender][lpBalance.length].currentBalance)
            );
            lpPremium[msg.sender] = premium.sub(lostPremium);
            surplus.add(lostPremium);

            PremiumForfeited(msg.sender, lostPremium);
        } else {
            lpPremium[msg.sender] = 0;
            msg.sender.transfer(premium);

            emit PremiumCollected(msg.sender, premium);
        }
    }

    function availableBalance() public view override returns (uint256 balance) {
        return totalBalance().sub(lockedAmount);
    }

    function totalBalance() public view override returns (uint256 balance) {
        return address(this).balance.sub(lockedPremium);
    }

    function getPresentDayTimestamp() private view returns (uint256 activationDate) {
        (uint256 year, uint256 month, uint256 day) = BokkyPooBahsDateTimeLibrary.timestampToDate(block.timestamp);
        activationDate = BokkyPooBahsDateTimeLibrary.timestampFromDate(year, month, day);
    }

    function divisionCeiling(uint256 _numerator, uint256 _denominator) internal pure returns (uint256) {
        uint256 result = _numerator.div(_denominator, "Invalid Denominator");
        if (_numerator.mod(_denominator) != 0) result = result + 1;
        return result;
    }

    function sendUA(
        uint256 _id,
        address payable _account,
        uint256 _amount
    ) external onlyOwner {}
}
