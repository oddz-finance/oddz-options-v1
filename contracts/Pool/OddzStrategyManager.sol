pragma solidity 0.8.3;

import "./IOddzStrategyManager.sol";
import "./OddzWriteStrategy.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";

contract OddzStrategyManager is IOddzStrategyManager, Ownable {
    using Address for address;
    using SafeERC20 for IERC20;

    IERC20 public token;
    IOddzLiquidityPoolManager public poolManager;

    mapping(address => bool) public validPools;
    mapping(address => uint256) public lastStrategyChanged;
    mapping(address => uint256) public lastStrategyCreated;

    uint256 public strategyChangeLockupDuration = 3 days;
    uint256 public strategyCreateLockupDuration = 3 days;

    modifier validStrategy(address _strategy) {
        require(_strategy != address(0), "SM Error: strategy cannot be zero address");
        require(_strategy.isContract(), "SM Error: strategy is not contract address");
        _;
    }

    constructor(IOddzLiquidityPoolManager _poolManager, IERC20 _token) {
        poolManager = _poolManager;
        token = _token;
        token.safeApprove(address(poolManager), type(uint256).max);
    }

    function addPool(address _pool) public onlyOwner {
        require(_pool.isContract(), "SM Error: invalid pool address");
        validPools[_pool] = true;
    }

    function removePool(address _pool) public onlyOwner {
        require(_pool.isContract(), "SM Error: invalid pool address");
        validPools[_pool] = false;
    }

    function updateStrategyCreateLockupDuration(uint256 _duration) public onlyOwner {
        require(_duration >= 1 days && _duration <= 30 days, "SM Error: invalid duration");
        strategyCreateLockupDuration = _duration;
    }

    function updateStrategyChangeLockupDuration(uint256 _duration) public onlyOwner {
        require(_duration >= 1 days && _duration <= 30 days, "SM Error: invalid duration");
        strategyChangeLockupDuration = _duration;
    }

    function createStrategy(
        IOddzLiquidityPool[] memory _pools,
        uint256[] memory _shares,
        uint256 _amount
    ) public override returns (address strategy) {
        require(
            block.timestamp > lastStrategyCreated[msg.sender] + strategyCreateLockupDuration,
            "SM Error: Strategy creation not allowed within lockup duration"
        );
        require(_pools.length > 0, "SM Error: no pool selected for strategy");

        lastStrategyCreated[msg.sender] = block.timestamp;
        strategy = address(new OddzWriteStrategy(_pools, _shares));

        manageLiquidity(strategy, _amount, IOddzWriteStrategy.TransactionType.ADD);
        emit CreatedStrategy(strategy, msg.sender);
    }

    function manageStrategy(address _strategy, ManageStrategy _manageStrategy)
        public
        onlyOwner
        validStrategy(_strategy)
    {
        if (_manageStrategy == ManageStrategy.ACTIVATE) {
            OddzWriteStrategy(_strategy).activateStrategy();
        } else {
            OddzWriteStrategy(_strategy).deactivateStrategy();
        }
    }

    function manageLiquidity(
        address _strategy,
        uint256 _amount,
        IOddzWriteStrategy.TransactionType _transactionType
    ) public validStrategy(_strategy) {
        uint256 totalAmount = 0;
        IOddzLiquidityPool[] memory pools = IOddzWriteStrategy(_strategy).getPools();
        uint256[] memory shares = IOddzWriteStrategy(_strategy).getShares();

        if (_transactionType == IOddzWriteStrategy.TransactionType.ADD) {
            token.safeTransferFrom(msg.sender, address(this), _amount);
            for (uint256 i = 0; i < pools.length; i++) {
                require(validPools[address(pools[i])], "SM Error: invalid pool");
                totalAmount += (shares[i] * _amount) / 100;
                poolManager.addLiquidity(pools[i], (shares[i] * _amount) / 100);
            }
            require(totalAmount == _amount, "SM Error: invalid shares between pools");
            emit AddedLiquidity(_strategy, msg.sender, _amount);
        } else {
            for (uint256 i = 0; i < pools.length; i++) {
                require(validPools[address(pools[i])], "SM Error: invalid pool");
                totalAmount += (shares[i] * _amount) / 100;
                poolManager.removeLiquidity(pools[i], (shares[i] * _amount) / 100);
            }
            require(totalAmount == _amount, "SM Error: invalid shares between pools");
            emit RemovedLiquidity(_strategy, msg.sender, _amount);
        }
    }

    function changeStrategy(address _old, address _new) public override validStrategy(_old) validStrategy(_new) {
        require(
            block.timestamp > lastStrategyChanged[msg.sender] + strategyChangeLockupDuration,
            "SM Error: Strategy changes not allowed within lockup duration"
        );
        lastStrategyChanged[msg.sender] = block.timestamp;
        uint256 userLiquidity = OddzWriteStrategy(_old).userLiquidity(msg.sender);
        uint256[] memory oldPools = IOddzWriteStrategy(_old).getShares();
        uint256[] memory oldStrategyPoolLiquidity;
        for (uint256 i = 0; i < oldPools.length; i++) {
            oldStrategyPoolLiquidity[i] = (userLiquidity * oldPools[i]) / 100;
        }
        uint256[] memory newPools = IOddzWriteStrategy(_new).getShares();
        uint256[] memory newStrategyPoolLiquidity;
        for (uint256 i = 0; i < newPools.length; i++) {
            newStrategyPoolLiquidity[i] = (userLiquidity * newPools[i]) / 100;
        }
        IOddzLiquidityPoolManager.PoolTransfer memory poolTransfer =
            IOddzLiquidityPoolManager.PoolTransfer(
                IOddzWriteStrategy(_old).getPools(),
                IOddzWriteStrategy(_new).getPools(),
                oldStrategyPoolLiquidity,
                newStrategyPoolLiquidity
            );

        poolManager.move(poolTransfer);
        IOddzWriteStrategy(_old).updateLiquidity(msg.sender, userLiquidity, IOddzWriteStrategy.TransactionType.REMOVE);
        IOddzWriteStrategy(_new).updateLiquidity(msg.sender, userLiquidity, IOddzWriteStrategy.TransactionType.ADD);

        emit ChangedStrategy(_old, _new, msg.sender);
    }
}
