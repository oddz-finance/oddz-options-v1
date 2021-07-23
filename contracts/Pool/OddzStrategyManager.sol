// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "./IOddzStrategyManager.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";

contract OddzStrategyManager is IOddzStrategyManager, Ownable {
    using Address for address;
    using SafeERC20 for IERC20;

    IOddzLiquidityPoolManager public poolManager;

    address public latestStrategy;

    modifier validStrategy(IOddzWriteStrategy _strategy) {
        require(address(_strategy).isContract(), "SM Error: strategy is not contract address");
        _validPools(_strategy);
        _;
    }

    constructor(IOddzLiquidityPoolManager _poolManager) {
        poolManager = _poolManager;
    }

    function _validPools(IOddzWriteStrategy _strategy) private view {
        IOddzLiquidityPool[] memory pools = _strategy.getPools();
        for (uint256 i = 0; i < pools.length; i++) {
            require(poolManager.poolExposure(pools[i]) > 0, "Strategy Error: Invalid pool");
        }
    }

    function createStrategy(
        IOddzLiquidityPool[] memory _pools,
        uint256[] memory _percentageShares,
        uint256 _amount
    ) external override {
        require(_pools.length == _percentageShares.length, "SM Error: invalid array input");
        require(_pools.length > 0, "SM Error: no pool selected for strategy");
        IOddzWriteStrategy strategy = IOddzWriteStrategy(new OddzWriteStrategy(_pools, _percentageShares));
        addLiquidity(strategy, _amount);
        latestStrategy = address(strategy);

        emit CreatedStrategy(address(strategy), msg.sender);
    }

    function addLiquidity(IOddzWriteStrategy _strategy, uint256 _amount) public override validStrategy(_strategy) {
        IOddzLiquidityPool[] memory pools = _strategy.getPools();
        uint256[] memory shares = _strategy.getShares();
        uint256 count;
        uint256 amountDistributed;
        for (uint256 i = 0; i < pools.length; i++) {
            uint256 amountToDistribute;
            count++;
            if (count == pools.length) {
                // remove remaining liquidity from last pool
                amountToDistribute = _amount - amountDistributed;
            } else {
                amountToDistribute = (_amount * shares[i]) / 100;
            }
            amountDistributed += amountToDistribute;
            poolManager.addLiquidity(msg.sender, pools[i], amountToDistribute);
        }
        _strategy.addLiquidity(msg.sender, _amount);

        emit AddedLiquidity(address(_strategy), msg.sender, _amount);
    }

    function removeLiquidity(IOddzWriteStrategy _strategy) external override validStrategy(_strategy) {
        IOddzLiquidityPool[] memory pools = _strategy.getPools();
        uint256[] memory shares = _strategy.getShares();
        uint256 liquidity = _strategy.userLiquidity(msg.sender);
        uint256 liquidityRemoved;
        uint256 count;
        for (uint256 i = 0; i < pools.length; i++) {
            uint256 balance = pools[i].getBalance(msg.sender);
            uint256 amountToRemove;
            count++;
            if (count == pools.length) {
                // remove remaining liquidity from last pool
                amountToRemove = liquidity - liquidityRemoved;
            } else {
                amountToRemove = (liquidity * shares[i]) / 100;
            }
            require(balance >= amountToRemove, "SM Error: one or more pools have less liquidity");
            poolManager.removeLiquidity(msg.sender, pools[i], amountToRemove);
            liquidityRemoved += amountToRemove;
        }
        _strategy.removeLiquidity(msg.sender);

        emit RemovedLiquidity(address(_strategy), msg.sender, liquidity);
    }

    function changeStrategy(IOddzWriteStrategy _old, IOddzWriteStrategy _new)
        external
        override
        validStrategy(_old)
        validStrategy(_new)
    {
        IOddzLiquidityPool[] memory oldPools = _old.getPools();
        uint256[] memory oldShares = _old.getShares();
        uint256 liquidity = _old.userLiquidity(msg.sender);
        uint256[] memory oldBalances = new uint256[](oldPools.length);

        uint256 liquidityRemoved;
        uint256 count;
        for (uint256 i = 0; i < oldPools.length; i++) {
            uint256 balance = oldPools[i].getBalance(msg.sender);
            uint256 amountToRemove;
            count++;
            if (count == oldPools.length) {
                // distribute remaining liquidity to last pool
                amountToRemove = liquidity - liquidityRemoved;
            } else {
                amountToRemove = (liquidity * oldShares[i]) / 100;
            }
            require(balance >= amountToRemove, "SM Error: one or more pools have less liquidity");
            oldBalances[i] = amountToRemove;
            liquidityRemoved += amountToRemove;
        }
        uint256[] memory newPoolsShares = _new.getShares();
        uint256[] memory newBalances = new uint256[](newPoolsShares.length);
        count = 0;
        uint256 amountDistributed;
        for (uint256 i = 0; i < newPoolsShares.length; i++) {
            uint256 amountToDistribute;
            count++;
            if (count == newPoolsShares.length) {
                // distribute remaining liquidity to last pool
                amountToDistribute = liquidity - amountDistributed;
            } else {
                amountToDistribute = (liquidity * newPoolsShares[i]) / 100;
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
