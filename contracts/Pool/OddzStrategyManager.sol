pragma solidity 0.8.3;

import "./IOddzStrategyManager.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";

contract OddzStrategyManager is IOddzStrategyManager, Ownable {
    using Address for address;
    using SafeERC20 for IERC20;

    IERC20 public token;
    IOddzLiquidityPoolManager public poolManager;

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

    function createStrategy(
        IOddzLiquidityPool[] memory _pools,
        uint256[] memory _percentageShares,
        uint256[] memory _shares,
        uint256 _amount
    ) external override {
        require(_pools.length > 0, "SM Error: no pool selected for strategy");
        IOddzWriteStrategy strategy = IOddzWriteStrategy(new OddzWriteStrategy(_pools, _percentageShares));
        addLiquidity(strategy, _amount, _shares);
        latestStrategy = address(strategy);

        emit CreatedStrategy(address(strategy), msg.sender);
    }

    function addLiquidity(
        IOddzWriteStrategy _strategy,
        uint256 _amount,
        uint256[] memory _shares
    ) public override validStrategy(_strategy) {
        uint256 totalAmount = 0;
        IOddzLiquidityPool[] memory pools = _strategy.getPools();
        token.safeTransferFrom(msg.sender, address(this), _amount);

        for (uint256 i = 0; i < pools.length; i++) {
            totalAmount += _shares[i];
            poolManager.addLiquidity(msg.sender, pools[i], _shares[i]);
        }
        require(totalAmount == _amount, "SM Error: invalid shares between pools");

        emit AddedLiquidity(address(_strategy), msg.sender, _amount);
    }

    function removeLiquidity(IOddzWriteStrategy _strategy) external override validStrategy(_strategy) {
        IOddzLiquidityPool[] memory pools = _strategy.getPools();
        uint256 totalAmount;
        for (uint256 i = 0; i < pools.length; i++) {
            uint256 balance = pools[i].getBalance(msg.sender);
            // allow remove for remaining pools instead of throwing exception
            if (balance > 0) {
                poolManager.removeLiquidity(msg.sender, pools[i], balance);
            }
            totalAmount += balance;
        }

        emit RemovedLiquidity(address(_strategy), msg.sender, totalAmount);
    }

    function changeStrategy(IOddzWriteStrategy _old, IOddzWriteStrategy _new)
        external
        override
        validStrategy(_old)
        validStrategy(_new)
    {
        require(
            block.timestamp > poolManager.lastPoolTransfer(msg.sender) + poolManager.moveLockupDuration(),
            "SM Error: Strategy changes not allowed within lockup duration"
        );
        uint256 totalAmount;
        IOddzLiquidityPool[] memory oldPools = _old.getPools();
        uint256[] memory oldBalances = new uint256[](oldPools.length);
        for (uint256 i = 0; i < oldPools.length; i++) {
            oldBalances[i] = oldPools[i].getBalance(msg.sender);
            totalAmount += oldBalances[i];
        }
        uint256[] memory newPoolsShares = _new.getShares();
        uint256[] memory newBalances = new uint256[](newPoolsShares.length);
        uint256 count = 0;
        uint256 amountDistributed;
        for (uint256 i = 0; i < newPoolsShares.length; i++) {
            uint256 amountToDistribute;
            count++;
            if (count == (i + 1)) {
                // distribute remaining liquidity to last pool
                amountToDistribute = totalAmount - amountDistributed;
            } else {
                amountToDistribute = (totalAmount * newPoolsShares[i]) / 100;
            }
            newBalances[i] = amountToDistribute;
            amountDistributed += amountToDistribute;
        }

        IOddzLiquidityPoolManager.PoolTransfer memory poolTransfer =
            IOddzLiquidityPoolManager.PoolTransfer(oldPools, _new.getPools(), oldBalances, newBalances);
        poolManager.move(msg.sender, poolTransfer);

        emit ChangedStrategy(address(_old), address(_new), msg.sender);
    }
}
