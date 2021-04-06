// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "./IOddzLiquidityPool.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../Libs/BokkyPooBahsDateTimeLibrary.sol";
import "hardhat/console.sol";
import "../Swap/DexManager.sol";

contract OddzLiquidityPool is Ownable, IOddzLiquidityPool, ERC20("Oddz USD LP token", "oUSD") {
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
    DexManager public dexManager;

    modifier validLiquidty(uint256 _id) {
        LockedLiquidity storage ll = lockedLiquidity[_id];
        require(ll.locked, "LockedLiquidity with given id has already been unlocked");
        _;
    }

    constructor(IERC20 _token, DexManager _dexManager) {
        token = _token;
        dexManager = _dexManager;
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
            _amount * 10 <= availableBalance() * reqBalance,
            "LP Error: Not enough funds on the pool contract. Please lower the amount."
        );

        burn = divisionCeiling(_amount * totalSupply(), totalBalance());

        require(burn <= balanceOf(msg.sender), "LP: Amount is too large");
        require(burn > 0, "LP: Amount is too small");

        uint256 date = getPresentDayTimestamp();
        updateLiquidity(date, _amount, TransactionType.REMOVE);
        updateLpBalance(TransactionType.REMOVE, date, _amount);

        // User premium update
        uint256 premium = transferEligiblePremium(date, msg.sender);
        burn = burn + premium;
        _amount = _amount + (totalBalance() * premium / totalSupply());
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
            (lockedAmount + _amount) * 10 <= (totalBalance() - _premium) * reqBalance,
            "LP Error: Amount is too large."
        );
        lockedLiquidity.push(LockedLiquidity(_amount, _premium, true));
        lockedAmount = lockedAmount + _amount;

        // Allocate premium to the self until premium unlock
        _mint(address(this), _premium);
    }

    function unlockLiquidity(uint256 _id) public override onlyOwner validLiquidty(_id) {
        LockedLiquidity storage ll = lockedLiquidity[_id];
        ll.locked = false;
        lockedAmount = lockedAmount - ll.amount;
        PremiumPool storage dayPremium = premiumDayPool[getPresentDayTimestamp()];
        dayPremium.collected = dayPremium.collected + ll.premium;

        emit Profit(_id, ll.premium);
    }

    function send(
        uint256 _id,
        address payable _account,
        uint256 _amount
    ) public override onlyOwner validLiquidty(_id) {
        (uint256 lockedPremium, uint256 transferAmount) = updateAndFetchLockedLiquidity(_id, _account, _amount);
        // Transfer Funds
        token.safeTransfer(_account, transferAmount);
        // Send event
        emitSendEvent(_id, lockedPremium, transferAmount);
    }

    function sendUA(
        uint256 _id,
        address payable _account,
        uint256 _amount,
        bytes32 _underlying,
        bytes32 _strike,
        uint32 _deadline
    ) public override onlyOwner validLiquidty(_id) {
        (uint256 lockedPremium, uint256 transferAmount) = updateAndFetchLockedLiquidity(_id, _account, _amount);
        address exchange = dexManager.getExchange(_underlying, _strike);
        // Transfer Funds
        token.safeTransfer(exchange, transferAmount);
        // block.timestamp + deadline --> deadline from the current block
        dexManager.swap(_strike, _underlying, exchange, _account, transferAmount, block.timestamp + _deadline);
        // Send event
        emitSendEvent(_id, lockedPremium, transferAmount);
    }

    /*
     * @nonce Returns LP's balance in USD
     * @param account Liquidity provider's address
     * @return Liquidity provider's balance in USD
     */
    function usdBalanceOf(address account) external view returns (uint256 share) {
        if (totalSupply() > 0) share = totalBalance() * balanceOf(account) / totalSupply();
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
        if (_type == TransactionType.ADD) balance = balance + _amount;
        else balance = balance - _amount;

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
        require(len > 0, "LP: Invalid liquidity provider");
        require(lpPremiumDistributionMap[_lp][_date] <= 0, "LP: Premium already distributed for the provider");
        while (len > 0 && lpBalance[len - 1].transactionDate > _date) {
            len--;
        }
        uint256 lpEligible =
            premiumDayPool[_date].eligible * (lpBalance[len - 1].currentBalance / getDaysActiveLiquidity(_date));
        lpPremiumDistributionMap[_lp][_date] = lpEligible;
        lpPremium[_lp] = lpPremium[_lp] + lpEligible;
        premiumDayPool[_date].distributed = premiumDayPool[_date].distributed + lpEligible;

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
            (date - latestLiquidityDateMap[msg.sender]) > premiumLockupDuration,
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
                stDate = stDate + (1 days);
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
        require(_account != address(0), "Invalid address");

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
        return token.balanceOf(address(this)) - balanceOf(address(this));
    }

    function getPresentDayTimestamp() internal view returns (uint256 activationDate) {
        (uint256 year, uint256 month, uint256 day) = BokkyPooBahsDateTimeLibrary.timestampToDate(block.timestamp);
        activationDate = BokkyPooBahsDateTimeLibrary.timestampFromDate(year, month, day);
    }

    function divisionCeiling(uint256 _numerator, uint256 _denominator) internal pure returns (uint256) {
        uint256 result = _numerator / _denominator;
        if ((_numerator % (_denominator)) != 0) result++;
        return result;
    }
}
