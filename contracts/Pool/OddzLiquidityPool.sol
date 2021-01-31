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

    struct Withdarwal {
        uint256 amount;
        uint256 date;
        Liquidity liquidity;
    }

    struct PremiumPool {
        uint256 amount;
        bool distributed;
    }

    Liquidity[] public liquidityInfo;

    mapping(uint256 => uint256) internal daysActiveLiquidity;

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

    struct LpPremium {
        uint256 date;
        uint256 premium;
        Liquidity liquidity;
    }

    mapping(address => LpPremium[]) internal providerDayPremiumEligibiltiy;

    uint256 public surplus;

    mapping(uint256 => uint256) internal daysExercise;

    /**
     * @dev Liquidity Locked for all the active options
     */
    LockedLiquidity[] public lockedLiquidity;

    function addLiquidity() external payable override returns (uint256 mint) {
        addLiquiditySub();
        uint256 supply = totalSupply();
        uint256 balance = totalBalance();
        if (supply > 0 && balance > 0) mint = msg.value.mul(supply).div(balance.sub(msg.value));
        else mint = msg.value.mul(INITIAL_RATE);

        require(mint > 0, "LP: Amount is too small");

        _mint(msg.sender, mint);
        emit AddLiquidity(msg.sender, msg.value, mint);
    }

    function removeLiquidity(uint256 _amount) external override returns (uint256 burn) {
        require(
            _amount <= availableBalance(),
            "LP Error: Not enough funds on the pool contract. Please lower the amount."
        );

        daysActiveLiquidity[getPresentDayTimestamp()].sub(_amount);
        burn = divisionCeiling(_amount.mul(totalSupply()), totalBalance());

        require(burn <= balanceOf(msg.sender), "LP: Amount is too large");
        require(burn > 0, "LP: Amount is too small");

        removeLiquidtySub(_amount);

        _burn(msg.sender, burn);
        emit RemoveLiquidity(msg.sender, _amount, burn);
        msg.sender.transfer(_amount);
    }

    function removeLiquidtySub(uint256 _amount) private {
        uint256 lid = 0;
        while (_amount > 0 && lid < providerLiquidityList[msg.sender].length) {
            Liquidity storage liquidity = providerLiquidityList[msg.sender][lid];
            uint256 remAmount = liquidity.amount.sub(liquidity.withdrawn);
            if (remAmount > 0) {
                if (remAmount > _amount) {
                    liquidity.withdrawn = liquidity.withdrawn.add(_amount);
                    _amount = 0;
                    break;
                } else {
                    liquidity.withdrawn = liquidity.withdrawn.add(remAmount);
                    _amount = _amount.sub(remAmount);
                    lid++;
                }
            }
        }
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

    function addLiquiditySub() private {
        uint256 date = getPresentDayTimestamp();
        daysActiveLiquidity[date] = address(this).balance.add(msg.value);
        // TODO: Check for first time LP
        if (providerLiquidityMap[msg.sender][date].amount > 0) {
            providerLiquidityMap[msg.sender][date].amount.add(msg.value);
        } else {
            uint256 lid = liquidityInfo.length;
            Liquidity memory liquidity =
                Liquidity({ id: lid, provider: msg.sender, date: date, amount: msg.value, withdrawn: 0 });
            liquidityInfo.push(liquidity);
            providerLiquidityMap[msg.sender][date] = liquidity;
            providerLiquidityList[msg.sender].push(liquidity);
            dayLiquidityList[date].push(liquidity);
        }
    }

    function updatePremiumEligibility(uint256 date) external onlyOwner {
        /*
         TODO
          - check for user is admin
          - tranfer reward for the action and allocate some ODDZ token to the caller (Kind of a lottery)
        */
        require(date < getPresentDayTimestamp(), "Invalid Date");
        PremiumPool storage premium = premiumDayPool[date];
        require(premium.distributed == false, "Premium already distrbution for this date");
        premium.distributed = true;
        uint256 premiumProfit = premium.amount + surplus - daysExercise[date];
        if (premiumProfit > 0) {
            distributePremium(premiumProfit, date);
        }
    }

    function distributePremium(uint256 _premiumProfit, uint256 _date) private onlyOwner {}

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
}
