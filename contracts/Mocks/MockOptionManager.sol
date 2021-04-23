pragma solidity 0.8.3;

import "../Pool/IOddzLiquidityPool.sol";

contract MockOptionManager {
    IOddzLiquidityPool public pool;

    constructor(IOddzLiquidityPool _pool) {
        pool = _pool;
    }

    function lock() public {
        pool.lockLiquidity(0, 1000000000000, 10000000000);
    }

    function unlock() public {
        pool.unlockLiquidity(0);
    }

    function send(address payable _account) public {
        lock();
        pool.send(0, _account, 10000000000);
    }

    function sendUA(address payable _account) public {
        lock();
        pool.sendUA(0, _account, 10000000000, "ETH", "USD", 86400);
    }
}
