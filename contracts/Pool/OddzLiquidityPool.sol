// SPDX-License-Identifier: BSD-4-Clause
pragma solidity ^0.7.0;

import "./IOddzLiquidityPool.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "../Libs/BokkyPooBahsDateTimeLibrary.sol";
import "hardhat/console.sol";
import "../Integrations/Dex/SwapUnderlyingAsset.sol";

contract OddzLiquidityPool is Ownable, IOddzLiquidityPool, ERC20("Oddz USD LP token", "oUSD") {
    using SafeMath for uint256;
    using BokkyPooBahsDateTimeLibrary for uint256;
    using SafeERC20 for IERC20;

    /**
     * @dev reqBalance represents minum required balance and will be range between 5 and 9
     */
    uint8 public reqBalance = 8;

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
    SwapUnderlyingAsset public swapUnderlyingAsset;

    modifier validLiquidty(uint256 _id) {
        LockedLiquidity storage ll = lockedLiquidity[_id];
        require(ll.locked, "LockedLiquidity with given id has already been unlocked");
        _;
    }

    constructor(IERC20 _token, SwapUnderlyingAsset _swapUnderlyingAsset) {
        token = _token;
        swapUnderlyingAsset = _swapUnderlyingAsset;
    }

    function addLiquidity(uint256 _amount) external override returns (uint256 mint) {
        mint = _amount;

        require(mint > 0, "LP: Amount is too small");
        uint256 date = getPresentDayTimestamp();
        // transfer user eligible premium
        transferEligiblePremium(date, msg.sender);

        updateLiquidity(date, _amount, TransactionType.ADD);
        updateLpBalance(TransactionType.ADD, date, _amount);
        latestLiquidityDateMap[msg.sender] = date;

        _mint(msg.sender, mint);

        emit AddLiquidity(msg.sender, _amount, mint);

        token.safeTransferFrom(msg.sender, address(this), _amount);
    }

    function removeLiquidity(uint256 _amount) external override returns (uint256 burn) {
        require(
            _amount.mul(10) <= availableBalance().mul(reqBalance),
            "LP Error: Not enough funds on the pool contract. Please lower the amount."
        );

        burn = divisionCeiling(_amount.mul(totalSupply()), totalBalance());

        require(burn <= balanceOf(msg.sender), "LP: Amount is too large");
        require(burn > 0, "LP: Amount is too small");

        uint256 date = getPresentDayTimestamp();
        updateLiquidity(date, _amount, TransactionType.REMOVE);
        updateLpBalance(TransactionType.REMOVE, date, _amount);

        // User premium update
        uint256 premium = transferEligiblePremium(date, msg.sender);
        burn = burn.add(premium);
        _amount = _amount.add(totalBalance().mul(premium).div(totalSupply()));
        updateUserPremium(latestLiquidityDateMap[msg.sender], _amount, date);

        _burn(msg.sender, burn);

        emit RemoveLiquidity(msg.sender, _amount, burn);

        require(token.transfer(msg.sender, _amount), "LP Error: Insufficient funds");
    }

    function lockLiquidity(
        uint256 _id,
        uint256 _amount,
        uint256 _premium
    ) public override onlyOwner {
        require(_id == lockedLiquidity.length, "LP: Invalid id");
        require(
            lockedAmount.add(_amount).mul(10) <= totalBalance().sub(_premium).mul(reqBalance),
            "LP Error: Amount is too large."
        );
        lockedLiquidity.push(LockedLiquidity(_amount, _premium, true));
        lockedAmount = lockedAmount.add(_amount);

        // Allocate premium to the self until premium unlock
        _mint(address(this), _premium);
    }

    function unlockLiquidity(uint256 _id) public override onlyOwner validLiquidty(_id) {
        LockedLiquidity storage ll = lockedLiquidity[_id];
        ll.locked = false;
        lockedAmount = lockedAmount.sub(ll.amount);
        PremiumPool storage dayPremium = premiumDayPool[getPresentDayTimestamp()];
        dayPremium.collected = dayPremium.collected.add(ll.premium);

        emit Profit(_id, ll.premium);
    }

    function send(
        uint256 _id,
        address payable _account,
        uint256 _amount
    ) public override onlyOwner validLiquidty(_id) {
        LockedLiquidity storage ll = lockedLiquidity[_id];
        require(_account != address(0), "Invalid address");

        ll.locked = false;
        uint256 date = getPresentDayTimestamp();
        lockedAmount = lockedAmount.sub(ll.amount);

        uint256 transferAmount = _amount;
        if (_amount > ll.amount) transferAmount = ll.amount;

        // Premium calculation
        premiumDayPool[date].collected.add(ll.premium);
        daysExercise[date].add(ll.amount);

        token.safeTransfer(_account, transferAmount);

        if (transferAmount <= ll.premium) emit Profit(_id, ll.premium - transferAmount);
        else emit Loss(_id, transferAmount - ll.premium);
    }

    /*
     * @nonce Returns LP's balance in USD
     * @param account Liquidity provider's address
     * @return Liquidity provider's balance in USD
     */
    function usdBalanceOf(address account) external view returns (uint256 share) {
        if (totalSupply() > 0) share = totalBalance().mul(balanceOf(account)).div(totalSupply());
        else share = 0;
    }

    /*
     * @nonce Returns LP's active liquidty
     * @param account Liquidity provider's address
     * @return Liquidity provider's active liquidity in USD
     */
    function activeLiquidity(address account) public view returns (uint256 share) {
        LPBalance[] storage lpBalanceList = lpBalanceMap[account];
        if (lpBalanceList.length > 0) return lpBalanceList[lpBalanceList.length - 1].currentBalance;
        return 0;
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
        uint256 _amount
    ) private {
        uint256 balance = activeLiquidity(msg.sender);
        if (_type == TransactionType.ADD) balance = balance.add(_amount);
        else balance = balance.sub(_amount);

        lpBalanceMap[msg.sender].push(LPBalance(balance, _type, _amount, _date));
    }

    /**
     * @notice Updates Premium Eligibility for the given date
     * @param _date Epoch time for 00:00:00 hours of the date
     */
    function updatePremiumEligibility(uint256 _date) public {
        require(_date < getPresentDayTimestamp(), "LP: Invalid Date");
        PremiumPool storage premium = premiumDayPool[_date];
        require(!premium.enabled, "LP: Premium eligibilty already updated for the date");
        premium.enabled = true;
        premium.eligible = premium.collected.add(surplus).sub(daysExercise[_date]);
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
        require(len > 0, "LP: Invalid liquidity provider");
        require(lpPremiumDistributionMap[_lp][_date] <= 0, "LP: Premium already distributed for the provider");
        while (len > 0 && lpBalance[len - 1].transactionDate > _date) {
            len = len.sub(1);
        }
        uint256 lpEligible =
            premiumDayPool[_date].eligible.mul(lpBalance[len - 1].currentBalance.div(getDaysActiveLiquidity(_date)));
        lpPremiumDistributionMap[_lp][_date] = lpEligible;
        lpPremium[_lp] = lpPremium[_lp].add(lpEligible);
        premiumDayPool[_date].distributed = premiumDayPool[_date].distributed.add(lpEligible);

        transferEligiblePremium(_date, _lp);
    }

    /**
     * @notice Distributes the Premium for the Liquidity Providers for the given date
     * @param _date Epoch time for 00:00:00 hours of the date
     * @param _lps List of the active liquidity provider addresses
     */
    function distributePremium(uint256 _date, address[] memory _lps) public {
        require(_date < getPresentDayTimestamp(), "LP: Invalid Date");
        if (!premiumDayPool[_date].enabled) {
            updatePremiumEligibility(_date);
        }
        require(premiumDayPool[_date].eligible > 0, "LP: No premium collected for the date");
        require(
            premiumDayPool[_date].eligible > premiumDayPool[_date].distributed,
            "LP: Premium already distributed for this date"
        );
        for (uint256 lpid = 0; lpid < _lps.length; lpid++) {
            distributePremiumPerLP(_date, _lps[lpid]);
        }
    }

    function transferPremium() external {
        uint256 date = getPresentDayTimestamp();
        require(
            date.sub(latestLiquidityDateMap[msg.sender]) > premiumLockupDuration,
            "LP: Address not eligible for premium collection"
        );
        transferEligiblePremium(date, msg.sender);
    }

    /**
     * @notice sends the eligible premium for the provider address while add liquidity
     * @param _date liquidity date
     * @param _lp liquidity provider address
     */
    function transferEligiblePremium(uint256 _date, address _lp) private returns (uint256 premium) {
        if (_date.sub(latestLiquidityDateMap[_lp]) <= premiumLockupDuration) return 0;

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
        if (_date.sub(_latestLiquidityDate) <= premiumLockupDuration) {
            uint256 lostPremium = lpPremium[msg.sender].mul(_amount).div(activeLiquidity(msg.sender));
            lpPremium[msg.sender] = lpPremium[msg.sender].sub(lostPremium);
            surplus = surplus.add(lostPremium);

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
            daysActiveLiquidity[_date] = getDaysActiveLiquidity(_date).add(_amount);
        } else {
            daysActiveLiquidity[_date] = getDaysActiveLiquidity(_date).sub(_amount);
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
                stDate = stDate.add(1 days);
            }
        }
        _liquidity = daysActiveLiquidity[_date];
    }

    function availableBalance() public view override returns (uint256 balance) {
        return totalBalance().sub(lockedAmount);
    }

    function totalBalance() public view override returns (uint256 balance) {
        return token.balanceOf(address(this)).sub(balanceOf(address(this)));
    }

    function getPresentDayTimestamp() internal view returns (uint256 activationDate) {
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
        uint256 _amount,
        bytes32 _underlyingAsset
    ) external override onlyOwner validLiquidty(_id) {
        LockedLiquidity storage ll = lockedLiquidity[_id];
        require(_account != address(0), "Invalid address");

        ll.locked = false;
        uint256 date = getPresentDayTimestamp();
        lockedAmount = lockedAmount.sub(ll.amount);

        uint256 transferAmount = _amount;
        if (_amount > ll.amount) transferAmount = ll.amount;

        // Premium calculation
        premiumDayPool[date].collected.add(ll.premium);
        daysExercise[date].add(ll.amount);

        //token.safeTransfer(_account, transferAmount);

        token.transfer(address(swapUnderlyingAsset), transferAmount);
        swapUnderlyingAsset.swapTokensForETH(address(token), _underlyingAsset, transferAmount, 0, 1000000000000);

        if (transferAmount <= ll.premium) emit Profit(_id, ll.premium - transferAmount);
        else emit Loss(_id, transferAmount - ll.premium);
    }
}
