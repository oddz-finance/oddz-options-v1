pragma solidity 0.8.3;

import "./IOddzWriteStrategy.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract OddzWriteStrategy is IOddzWriteStrategy, Ownable {
    IOddzLiquidityPool[] public pools;
    uint256[] public shares;
    IOddzLiquidityPoolManager public poolManager;
    uint256 public liquidity;
    mapping(address => uint256) public userLiquidity;

    constructor(
        IOddzLiquidityPool[] memory _pools,
        uint256[] memory _shares,
        IOddzLiquidityPoolManager _poolManager
    ) {
        pools = _pools;
        shares = _shares;
        poolManager = _poolManager;
    }

    function getPools() public view returns (IOddzLiquidityPool[] memory) {
        return pools;
    }

    function getShares() public view returns (uint256[] memory) {
        return shares;
    }

    function addLiquidity(address _provider, uint256 _amount) public override onlyOwner {
        for (uint256 i = 0; i < pools.length; i++) {
            poolManager.addLiquidity(pools[i], (shares[i] * _amount) / 100);
        }
        updateLiquidity(_provider, _amount, TransactionType.ADD);

        emit AddedLiquidity(_provider, _amount);
    }

    function removeLiquidity(address _provider, uint256 _amount) public override onlyOwner {
        require(_amount <= userLiquidity[_provider], "Strategy Error: insufficient user balance in strategy");
        for (uint256 i = 0; i < pools.length; i++) {
            poolManager.removeLiquidity(pools[i], (shares[i] * _amount) / 100);
        }
        updateLiquidity(_provider, _amount, TransactionType.REMOVE);

        emit RemovedLiquidity(_provider, _amount);
    }

    function updateLiquidity(
        address _provider,
        uint256 _amount,
        TransactionType _transaction
    ) public onlyOwner {
        if (_transaction == TransactionType.ADD) {
            userLiquidity[_provider] += _amount;
            liquidity += _amount;
        } else {
            userLiquidity[_provider] -= _amount;
            liquidity -= _amount;
        }
    }
}
