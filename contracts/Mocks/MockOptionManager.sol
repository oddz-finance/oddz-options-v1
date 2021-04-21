pragma solidity 0.8.3;
import "../Pool/IOddzLiquidityPool.sol";
import "hardhat/console.sol";

contract MockOptionManager {
    IOddzLiquidityPool public pool;

    constructor(IOddzLiquidityPool _pool) {
        pool = _pool;
    }

    function lock(uint256 _id) public {
        pool.lockLiquidity(_id, 1000000000000, 10000000000);
    }

    function unlock() public {
        pool.unlockLiquidity(0);
    }

    function send(address payable _account) public {
        lock(0);
        pool.send(0, _account, 10000000000);
    }

    function sendUA(address payable _account) public {
        lock(0);
        pool.sendUA(0, _account, 10000000000, "ETH", "USD", 86400);
    }
}
