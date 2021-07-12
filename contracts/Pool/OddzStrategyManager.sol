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
        uint256[] memory liquidityShare = new uint256[](pools.length);
        for (uint256 i = 0; i < pools.length; i++) {
            uint256 amountToDistribute;
            count++;
            if (count == pools.length) {
                // distribute remaining liquidity to last pool
                amountToDistribute = _amount - amountDistributed;
            } else {
                amountToDistribute = (_amount * shares[i]) / 100;
            }
            liquidityShare[i] = amountToDistribute;
            amountDistributed += amountToDistribute;
            poolManager.addLiquidity(msg.sender, pools[i], amountToDistribute);
        }
        _strategy.addLiquidity(msg.sender, liquidityShare);

        emit AddedLiquidity(address(_strategy), msg.sender, _amount);
    }

    function removeLiquidity(IOddzWriteStrategy _strategy) external override validStrategy(_strategy) {
        IOddzLiquidityPool[] memory pools = _strategy.getPools();
        uint256[] memory poolsLiquidity = _strategy.getPoolsLiquidity(msg.sender);
        uint256 totalAmount;
        for (uint256 i = 0; i < pools.length; i++) {
            uint256 balance = pools[i].getBalance(msg.sender);
            require(balance >= poolsLiquidity[i], "SM Error: one or more pools have less liquidity");
            poolManager.removeLiquidity(msg.sender, pools[i], poolsLiquidity[i]);
            totalAmount += poolsLiquidity[i];
        }

        emit RemovedLiquidity(address(_strategy), msg.sender, totalAmount);
    }

    function changeStrategy(IOddzWriteStrategy _old, IOddzWriteStrategy _new)
        external
        override
        validStrategy(_old)
        validStrategy(_new)
    {
        uint256 totalAmount;
        IOddzLiquidityPool[] memory oldPools = _old.getPools();
        uint256[] memory poolsLiquidity = _old.getPoolsLiquidity(msg.sender);
        for (uint256 i = 0; i < oldPools.length; i++) {
            uint256 balance = oldPools[i].getBalance(msg.sender);
            require(balance >= poolsLiquidity[i], "SM Error: one or more pools have less liquidity");
            totalAmount += poolsLiquidity[i];
        }
        uint256[] memory newPoolsShares = _new.getShares();
        uint256[] memory newBalances = new uint256[](newPoolsShares.length);
        uint256 count = 0;
        uint256 amountDistributed;
        for (uint256 i = 0; i < newPoolsShares.length; i++) {
            uint256 amountToDistribute;
            count++;
            if (count == newPoolsShares.length) {
                // distribute remaining liquidity to last pool
                amountToDistribute = totalAmount - amountDistributed;
            } else {
                amountToDistribute = (totalAmount * newPoolsShares[i]) / 100;
            }
            newBalances[i] = amountToDistribute;
            amountDistributed += amountToDistribute;
        }

        IOddzLiquidityPoolManager.PoolTransfer memory poolTransfer =
            IOddzLiquidityPoolManager.PoolTransfer(oldPools, _new.getPools(), poolsLiquidity, newBalances);
        poolManager.move(msg.sender, poolTransfer);

        emit ChangedStrategy(address(_old), address(_new), msg.sender);
    }
}
