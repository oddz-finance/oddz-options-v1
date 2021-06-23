pragma solidity 0.8.3;

import "./IOddzStrategyManager.sol";
import "./OddzWriteStrategy.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";

contract OddzStrategyManager is IOddzStrategyManager, Ownable {
    using Address for address;

    IOddzLiquidityPoolManager public poolManager;

    mapping(address => bool) public validPools;
    mapping(address => uint256) public lastStrategyChanged;
    mapping(address => uint256) public lastStrategyCreated;

    uint256 public strategyChangeLockupDuration = 3 days;
    uint256 public strategyCreateLockupDuration = 3 days;

    constructor(IOddzLiquidityPoolManager _poolManager) {
        poolManager = _poolManager;
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
        strategy = address(new OddzWriteStrategy(_pools, _shares, poolManager));
        manageLiquidity(strategy, _amount, IOddzWriteStrategy.TransactionType.ADD);
        emit CreatedStrategy(strategy, msg.sender);
    }

    function manageLiquidity(
        address _strategy,
        uint256 _amount,
        IOddzWriteStrategy.TransactionType _transactionType
    ) public {
        _checkPoolValidity(OddzWriteStrategy(_strategy).getPools(), OddzWriteStrategy(_strategy).getShares(), _amount);
        if (_transactionType == IOddzWriteStrategy.TransactionType.ADD) {
            OddzWriteStrategy(_strategy).addLiquidity(msg.sender, _amount);
        } else {
            OddzWriteStrategy(_strategy).removeLiquidity(msg.sender, _amount);
        }
    }

    function changeStrategy(address _old, address _new) public override {
        require(
            block.timestamp > lastStrategyChanged[msg.sender] + strategyChangeLockupDuration,
            "SM Error: Strategy changes not allowed within lockup duration"
        );
        lastStrategyChanged[msg.sender] = block.timestamp;
        uint256 userLiquidity = OddzWriteStrategy(_old).userLiquidity(msg.sender);
        uint256[] memory oldPools = OddzWriteStrategy(_old).getShares();
        uint256[] memory oldStrategyPoolLiquidity;
        for (uint256 i = 0; i < oldPools.length; i++) {
            oldStrategyPoolLiquidity[i] = (userLiquidity * oldPools[i]) / 100;
        }
        uint256[] memory newPools = OddzWriteStrategy(_new).getShares();
        uint256[] memory newStrategyPoolLiquidity;
        for (uint256 i = 0; i < newPools.length; i++) {
            newStrategyPoolLiquidity[i] = (userLiquidity * newPools[i]) / 100;
        }
        IOddzLiquidityPoolManager.PoolTransfer memory poolTransfer =
            IOddzLiquidityPoolManager.PoolTransfer(
                OddzWriteStrategy(_old).getPools(),
                OddzWriteStrategy(_new).getPools(),
                oldStrategyPoolLiquidity,
                newStrategyPoolLiquidity
            );

        poolManager.move(poolTransfer);
        OddzWriteStrategy(_old).updateLiquidity(msg.sender, userLiquidity, IOddzWriteStrategy.TransactionType.REMOVE);
        OddzWriteStrategy(_new).updateLiquidity(msg.sender, userLiquidity, IOddzWriteStrategy.TransactionType.ADD);

        emit ChangedStrategy(_old, _new, msg.sender);
    }

    function _checkPoolValidity(
        IOddzLiquidityPool[] memory _pools,
        uint256[] memory _shares,
        uint256 _amount
    ) private view {
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < _pools.length; i++) {
            require(validPools[address(_pools[i])], "SM Error: invalid pool");
            totalAmount += (_shares[i] * _amount) / 100;
        }
        require(totalAmount == _amount, "SM Error: invalid shares between pools");
    }
}
