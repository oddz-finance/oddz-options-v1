// SPDX-License-Identifier: BSD-4-Clause
pragma solidity ^0.7.0;

import "./IOddzLiquidityPool.sol";
import "../Libs/BokkyPooBahsDateTimeLibrary.sol";
import "hardhat/console.sol";

contract OddzLiquidityPool is Ownable, IOddzLiquidityPool, ERC20("Oddz USD LP token", "oUSD") {
    using SafeMath for uint256;
    using BokkyPooBahsDateTimeLibrary for uint256;

    /**
     * @dev reqBalance represents minum required balance and will be range between 5 and 9
     */
    uint8 public reqBalance = 8;
    uint256 public constant INITIAL_RATE = 1e3;

    /**
     * @dev Liquidity specific data definitions
     */
    uint256 public lockedAmount;
    enum TransactionType { ADD, REMOVE }
    struct LPBalance {
        uint256 currentBalance;
        TransactionType transactionType;
        uint256 transactionValue;
        uint256 transactionDate;
    }
    mapping ( uint256 => uint256 ) public daysActiveLiquidity;
    mapping ( address => LPBalance[] ) internal lpBalanceMap;
    mapping ( address => uint256 ) public latestLiquidityDateMap;
    LockedLiquidity[] public lockedLiquidity;

    /**
     * @dev Premium specific data definitions
     */
    uint256 public lockedPremium;
    uint256 public premiumLockupDuration = 14 days;
    struct PremiumPool {
        uint256 collected;
        uint256 eligible;
        uint256 distributed;
        bool enabled;
    }
    mapping ( uint256 => PremiumPool ) public premiumDayPool;
    uint256 public surplus;
    mapping ( uint256 => uint256 ) internal daysExercise;
    mapping ( address => uint256 ) public lpPremium;
    mapping ( address => mapping ( uint256 => uint256 ) ) public lpPremiumDistributionMap;

    modifier validLiquidty(uint256 _id) {
        LockedLiquidity storage ll = lockedLiquidity[_id];
        require(ll.locked, "LockedLiquidity with given id has already been unlocked");
        _;
    }

    function addLiquidity() external payable override returns (uint256 mint) {
        uint256 supply = totalSupply();
        uint256 balance = totalBalance();
        if (supply > 0 && balance > 0) mint = msg.value.mul(supply).div(balance.sub(msg.value));
        else mint = msg.value.mul(INITIAL_RATE);

        require(mint > 0, "LP: Amount is too small");
        uint256 date = getPresentDayTimestamp();
        daysActiveLiquidity[date] = daysActiveLiquidity[date].add(msg.value);
        updateLpBalance(TransactionType.ADD, date);
        sendEligiblePremiumAdd(latestLiquidityDateMap[msg.sender], date);
        latestLiquidityDateMap[msg.sender] = date;

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
        sendEligiblePremiumRemove(latestLiquidityDateMap[msg.sender], _amount, date);

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

    function unlockLiquidity(uint256 _id) external override onlyOwner validLiquidty(_id) {
        LockedLiquidity storage ll = lockedLiquidity[_id];
        ll.locked = false;
        lockedPremium = lockedPremium.sub(ll.premium);
        lockedAmount = lockedAmount.sub(ll.amount);
        PremiumPool storage dayPremium = premiumDayPool[getPresentDayTimestamp()];
        dayPremium.collected = dayPremium.collected.add(ll.premium);

        emit Profit(_id, ll.premium);
    }

    function send(
        uint256 _id,
        address payable _account,
        uint256 _amount
    ) external override onlyOwner validLiquidty(_id) {
        LockedLiquidity storage ll = lockedLiquidity[_id];
        require(_account != address(0), "Invalid address");

        ll.locked = false;
        uint256 date = getPresentDayTimestamp();
        premiumDayPool[date].collected.add(ll.premium);
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

    function updatePremiumEligibility(uint256 _date) public onlyOwner {
        require(_date < getPresentDayTimestamp(), "LP: Invalid Date");
        PremiumPool storage premium = premiumDayPool[_date];
        require(!premium.enabled, "LP: Premium eligibilty already updated for the date");
        premium.enabled = true;
        premium.eligible = premium.collected.add(surplus).sub(daysExercise[_date]);
        surplus = 0;
    }

    function distributePremiumPerLP(uint256 _date, address _lp) private {
        LPBalance[] storage lpBalance = lpBalanceMap[_lp];
        uint256 len = lpBalance.length;
        require(len > 0, "LP: Invalid liquidity provider");
        require(lpPremiumDistributionMap[_lp][_date] <= 0, "LP: Premium already distributed for the provider");
        while (len > 0 && lpBalance[len - 1].transactionDate <= _date) {
            len --;
        }
        uint256 lpEligible = premiumDayPool[_date].eligible.mul(
            lpBalance[len - 1].currentBalance.div(daysActiveLiquidity[_date])
        );
        lpPremiumDistributionMap[_lp][_date] = lpEligible;
        lpPremium[_lp] = lpPremium[_lp].add(lpEligible);
        premiumDayPool[_date].distributed = premiumDayPool[_date].distributed.add(lpEligible);
    }

    function distributePremium(uint256 _date, address[] memory _lps) public onlyOwner {
        require(_date < getPresentDayTimestamp(), "LP: Invalid Date");
        require(
            premiumDayPool[_date].eligible > premiumDayPool[_date].distributed,
            "LP: Premium already distrbution for this date"
        );
        if (!premiumDayPool[_date].enabled) {
            updatePremiumEligibility(_date);
        }
        for (uint256 lpid=0; lpid < _lps.length; lpid++) {
            distributePremiumPerLP(_date, _lps[lpid]);
        }
    }

    function sendEligiblePremium(address payable _lpProvider) public onlyOwner {
        require(lpPremium[_lpProvider] > 0, "LP: Not eligible for premium");
        require(
            getPresentDayTimestamp().sub(latestLiquidityDateMap[_lpProvider]) > premiumLockupDuration,
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

            emit PremiumForfeited(msg.sender, lostPremium);
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
