// SPDX-License-Identifier: BSD-4-Clause
pragma solidity ^0.7.0;

import "./IOddzLiquidityPool.sol";
import "../Libs/BokkyPooBahsDateTimeLibrary.sol";

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

    /**
     * @dev premiumDayPool unlocked premium per day
     */
    mapping ( uint256 => uint256 ) premiumDayPool;

    struct Liquidity {
        uint256 id;
        address provider;
        uint256 utcActivateDate;
        uint256 amount;
    }
    Liquidity[] public liquidityInfo;

    /**
     * @dev The Provider aggregators data. (Provider address => epoch (Liquidity Acitve Date UTC) => Liquidity)
     */
    mapping (address => mapping ( uint256 => Liquidity )) public providerLiquidityMap;

    LockedLiquidity[] public lockedLiquidity;

    event LiquidityActivation (
        uint256 liquidityId,
        address provider,
        uint256 activationDate
    );

    function provide() external payable override returns (uint256 mint) {
        uint256 lid = liquidityInfo.length;
        uint256 activationDate = getPresentDayTimestamp() + 1 days;
        Liquidity memory liquidity = Liquidity(
            {
                id: lid,
                provider: msg.sender,
                utcActivateDate: activationDate,
                amount: msg.value
            }
        );
        liquidityInfo.push(liquidity);
        providerLiquidityMap[msg.sender][activationDate] = liquidity;

        uint supply = totalSupply();
        uint balance = totalBalance();
        if (supply > 0 && balance > 0)
            mint = msg.value.mul(supply).div(balance.sub(msg.value));
        else
            mint = msg.value.mul(INITIAL_RATE);

        require(mint > 0, "Pool: Amount is too small");

        _mint(msg.sender, mint);
        emit Provide(msg.sender, msg.value, mint);
        emit LiquidityActivation(lid, msg.sender, activationDate);
    }

    function withdraw(uint256 _amount) external override returns (uint256 burn) {
        require(
            _amount <= availableBalance(),
            "Pool Error: Not enough funds on the pool contract. Please lower the amount."
        );

        burn = divCeil(_amount.mul(totalSupply()), totalBalance());

        require(burn <= balanceOf(msg.sender), "Pool: Amount is too large");
        require(burn > 0, "Pool: Amount is too small");

        _burn(msg.sender, burn);
        emit Withdraw(msg.sender, _amount, burn);
        msg.sender.transfer(_amount);
    }

    function lock(uint256 _id, uint256 _amount) external payable override onlyOwner {
        require(_id == lockedLiquidity.length, "Wrong id");
        require(
            lockedAmount.add(_amount).mul(10) <= totalBalance().sub(msg.value).mul(reqBalance),
            "Pool Error: Amount is too large."
        );

        lockedLiquidity.push(LockedLiquidity(_amount, msg.value, true));
        lockedPremium = lockedPremium.add(msg.value);
        lockedAmount = lockedAmount.add(_amount);
    }

    function unlock(uint256 _id) external override onlyOwner {
        LockedLiquidity storage ll = lockedLiquidity[_id];
        require(ll.locked, "LockedLiquidity with such id has already unlocked");
        ll.locked = false;

        lockedPremium = lockedPremium.sub(ll.premium);
        lockedAmount = lockedAmount.sub(ll.amount);
        premiumDayPool[getPresentDayTimestamp()].add(ll.premium);

        emit Profit(_id, ll.premium);
    }

    function send(
        uint256 _id,
        address payable _account,
        uint256 _amount
    ) external override onlyOwner {
        LockedLiquidity storage ll = lockedLiquidity[_id];
        require(ll.locked, "LockedLiquidity with such id has already unlocked");
        require(_account != address(0));

        ll.locked = false;
        premiumDayPool[getPresentDayTimestamp()].add(ll.premium);
        lockedPremium = lockedPremium.sub(ll.premium);
        lockedAmount = lockedAmount.sub(ll.amount);

        uint transferAmount = _amount > ll.amount ? ll.amount : _amount;
        _account.transfer(transferAmount);

        if (transferAmount <= ll.premium)
            emit Profit(_id, ll.premium - transferAmount);
        else
            emit Loss(_id, transferAmount - ll.premium);
    }

    function sendUA(
        uint256 _id,
        address payable _account,
        uint256 _amount
    ) external onlyOwner {}

    function availableBalance() public view override returns (uint256 balance) {
        return totalBalance().sub(lockedAmount);
    }

    function totalBalance() public view override returns (uint256 balance) {
        return address(this).balance.sub(lockedPremium);
    }

    function getPresentDayTimestamp() private view returns (uint256 activationDate)  {
        (uint256 year, uint256 month, uint256 day) = BokkyPooBahsDateTimeLibrary.timestampToDate(block.timestamp);
        activationDate = BokkyPooBahsDateTimeLibrary.timestampFromDate(year, month, day);
    }

    function divCeil(uint256 a, uint256 b) internal pure returns (uint256) {
        require(b > 0);
        uint256 c = a / b;
        if (a % b != 0)
            c = c + 1;
        return c;
    }
}
