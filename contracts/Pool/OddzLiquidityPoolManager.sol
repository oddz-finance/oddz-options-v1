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
    mapping(uint256 => bool) public allowedMaxExpiration;
    mapping(uint256 => uint256) public periodMapper;
    mapping(bytes32 => IOddzLiquidityPool[]) public poolMapper;
    mapping(bytes32 => bool) public uniquePoolMapper;

    struct PoolTransfer {
        IOddzLiquidityPool[] _source;
        IOddzLiquidityPool[] _destination;
        uint256[] _sAmount;
        uint256[] _dAmount;
    }

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
        require(ll._locked, "LP Error: liquidity has already been unlocked");
        _;
    }

    modifier reqBalanceValidRange(uint8 _reqBalance) {
        require(_reqBalance >= 6 && _reqBalance <= 10, "LP Error: required balance valid range [6 - 10]");
        _;
    }

    modifier validMaxExpiration(uint256 _maxExpiration) {
        require(allowedMaxExpiration[_maxExpiration] == true, "LP Error: invalid maximum expiration");
        _;
    }

    constructor(IERC20 _token, DexManager _dexManager) {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        token = _token;
        dexManager = _dexManager;

        addAllowedMaxExpiration(1);
        addAllowedMaxExpiration(2);
        addAllowedMaxExpiration(7);
        addAllowedMaxExpiration(14);
        addAllowedMaxExpiration(30);
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

    function addLiquidity(
        IOddzLiquidityPool _pool,
        uint256 _amount,
        address _account
    ) external override returns (uint256 mint) {
        address sender_ = msg.sender == address(sdk) ? _account : msg.sender;
        mint = _amount;
        require(mint > 0, "LP Error: Amount is too small");
        uint256 date = getPresentDayTimestamp();
        // transfer user eligible premium
        transferEligiblePremium(date, sender_, _pool);

        _pool.addLiquidity(_amount, sender_);

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

        // Forfeit premium if less than premium locked period
        forfeitPremiumIfApplicable(_amount, date, _pool);

        uint256 transferAmount =
            ABDKMath64x64.mulu(ABDKMath64x64.divu(_pool.totalBalance(), _pool.totalSupply()), burn);
        _pool.removeLiquidity(transferAmount, burn, msg.sender);

        _burn(msg.sender, burn);
        token.safeTransfer(msg.sender, transferAmount);
    }

    function lockLiquidity(
        uint256 _id,
        uint256 _amount,
        uint256 _premium,
        address _pair,
        bytes32 _model,
        uint256 _expiration,
        IOddzOption.OptionType _type
    ) public override onlyManager(msg.sender) {
        require(_id == lockedLiquidity.length, "LP Error: Invalid id");
        (address[] memory pools, uint256[] memory poolBalances) =
            getSortedEligiblePools(_pair, _type, _model, _expiration, _amount);
        require(pools.length > 0, "LP Error: No pool balance");

        uint8 count = 0;
        uint256 totalAmount = _amount;
        uint256 base = totalAmount / pools.length;
        uint256[] memory share = new uint256[](pools.length);
        while (count < pools.length) {
            if (base > poolBalances[count]) share[count] = poolBalances[count];
            else share[count] = base;
            IOddzLiquidityPool(pools[count]).lockLiquidity(share[count]);
            totalAmount -= share[count];
            if (totalAmount > 0) base = totalAmount / (pools.length - (count + 1));
            count++;
        }
        lockedLiquidity.push(LockedLiquidity(_amount, _premium, true, pools, share));
        // Allocate premium to the self until premium unlock
        _mint(address(this), _premium);
    }

    function unlockLiquidity(uint256 _id) public override onlyManager(msg.sender) validLiquidty(_id) {
        LockedLiquidity storage ll = lockedLiquidity[_id];
        for (uint8 i = 0; i < ll._pools.length; i++) {
            IOddzLiquidityPool(ll._pools[i]).unlockLiquidity(ll._share[i]);
            IOddzLiquidityPool(ll._pools[i]).unlockPremium(_id, (ll._premium * ll._share[i]) / ll._amount);
        }
        ll._locked = false;
    }

    function send(
        uint256 _id,
        address _account,
        uint256 _amount
    ) public override onlyManager(msg.sender) validLiquidty(_id) {
        (, uint256 transferAmount) = updateAndFetchLockedLiquidity(_id, _account, _amount);
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
        (, uint256 transferAmount) = updateAndFetchLockedLiquidity(_id, _account, _amount);
        address exchange = dexManager.getExchange(_underlying, _strike);
        // Transfer Funds
        token.safeTransfer(exchange, transferAmount);
        // block.timestamp + deadline --> deadline from the current block
        dexManager.swap(_strike, _underlying, exchange, _account, transferAmount, block.timestamp + _deadline);
    }

    function totalBalance() public view override returns (uint256 balance) {
        // though balance is oUSD its 1 - 1 minted for premium in USD
        return token.balanceOf(address(this)) - balanceOf(address(this));
    }

    /**
     * @notice Move liquidity between pools
     * @param _poolTransfer source and destination pools with amount of transfer
     */
    function move(PoolTransfer memory _poolTransfer) public {
        int256 totalTransfer = 0;
        for (uint256 i = 0; i < _poolTransfer._source.length; i++) {
            _poolTransfer._source[i].removeLiquidity(_poolTransfer._sAmount[i], _poolTransfer._sAmount[i], msg.sender);
            totalTransfer += int256(_poolTransfer._sAmount[i]);
        }
        for (uint256 i = 0; i < _poolTransfer._destination.length; i++) {
            _poolTransfer._destination[i].addLiquidity(_poolTransfer._dAmount[i], msg.sender);
            totalTransfer -= int256(_poolTransfer._dAmount[i]);
        }
        require(totalTransfer != 0, "LP Error: invalid transfer amount");
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
     * @param _pool liquidity pool address
     */
    function distributePremiumPerLP(
        uint256 _date,
        address _lp,
        IOddzLiquidityPool _pool
    ) private {
        // Invalid liquidity provider
        if (_pool.getEligiblePremium(_date) <= _pool.getDistributedPremium(_date)) return;
        if (_pool.activeLiquidity(_lp) <= 0) return;
        require(
            _pool.getPremiumDistribution(_lp, _date) <= 0,
            "LP Error: Premium already distributed for the provider"
        );
        uint256 lpEligible =
            (_pool.getEligiblePremium(_date) * _pool.activeLiquidityByDate(_lp, _date)) /
                _pool.getDaysActiveLiquidity(_date);
        // if lpEligible goes to 0 round up to 1
        if (lpEligible == 0) lpEligible = 1;
        _pool.allocatePremiumToProvider(_lp, lpEligible, _date);

        transferEligiblePremium(getPresentDayTimestamp(), _lp, _pool);
    }

    /**
     * @notice Distributes the Premium for the Liquidity Providers for the given date
     * @param _date Epoch time for 00:00:00 hours of the date
     * @param _lps List of the active liquidity provider addresses
     * @param _pool liquidity pool address
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

    /**
     * @notice withdraw porfits from the pool
     * @param _pool liquidity pool address
     */
    function withdrawProfits(IOddzLiquidityPool _pool) external {
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
     * @param _pool liquidity pool address
     * @return premium eligible premium i.e. transferred to liquidity provider
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
     * @param _pool liquidity pool address
     */
    function forfeitPremiumIfApplicable(
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
        if (transferAmount > ll._amount) transferAmount = ll._amount;

        for (uint8 i = 0; i < ll._pools.length; i++) {
            IOddzLiquidityPool(ll._pools[i]).unlockLiquidity(ll._share[i]);
            IOddzLiquidityPool(ll._pools[i]).exercisePremium(
                _lid,
                (lockedPremium * ll._share[i]) / ll._amount,
                (transferAmount * ll._share[i]) / ll._amount
            );
        }
    }

    /**
     * @notice return sorted eligible pools
     * @param _pair Asset pair address
     * @param _type Option type
     * @param _model Option premium model
     * @param _expiration option expiry in unix timestamp
     * @param _amount Amount to be locked in pools
     * @return pools sorted pools based on ascending order of available liquidity
     * @return poolBalance sorted in ascending order of available liquidity
     */
    function getSortedEligiblePools(
        address _pair,
        IOddzOption.OptionType _type,
        bytes32 _model,
        uint256 _expiration,
        uint256 _amount
    ) public view returns (address[] memory pools, uint256[] memory poolBalance) {
        // if _expiration is 86401 i.e. 1 day 1 second, then max 1 day expiration pool will not be eligible
        IOddzLiquidityPool[] memory allPools =
            poolMapper[
                keccak256(abi.encode(_pair, _type, _model, periodMapper[getActiveDayTimestamp(_expiration) / 1 days]))
            ];
        uint256 count = 0;
        for (uint8 i = 0; i < allPools.length; i++) {
            if (allPools[i].availableBalance() > 0) {
                count++;
            }
        }
        poolBalance = new uint256[](count);
        pools = new address[](count);
        uint256 j = 0;
        uint256 balance = 0;
        for (uint256 i = 0; i < allPools.length; i++) {
            if (allPools[i].availableBalance() > 0) {
                pools[j] = address(allPools[i]);
                poolBalance[j] = allPools[i].availableBalance();
                balance += poolBalance[j];
                j++;
            }
        }
        (poolBalance, pools) = sort(poolBalance, pools);
        require(balance > _amount, "LP Error: Amount is too large");
    }

    /**
     * @notice Insertion sort based on pool balance since atmost 6 eligible pools
     * @param balance list of liquidity
     * @param pools list of pools with reference to balance
     * @return sorted balance list in ascending order
     * @return sorted pool list in ascending order of balance list
     */
    function sort(uint256[] memory balance, address[] memory pools)
        private
        pure
        returns (uint256[] memory, address[] memory)
    {
        // Higher deployment cost but betters execution cost
        int256 j;
        uint256 unsignedJ;
        uint256 unsignedJplus1;
        uint256 key;
        address val;
        for (uint256 i = 1; i < balance.length; i++) {
            key = balance[i];
            val = pools[i];
            j = int256(i - 1);
            unsignedJ = uint256(j);
            while ((j >= 0) && (balance[unsignedJ] > key)) {
                unsignedJplus1 = unsignedJ + 1;
                balance[unsignedJplus1] = balance[unsignedJ];
                pools[unsignedJplus1] = pools[unsignedJ];
                j--;
                unsignedJ = uint256(j);
            }
            unsignedJplus1 = uint256(j + 1);
            balance[unsignedJplus1] = key;
            pools[unsignedJplus1] = val;
        }
        return (balance, pools);
    }

    /**
     * @notice Add/update allowed max expiration
     * @param _maxExpiration maximum expiration time of option
     */
    function addAllowedMaxExpiration(uint256 _maxExpiration) public onlyOwner(msg.sender) {
        allowedMaxExpiration[_maxExpiration] = true;
    }

    /**
     * @notice sets the manager for the liqudity pool contract
     * @param _address manager contract address
     * Note: This can be called only by the owner
     */
    function setManager(address _address) public {
        require(_address != address(0) && _address.isContract(), "LP Error: Invalid manager address");
        grantRole(MANAGER_ROLE, _address);
    }

    /**
     * @notice removes the manager for the liqudity pool contract for valid managers
     * @param _address manager contract address
     * Note: This can be called only by the owner
     */
    function removeManager(address _address) public {
        revokeRole(MANAGER_ROLE, _address);
    }

    /**
     * @notice sets required balance
     * @param _reqBalance required balance between 6 and 9
     * Note: This can be called only by the owner
     */
    function setReqBalance(uint8 _reqBalance) public onlyOwner(msg.sender) reqBalanceValidRange(_reqBalance) {
        reqBalance = _reqBalance;
    }

    /**
     * @notice sets the SDK
     * @param _sdk SDK contract address
     * Note: This can be called only by the owner
     */
    function setSdk(OddzSDK _sdk) external onlyOwner(msg.sender) {
        require(address(_sdk).isContract(), "LP Error: invalid SDK contract address");
        sdk = _sdk;
    }

    /**
     * @notice map period
     * @param _source source period
     * @param _dest destimation period
     * Note: This can be called only by the owner
     */
    function mapPeriod(uint256 _source, uint256 _dest) public validMaxExpiration(_dest) onlyOwner(msg.sender) {
        periodMapper[_source] = _dest;
    }

    /**
     * @notice Map pools for an option parameters
     * @param _pair Asset pair address
     * @param _type Option type
     * @param _model Option premium model
     * @param _period option period exposure
     * @param _pools eligible pools based on above params
     * Note: This can be called only by the owner
     */
    function mapPool(
        address _pair,
        IOddzOption.OptionType _type,
        bytes32 _model,
        uint256 _period,
        IOddzLiquidityPool[] memory _pools
    ) public onlyOwner(msg.sender) {
        require(_pools.length <= 10, "LP Error: pools length should be <= 10");
        // delete all the existing pool mapping
        delete poolMapper[keccak256(abi.encode(_pair, _type, _model, _period))];
        for (uint256 i = 0; i < _pools.length; i++) {
            delete uniquePoolMapper[keccak256(abi.encode(_pair, _type, _model, _period, _pools[i]))];
        }

        // add unique pool mapping
        bytes32 uPool;
        for (uint256 i = 0; i < _pools.length; i++) {
            uPool = keccak256(abi.encode(_pair, _type, _model, _period, _pools[i]));
            if (!uniquePoolMapper[uPool]) {
                poolMapper[keccak256(abi.encode(_pair, _type, _model, _period))].push(_pools[i]);
                uniquePoolMapper[uPool] = true;
            }
        }
    }

    /**
     * @notice get day based on the timestamp
     */
    function getPresentDayTimestamp() internal view returns (uint256 activationDate) {
        (uint256 year, uint256 month, uint256 day) = DateTimeLibrary.timestampToDate(block.timestamp);
        activationDate = DateTimeLibrary.timestampFromDate(year, month, day);
    }

    /**
     * @notice get active day based on user input timestamp
     * @param _timestamp epoch time
     */
    function getActiveDayTimestamp(uint256 _timestamp) internal pure returns (uint256 activationDate) {
        // activation date should be next day 00 hours if _timestamp % 86400 is greater than 0
        if ((_timestamp % 1 days) > 0) _timestamp = _timestamp + 1 days;
        (uint256 year, uint256 month, uint256 day) = DateTimeLibrary.timestampToDate(_timestamp);
        activationDate = DateTimeLibrary.timestampFromDate(year, month, day);
    }
}
