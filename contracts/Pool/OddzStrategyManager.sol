pragma solidity 0.8.3;

import "./IOddzStrategyManager.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";

contract OddzStrategyManager is IOddzStrategyManager, Ownable {
    using Address for address;
    using SafeERC20 for IERC20;

    IERC20 public token;
    IOddzLiquidityPoolManager public poolManager;

    mapping(address => uint256) public lastStrategyCreated;

    uint256 public strategyCreateLockupDuration = 3 days;

    address public latestStrategy;

    modifier validStrategy(IOddzWriteStrategy _strategy) {
        require(address(_strategy).isContract(), "SM Error: strategy is not contract address");
        _;
    }

    constructor(IOddzLiquidityPoolManager _poolManager, IERC20 _token) {
        poolManager = _poolManager;
        token = _token;
        token.safeApprove(address(poolManager), type(uint256).max);
    }

    function updateStrategyCreateLockupDuration(uint256 _duration) external onlyOwner {
        require(_duration >= 1 days && _duration <= 30 days, "SM Error: invalid duration");
        strategyCreateLockupDuration = _duration;
    }

    function createStrategy(
        IOddzLiquidityPool[] memory _pools,
        uint256[] memory _percentageShares,
        uint256[] memory _shares,
        uint256 _amount
    ) external override {
        require(
            block.timestamp > lastStrategyCreated[msg.sender] + strategyCreateLockupDuration,
            "SM Error: Strategy creation not allowed within lockup duration"
        );
        require(_pools.length > 0, "SM Error: no pool selected for strategy");

        lastStrategyCreated[msg.sender] = block.timestamp;
        IOddzWriteStrategy strategy = IOddzWriteStrategy(new OddzWriteStrategy(_pools, _percentageShares));
        manageLiquidity(strategy, _amount, _shares, IOddzWriteStrategy.TransactionType.ADD);
        latestStrategy = address(strategy);

        emit CreatedStrategy(address(strategy), msg.sender);
    }

    function manageLiquidity(
        IOddzWriteStrategy _strategy,
        uint256 _amount,
        uint256[] memory _shares,
        IOddzWriteStrategy.TransactionType _transactionType
    ) public validStrategy(_strategy) {
        uint256 totalAmount = 0;
        IOddzLiquidityPool[] memory pools = _strategy.getPools();

        if (_transactionType == IOddzWriteStrategy.TransactionType.ADD) {
            token.safeTransferFrom(msg.sender, address(this), _amount);
            for (uint256 i = 0; i < pools.length; i++) {
                require(poolManager.poolExposure(pools[i]) > 0, "SM Error: invalid pool");
                totalAmount += _shares[i];
                poolManager.addLiquidity(pools[i], _shares[i]);
            }
            require(totalAmount == _amount, "SM Error: invalid shares between pools");

            emit AddedLiquidity(address(_strategy), msg.sender, _amount);
        } else {
            for (uint256 i = 0; i < pools.length; i++) {
                require(poolManager.poolExposure(pools[i]) > 0, "SM Error: invalid pool");
                totalAmount += _shares[i];
                poolManager.removeLiquidity(pools[i], _shares[i]);
            }
            require(totalAmount == _amount, "SM Error: invalid shares between pools");

            emit RemovedLiquidity(address(_strategy), msg.sender, _amount);
        }
        _strategy.updateLiquidity(msg.sender, _amount, _transactionType);
    }

    function changeStrategy(
        IOddzWriteStrategy _old,
        IOddzWriteStrategy _new,
        uint256 _oldStrategyLiquidity,
        uint256[] memory _oldPoolsShare,
        uint256[] memory _newPoolsShare
    ) external override validStrategy(_old) validStrategy(_new) {
        require(
            block.timestamp > poolManager.lastPoolTransfer(msg.sender) + poolManager.moveLockupDuration(),
            "SM Error: Strategy changes not allowed within lockup duration"
        );
        uint256 amount;
        for (uint256 i = 0; i < _oldPoolsShare.length; i++) {
            amount += _oldPoolsShare[i];
        }
        require(amount == _oldStrategyLiquidity, "SM Error: invalid strategy share to migrate");

        IOddzLiquidityPoolManager.PoolTransfer memory poolTransfer =
            IOddzLiquidityPoolManager.PoolTransfer(_old.getPools(), _new.getPools(), _oldPoolsShare, _newPoolsShare);
        poolManager.move(poolTransfer);
        _old.updateLiquidity(msg.sender, _oldStrategyLiquidity, IOddzWriteStrategy.TransactionType.REMOVE);
        _new.updateLiquidity(msg.sender, _oldStrategyLiquidity, IOddzWriteStrategy.TransactionType.ADD);

        emit ChangedStrategy(address(_old), address(_new), msg.sender);
    }
}
