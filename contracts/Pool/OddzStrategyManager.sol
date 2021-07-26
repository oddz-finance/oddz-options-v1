// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "./IOddzStrategyManager.sol";
import "./OddzWriteStrategy.sol";

contract OddzStrategyManager is IOddzStrategyManager, Ownable {
    IOddzLiquidityPoolManager public poolManager;

    mapping(IOddzWriteStrategy => bool) public strategies;

    modifier validStrategy(IOddzWriteStrategy _strategy) {
        require(strategies[_strategy], "SM Error: invalid strategy");
        _;
    }

    modifier validPools(IOddzWriteStrategy _strategy) {
        IOddzLiquidityPool[] memory pools = _strategy.getPools();
        for (uint256 i = 0; i < pools.length; i++) {
            require(poolManager.poolExposure(pools[i]) > 0, "Strategy Error: Invalid pool");
        }
        _;
    }

    constructor(IOddzLiquidityPoolManager _poolManager) {
        poolManager = _poolManager;
    }

    function createStrategy(
        IOddzLiquidityPool[] memory _pools,
        uint256[] memory _percentageShares,
        uint256 _amount
    ) external override {
        require(_pools.length == _percentageShares.length, "SM Error: invalid array input");
        require(_pools.length > 0, "SM Error: no pool selected for strategy");
        IOddzWriteStrategy strategy = IOddzWriteStrategy(new OddzWriteStrategy(_pools, _percentageShares));
        _addLiquidity(strategy, _amount);
        strategies[strategy] = true;
        emit CreatedStrategy(address(strategy), msg.sender);
    }

    function _addLiquidity(IOddzWriteStrategy _strategy, uint256 _amount) private validPools(_strategy) {
        IOddzLiquidityPool[] memory pools = _strategy.getPools();
        uint256[] memory shares = _strategy.getShares();
        uint256 amountDistributed;
        for (uint256 i = 0; i < pools.length; i++) {
            uint256 amountToDistribute;
            if (i == pools.length - 1) amountToDistribute = _amount - amountDistributed;
            else amountToDistribute = (_amount * shares[i]) / 100;
            amountDistributed += amountToDistribute;
            poolManager.addLiquidity(msg.sender, pools[i], amountToDistribute);
        }
        _strategy.addLiquidity(msg.sender, _amount);

        emit AddedLiquidity(address(_strategy), msg.sender, _amount);
    }

    function addLiquidity(IOddzWriteStrategy _strategy, uint256 _amount) external override validStrategy(_strategy) {
        _addLiquidity(_strategy, _amount);
    }

    function removeLiquidity(IOddzWriteStrategy _strategy, uint256 _amount) external override validStrategy(_strategy) {
        require(_amount <= _strategy.userLiquidity(msg.sender), "SM Error: Amount too large");
        IOddzLiquidityPool[] memory pools = _strategy.getPools();
        uint256[] memory shares = _strategy.getShares();
        uint256 liquidityRemoved;
        for (uint256 i = 0; i < pools.length; i++) {
            uint256 amountToRemove;
            if (i == pools.length - 1) amountToRemove = _amount - liquidityRemoved;
            else amountToRemove = (_amount * shares[i]) / 100;
            require(
                pools[i].getBalance(msg.sender) >= amountToRemove,
                "SM Error: one or more pools have less liquidity"
            );
            poolManager.removeLiquidity(msg.sender, pools[i], amountToRemove);
            liquidityRemoved += amountToRemove;
        }
        _strategy.removeLiquidity(msg.sender, _amount);

        emit RemovedLiquidity(address(_strategy), msg.sender, _amount);
    }

    function changeStrategy(IOddzWriteStrategy _old, IOddzWriteStrategy _new)
        external
        override
        validStrategy(_old)
        validStrategy(_new)
        validPools(_new)
    {
        IOddzLiquidityPool[] memory oldPools = _old.getPools();
        uint256[] memory oldShares = _old.getShares();
        uint256 liquidity = _old.userLiquidity(msg.sender);
        uint256[] memory oldBalances = new uint256[](oldPools.length);

        uint256 aggregate;
        for (uint256 i = 0; i < oldPools.length; i++) {
            uint256 amountToRemove;
            if (i == oldPools.length - 1) amountToRemove = liquidity - aggregate;
            else amountToRemove = (liquidity * oldShares[i]) / 100;
            require(
                oldPools[i].getBalance(msg.sender) >= amountToRemove,
                "SM Error: one or more pools have less liquidity"
            );
            oldBalances[i] = amountToRemove;
            aggregate += amountToRemove;
        }
        uint256[] memory newPoolsShares = _new.getShares();
        uint256[] memory newBalances = new uint256[](newPoolsShares.length);
        aggregate = 0;
        for (uint256 i = 0; i < newPoolsShares.length; i++) {
            uint256 amountToDistribute;
            if (i == newPoolsShares.length - 1) amountToDistribute = liquidity - aggregate;
            else amountToDistribute = (liquidity * newPoolsShares[i]) / 100;
            newBalances[i] = amountToDistribute;
            aggregate += amountToDistribute;
        }

        IOddzLiquidityPoolManager.PoolTransfer memory poolTransfer =
            IOddzLiquidityPoolManager.PoolTransfer(oldPools, _new.getPools(), oldBalances, newBalances);
        poolManager.move(msg.sender, poolTransfer);

        _old.removeLiquidity(msg.sender, liquidity);
        _new.addLiquidity(msg.sender, liquidity);

        emit ChangedStrategy(address(_old), address(_new), msg.sender);
    }
}
