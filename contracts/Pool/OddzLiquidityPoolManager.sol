// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "./IOddzLiquidityPoolManager.sol";
import "../Libs/DateTimeLibrary.sol";
import "../Libs/ABDKMath64x64.sol";
import "../Swap/DexManager.sol";
import "../OddzSDK.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";

contract OddzLiquidityPoolManager is AccessControl, IOddzLiquidityPoolManager, ERC20("Oddz USD LP token", "oUSD") {
    using Address for address;
    using SafeERC20 for IERC20;

    /**
     * @dev reqBalance represents minimum required balance out of 10
     * Range between 6 and 10
     * e.g. 8 represents 80% of the balance
     */
    uint8 public reqBalance = 8;

    /**
     * @dev Liquidity specific data definitions
     */
    LockedLiquidity[] public lockedLiquidity;
    IERC20 public token;

    // Liquidity lock and distribution data definitions
    mapping(bytes32 => IOddzLiquidityPool[]) public poolMapper;
    mapping(uint8 => uint8) public periodMapper;

    /**
     * @dev Premium specific data definitions
     */
    uint256 public premiumLockupDuration = 14 days;

    /**
     * @dev DEX manager
     */
    DexManager public dexManager;

    /**
     * @dev Oddz SDK
     */
    OddzSDK public sdk;

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

    modifier validLiquidty(uint256 _id) {
        LockedLiquidity storage ll = lockedLiquidity[_id];
        require(ll._locked, "LP Error: LockedLiquidity with given id has already been unlocked");
        _;
    }

    modifier reqBalanceValidRange(uint8 _reqBalance) {
        require(_reqBalance >= 6 && _reqBalance <= 10, "LP Error: required balance valid range [6 - 10]");
        _;
    }

    function setSdk(OddzSDK _sdk) external onlyOwner(msg.sender) {
        require(address(_sdk).isContract(), "invalid SDK contract address");
        sdk = _sdk;
    }

    constructor(IERC20 _token, DexManager _dexManager) {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        token = _token;
        dexManager = _dexManager;

        mapPeriod(1, 1);
        mapPeriod(2, 2);
        mapPeriod(3, 7);
        mapPeriod(4, 7);
        mapPeriod(5, 7);
        mapPeriod(6, 7);
        mapPeriod(7, 7);
        mapPeriod(8, 14);
        mapPeriod(9, 14);
        mapPeriod(10, 14);
        mapPeriod(11, 14);
        mapPeriod(12, 14);
        mapPeriod(13, 14);
        mapPeriod(14, 14);
        mapPeriod(15, 30);
        mapPeriod(16, 30);
        mapPeriod(17, 30);
        mapPeriod(18, 30);
        mapPeriod(19, 30);
        mapPeriod(20, 30);
        mapPeriod(21, 30);
        mapPeriod(22, 30);
        mapPeriod(23, 30);
        mapPeriod(24, 30);
        mapPeriod(25, 30);
        mapPeriod(26, 30);
        mapPeriod(27, 30);
        mapPeriod(28, 30);
        mapPeriod(29, 30);
        mapPeriod(30, 30);
    }

    function mapPeriod(uint8 _source, uint8 _dest) public onlyOwner(msg.sender) {
        periodMapper[_source] = _dest;
    }

    function mapPool(
        address _pair,
        bytes32 _model,
        uint8 _period,
        IOddzLiquidityPool[] memory _pools
    ) public onlyOwner(msg.sender) {
        // TODO: Add additional validation to check pools are repeated
        poolMapper[keccak256(abi.encode(_pair, _model, _period))] = _pools;
    }

    function addLiquidity(
        IOddzLiquidityPool _pool,
        uint256 _amount,
        address _account
    ) external override returns (uint256 mint) {
        address sender_ = msg.sender == address(sdk) ? _account : msg.sender;
        mint = _amount;
        require(mint > 0, "LP Error: Amount is too small");
        uint256 date = getPresentDayTimestamp();
        _pool.addLiquidity(_amount, sender_);
        // transfer user eligible premium
        transferEligiblePremium(date, sender_, _pool);

        _mint(sender_, mint);
        token.safeTransferFrom(sender_, address(this), _amount);
    }

    function removeLiquidity(IOddzLiquidityPool _pool, uint256 _amount) external override returns (uint256 burn) {
        require(
            _amount * 10 <= _pool.availableBalance() * reqBalance,
            "LP Error: Not enough funds in the pool. Please lower the amount."
        );

        uint256 date = getPresentDayTimestamp();
        // burn = _amount + fetch eligible premium if any
        burn = _amount + transferEligiblePremium(date, msg.sender, _pool);
        require(burn <= balanceOf(msg.sender), "LP Error: Amount is too large");
        require(burn > 0, "LP Error: Amount is too small");

        // Pools should hold only oUSD not USDC
        _pool.removeLiquidity(burn, msg.sender);
        // Forfeit premium if less than premium locked period
        updateUserPremium(_amount, date, _pool);
        uint256 transferAmount =
            ABDKMath64x64.mulu(ABDKMath64x64.divu(_pool.totalBalance(), _pool.totalSupply()), burn);
        _burn(msg.sender, burn);
        token.safeTransfer(msg.sender, transferAmount);
    }

    function lockLiquidity(
        uint256 _id,
        uint256 _amount,
        uint256 _premium,
        address _pair,
        bytes32 _model,
        uint8 _period
    ) public override onlyManager(msg.sender) {
        require(_id == lockedLiquidity.length, "LP Error: Invalid id");
        (IOddzLiquidityPool[] memory pools, uint256[] memory poolBalances) =
            getSortedEligiblePools(_pair, _model, _period, _amount);
        require(pools.length > 0, "LP Error: No pool balance");

        uint8 count = 0;
        uint256 totalAmount = _amount;
        uint256 base = totalAmount / pools.length;
        uint256[] memory share = new uint256[](pools.length);
        while (count < pools.length) {
            if (base > poolBalances[count]) {
                totalAmount -= poolBalances[count];
                share[count] = poolBalances[count];
                pools[count].lockLiquidity(poolBalances[count]);
            } else {
                share[count] = base;
                pools[count].lockLiquidity(base);
            }
            base = totalAmount / (pools.length - count);
            count++;
        }
        lockedLiquidity.push(LockedLiquidity(_amount, _premium, true, pools, share));
        // Allocate premium to the self until premium unlock
        _mint(address(this), _premium);
    }

    function unlockLiquidity(uint256 _id) public override onlyManager(msg.sender) validLiquidty(_id) {
        LockedLiquidity storage ll = lockedLiquidity[_id];
        for (uint8 i = 0; i < ll._pools.length; i++) {
            ll._pools[i].unlockLiquidity(ll._share[i]);
            ll._pools[i].unlockPremium(_id, (ll._premium * ll._share[i]) / ll._amount);
        }
        ll._locked = false;
    }

    function send(
        uint256 _id,
        address _account,
        uint256 _amount
    ) public override onlyManager(msg.sender) validLiquidty(_id) {
        (uint256 lockedPremium, uint256 transferAmount) = updateAndFetchLockedLiquidity(_id, _account, _amount);
        // Transfer Funds
        token.safeTransfer(_account, transferAmount);
    }

    function sendUA(
        uint256 _id,
        address _account,
        uint256 _amount,
        bytes32 _underlying,
        bytes32 _strike,
        uint32 _deadline
    ) public override onlyManager(msg.sender) validLiquidty(_id) {
        (uint256 lockedPremium, uint256 transferAmount) = updateAndFetchLockedLiquidity(_id, _account, _amount);
        address exchange = dexManager.getExchange(_underlying, _strike);
        // Transfer Funds
        token.safeTransfer(exchange, transferAmount);
        // block.timestamp + deadline --> deadline from the current block
        dexManager.swap(_strike, _underlying, exchange, _account, transferAmount, block.timestamp + _deadline);
    }

    /**
     * @notice Returns LP's balance in USD
     * @param _account Liquidity provider's address
     * @return share Liquidity provider's balance in USD
     */
    function usdBalanceOf(address _account) external view returns (uint256 share) {
        if (totalSupply() > 0)
            share = ABDKMath64x64.mulu(ABDKMath64x64.divu(totalBalance(), totalSupply()), balanceOf(_account));
        else share = 0;
    }

    /**
     * @notice Distributes the Premium for the Liquidity Provider for the given date
     * @param _date Epoch time for 00:00:00 hours of the date
     * @param _lp active liquidity provider address
     */
    function distributePremiumPerLP(
        uint256 _date,
        address _lp,
        IOddzLiquidityPool _pool
    ) private {
        // Invalid liquidity provider
        if (_pool.activeLiquidity(_lp) <= 0) return;
        require(
            _pool.getPremiumDistribution(_lp, _date) <= 0,
            "LP Error: Premium already distributed for the provider"
        );
        uint256 lpEligible =
            (_pool.getEligiblePremium(_date) * _pool.activeLiquidityByDate(_lp, _date)) /
                _pool.getDaysActiveLiquidity(_date);
        _pool.allocatePremiumToProvider(_lp, lpEligible, _date);

        transferEligiblePremium(getPresentDayTimestamp(), _lp, _pool);
    }

    /**
     * @notice Distributes the Premium for the Liquidity Providers for the given date
     * @param _date Epoch time for 00:00:00 hours of the date
     * @param _lps List of the active liquidity provider addresses
     */
    function distributePremium(
        uint256 _date,
        address[] memory _lps,
        IOddzLiquidityPool _pool
    ) public {
        require(_date < getPresentDayTimestamp(), "LP Error: Invalid Date");
        if (!_pool.isPremiumDistributionEnabled(_date)) {
            _pool.enablePremiumDistribution(_date);
        }
        require(_pool.getEligiblePremium(_date) > 0, "LP Error: No premium collected for the date");
        require(
            _pool.getEligiblePremium(_date) > _pool.getDistributedPremium(_date),
            "LP Error: Premium already distributed for this date"
        );
        for (uint256 lpid = 0; lpid < _lps.length; lpid++) {
            distributePremiumPerLP(_date, _lps[lpid], _pool);
        }
    }

    function transferPremium(IOddzLiquidityPool _pool) external {
        uint256 date = getPresentDayTimestamp();
        require(
            _pool.activeLiquidity(msg.sender) > 0 &&
                (date - _pool.latestLiquidityDate(msg.sender)) > premiumLockupDuration,
            "LP Error: Address not eligible for premium collection"
        );
        transferEligiblePremium(date, msg.sender, _pool);
    }

    /**
     * @notice sends the eligible premium for the provider address while add liquidity
     * @param _date liquidity date
     * @param _lp liquidity provider address
     * @param _pool liquidity pool
     */
    function transferEligiblePremium(
        uint256 _date,
        address _lp,
        IOddzLiquidityPool _pool
    ) private returns (uint256 premium) {
        if (_date - _pool.latestLiquidityDate(_lp) <= premiumLockupDuration) return 0;
        premium = _pool.collectPremium(_lp);

        _transfer(address(this), _lp, premium);
    }

    /**
     * @notice updates eligible premium for the provider address while remove liquidity
     * @param _amount amount of liquidity removed
     * @param _date liquidity date
     * @param _pool liquidity pool
     */
    function updateUserPremium(
        uint256 _amount,
        uint256 _date,
        IOddzLiquidityPool _pool
    ) private {
        if (_pool.getPremium(msg.sender) <= 0) return;
        uint256 balance = _pool.activeLiquidity(msg.sender);
        require(balance > 0, "LP Error: current balance is less than or equal to zero");
        if (_date - (_pool.latestLiquidityDate(msg.sender)) <= premiumLockupDuration) {
            _pool.forfeitPremium(msg.sender, (_pool.getPremium(msg.sender) * _amount) / balance);
        }
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
        require(_account != address(0), "LP Error: Invalid address");
        ll._locked = false;
        lockedPremium = ll._premium;
        transferAmount = _amount;
        if (_amount > ll._amount) transferAmount = ll._amount;

        for (uint8 i = 0; i < ll._pools.length; i++) {
            ll._pools[i].unlockLiquidity(ll._share[i]);
            ll._pools[i].unlockPremium(_lid, (ll._premium * ll._share[i]) / ll._amount);
            // TODO: update oUSD supply in the pool
        }
    }

    function totalBalance() public view override returns (uint256 balance) {
        // though balance is oUSD its 1 - 1 minted for premium in USD
        return token.balanceOf(address(this)) - balanceOf(address(this));
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
     @dev sets required balance
     @param _reqBalance required balance between 6 and 9
     Note: This can be called only by the owner
     */
    function setReqBalance(uint8 _reqBalance) public onlyOwner(msg.sender) reqBalanceValidRange(_reqBalance) {
        reqBalance = _reqBalance;
    }

    function getSortedEligiblePools(
        address _pair,
        bytes32 _model,
        uint8 _period,
        uint256 _amount
    ) public view returns (IOddzLiquidityPool[] memory pools, uint256[] memory poolBalance) {
        IOddzLiquidityPool[] memory allPools = poolMapper[keccak256(abi.encode(_pair, _model, periodMapper[_period]))];
        uint256 balance = 0;
        uint256 count = 0;
        for (uint8 i = 0; i < allPools.length; i++) {
            if (allPools[i].availableBalance() > 0) {
                count++;
                balance += allPools[i].availableBalance();
            }
        }
        poolBalance = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            pools[i] = allPools[i];
            poolBalance[i] = allPools[i].availableBalance();
        }
        (poolBalance, pools) = sort(poolBalance, pools);
        require(balance > _amount, "LP Error: Amount is too large.");
    }

    function sort(uint256[] memory data, IOddzLiquidityPool[] memory pools)
        internal
        pure
        returns (uint256[] memory, IOddzLiquidityPool[] memory)
    {
        uint256 length = data.length;
        for (uint256 i = 1; i < length; i++) {
            uint256 key = data[i];
            IOddzLiquidityPool val = pools[i];
            uint256 j = i - 1;
            while ((int256(j) >= 0) && (data[j] > key)) {
                data[j + 1] = data[j];
                pools[j + 1] = pools[j];
                j--;
            }
            data[j + 1] = key;
            pools[j + 1] = val;
        }
        return (data, pools);
    }

    /**
     * @dev get day based on the timestamp
     */
    function getPresentDayTimestamp() internal view returns (uint256 activationDate) {
        (uint256 year, uint256 month, uint256 day) = DateTimeLibrary.timestampToDate(block.timestamp);
        activationDate = DateTimeLibrary.timestampFromDate(year, month, day);
    }
}
