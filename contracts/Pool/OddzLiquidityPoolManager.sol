// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "./IOddzLiquidityPoolManager.sol";
import "../Libs/DateTimeLibrary.sol";
import "../Swap/IDexManager.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

contract OddzLiquidityPoolManager is AccessControl, IOddzLiquidityPoolManager, ERC20("Oddz USD LP token", "oUSD") {
    using Math for uint256;
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

    /**
     * @dev Liquidity lock and distribution data definitions
     */
    mapping(uint256 => bool) public allowedMaxExpiration;
    mapping(uint256 => uint256) public periodMapper;
    mapping(bytes32 => IOddzLiquidityPool[]) public poolMapper;
    mapping(bytes32 => bool) public uniquePoolMapper;

    /**
     * @dev Active pool count
     */
    mapping(IOddzLiquidityPool => uint256) public poolExposure;

    /**
     * @dev Disabled pools
     */
    mapping(IOddzLiquidityPool => bool) public disabledPools;

    /**
     * @dev Pool transfer
     */
    struct PoolTransfer {
        IOddzLiquidityPool[] _source;
        IOddzLiquidityPool[] _destination;
        uint256[] _sAmount;
        uint256[] _dAmount;
    }
    // user address -> date of transfer
    mapping(address => uint256) public lastPoolTransfer;

    /**
     * @dev Premium specific data definitions
     */
    uint256 public premiumLockupDuration = 14 days;
    uint256 public moveLockupDuration = 7 days;

    /**
     * @dev DEX manager
     */
    IDexManager public dexManager;

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

    constructor(IERC20 _token, IDexManager _dexManager) {
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

    function addLiquidity(IOddzLiquidityPool _pool, uint256 _amount) external override returns (uint256 mint) {
        require(poolExposure[_pool] > 0, "LP Error: Invalid pool");
        mint = _amount;
        require(mint > 0, "LP Error: Amount is too small");

        uint256 eligiblePremium = _pool.collectPremium(msg.sender, premiumLockupDuration);
        if (eligiblePremium > 0) token.safeTransfer(msg.sender, eligiblePremium);

        _pool.addLiquidity(_amount, msg.sender);

        _mint(msg.sender, mint);
        token.safeTransferFrom(msg.sender, address(this), _amount);
    }

    function removeLiquidity(IOddzLiquidityPool _pool, uint256 _amount) external override {
        require(poolExposure[_pool] > 0, "LP Error: Invalid pool");
        require(_amount <= balanceOf(msg.sender), "LP Error: Amount exceeds oUSD balance");

        uint256 eligiblePremium = _pool.collectPremium(msg.sender, premiumLockupDuration);
        token.safeTransfer(msg.sender, _removeLiquidity(_pool, _amount, premiumLockupDuration) + eligiblePremium);

        _burn(msg.sender, _amount);
    }

    function _removeLiquidity(
        IOddzLiquidityPool _pool,
        uint256 _amount,
        uint256 premiumLockPeriod
    ) private returns (uint256 transferAmount) {
        uint256 validateBalance;
        if (disabledPools[_pool]) validateBalance = _pool.availableBalance() * 10;
        else validateBalance = _pool.availableBalance() * reqBalance;

        require(_amount * 10 <= validateBalance, "LP Error: Not enough funds in the pool. Please lower the amount.");
        require(_amount > 0, "LP Error: Amount is too small");

        transferAmount = _pool.removeLiquidity(_amount, msg.sender, premiumLockPeriod);
    }

    function lockLiquidity(
        uint256 _id,
        LiquidityParams memory _liquidityParams,
        uint256 _premium
    ) external override onlyManager(msg.sender) {
        require(_id == lockedLiquidity.length, "LP Error: Invalid id");
        (address[] memory pools, uint256[] memory poolBalances) = getSortedEligiblePools(_liquidityParams);
        require(pools.length > 0, "LP Error: No pool balance");

        uint8 count = 0;
        uint256 totalAmount = _liquidityParams._amount;
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
        lockedLiquidity.push(LockedLiquidity(_liquidityParams._amount, _premium, true, pools, share));
    }

    function unlockLiquidity(uint256 _id) external override onlyManager(msg.sender) validLiquidty(_id) {
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
    ) external override onlyManager(msg.sender) validLiquidty(_id) {
        (, uint256 transferAmount) = _updateAndFetchLockedLiquidity(_id, _account, _amount);
        // Transfer Funds
        token.safeTransfer(_account, transferAmount);
    }

    function sendUA(
        uint256 _id,
        address _account,
        uint256 _amount,
        bytes32 _underlying,
        bytes32 _strike,
        uint32 _deadline,
        uint16 _slippage
    ) public override onlyManager(msg.sender) validLiquidty(_id) {
        (, uint256 transferAmount) = _updateAndFetchLockedLiquidity(_id, _account, _amount);
        address exchange = dexManager.getExchange(_underlying, _strike);
        // Transfer Funds
        token.safeTransfer(exchange, transferAmount);
        // block.timestamp + deadline --> deadline from the current block
        dexManager.swap(
            _strike,
            _underlying,
            exchange,
            _account,
            transferAmount,
            block.timestamp + _deadline,
            _slippage
        );
    }

    /**
     * @notice Move liquidity between pools
     * @param _poolTransfer source and destination pools with amount of transfer
     */
    function move(PoolTransfer memory _poolTransfer) external {
        require(
            lastPoolTransfer[msg.sender] == 0 || (lastPoolTransfer[msg.sender] + moveLockupDuration) < block.timestamp,
            "LP Error: Pool transfer not allowed"
        );
        lastPoolTransfer[msg.sender] = block.timestamp;
        int256 totalTransfer = 0;
        for (uint256 i = 0; i < _poolTransfer._source.length; i++) {
            require(
                (poolExposure[_poolTransfer._source[i]] > 0) || disabledPools[_poolTransfer._source[i]],
                "LP Error: Invalid pool"
            );
            _removeLiquidity(_poolTransfer._source[i], _poolTransfer._sAmount[i], moveLockupDuration);
            totalTransfer += int256(_poolTransfer._sAmount[i]);
        }
        for (uint256 i = 0; i < _poolTransfer._destination.length; i++) {
            require(poolExposure[_poolTransfer._destination[i]] > 0, "LP Error: Invalid pool");
            _poolTransfer._destination[i].addLiquidity(_poolTransfer._dAmount[i], msg.sender);
            totalTransfer -= int256(_poolTransfer._dAmount[i]);
        }
        require(totalTransfer == 0, "LP Error: invalid transfer amount");
    }

    /**
     * @notice withdraw porfits from the pool
     * @param _pool liquidity pool address
     */
    function withdrawProfits(IOddzLiquidityPool _pool) external {
        uint256 premium = _pool.collectPremium(msg.sender, premiumLockupDuration);
        require(premium > 0, "LP Error: No premium allocated");

        token.safeTransfer(msg.sender, premium);
    }

    /**
     * @notice update and returns locked liquidity
     * @param _lid Id of LockedLiquidity that should be unlocked
     * @param _account Provider account address
     * @param _amount Funds that should be sent
     */
    function _updateAndFetchLockedLiquidity(
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
     * @param _liquidityParams Lock liquidity params
     * @return pools sorted pools based on ascending order of available liquidity
     * @return poolBalance sorted in ascending order of available liquidity
     */
    function getSortedEligiblePools(LiquidityParams memory _liquidityParams)
        public
        view
        returns (address[] memory pools, uint256[] memory poolBalance)
    {
        // if _expiration is 86401 i.e. 1 day 1 second, then max 1 day expiration pool will not be eligible
        IOddzLiquidityPool[] memory allPools =
            poolMapper[
                keccak256(
                    abi.encode(
                        _liquidityParams._pair,
                        _liquidityParams._type,
                        _liquidityParams._model,
                        periodMapper[getActiveDayTimestamp(_liquidityParams._expiration) / 1 days]
                    )
                )
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
        (poolBalance, pools) = _sort(poolBalance, pools);
        require(balance > _liquidityParams._amount, "LP Error: Amount is too large");
    }

    /**
     * @notice Insertion sort based on pool balance since atmost 6 eligible pools
     * @param balance list of liquidity
     * @param pools list of pools with reference to balance
     * @return sorted balance list in ascending order
     * @return sorted pool list in ascending order of balance list
     */
    function _sort(uint256[] memory balance, address[] memory pools)
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
    function setManager(address _address) external {
        require(_address != address(0) && _address.isContract(), "LP Error: Invalid manager address");
        grantRole(MANAGER_ROLE, _address);
    }

    /**
     * @notice removes the manager for the liqudity pool contract for valid managers
     * @param _address manager contract address
     * Note: This can be called only by the owner
     */
    function removeManager(address _address) external {
        revokeRole(MANAGER_ROLE, _address);
    }

    /**
     * @notice sets required balance
     * @param _reqBalance required balance between 6 and 9
     * Note: This can be called only by the owner
     */
    function setReqBalance(uint8 _reqBalance) external onlyOwner(msg.sender) reqBalanceValidRange(_reqBalance) {
        reqBalance = _reqBalance;
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
        IOddzLiquidityPool[] storage aPools = poolMapper[keccak256(abi.encode(_pair, _type, _model, _period))];
        for (uint256 i = 0; i < aPools.length; i++) {
            delete uniquePoolMapper[keccak256(abi.encode(_pair, _type, _model, _period, aPools[i]))];
            poolExposure[aPools[i]] -= 1;
            if (poolExposure[aPools[i]] == 0) disabledPools[aPools[i]] = true;
        }
        delete poolMapper[keccak256(abi.encode(_pair, _type, _model, _period))];

        // add unique pool mapping
        bytes32 uPool;
        for (uint256 i = 0; i < _pools.length; i++) {
            uPool = keccak256(abi.encode(_pair, _type, _model, _period, _pools[i]));
            if (!uniquePoolMapper[uPool]) {
                poolMapper[keccak256(abi.encode(_pair, _type, _model, _period))].push(_pools[i]);
                uniquePoolMapper[uPool] = true;
                poolExposure[_pools[i]] += 1;
                disabledPools[_pools[i]] = false;
            }
        }
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

    /**
     * @notice updates premium lockup duration
     * @param _premiumLockupDuration premium lockup duration
     */
    function updatePremiumLockupDuration(uint256 _premiumLockupDuration) public onlyOwner(msg.sender) {
        require(
            _premiumLockupDuration >= 1 days && _premiumLockupDuration <= 30 days,
            "LP Error: invalid premium lockup duration"
        );
        premiumLockupDuration = _premiumLockupDuration;
    }

    /**
     * @notice updates move lockup duration
     * @param _moveLockupDuration move lockup duration
     */
    function updateMoveLockupDuration(uint256 _moveLockupDuration) public onlyOwner(msg.sender) {
        require(
            _moveLockupDuration >= 3 days && _moveLockupDuration <= 30 days,
            "LP Error: invalid move lockup duration"
        );
        moveLockupDuration = _moveLockupDuration;
    }
}
