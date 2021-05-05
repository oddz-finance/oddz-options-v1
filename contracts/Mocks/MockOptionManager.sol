pragma solidity 0.8.3;

import "../Pool/IOddzLiquidityPoolManager.sol";

contract MockOptionManager {
    IOddzLiquidityPoolManager public pool;

    constructor(IOddzLiquidityPoolManager _pool) {
        pool = _pool;
    }

    function lock(uint256 _id) public {
        pool.lockLiquidity(_id, 1000000000000, 10000000000, 0xFCb06D25357ef01726861B30b0b83e51482db417, "B_S", 86400);
    }

    function unlock() public {
        pool.unlockLiquidity(0);
    }

    function send(address payable _account, uint256 _amount) public {
        lock(0);
        pool.send(0, _account, _amount);
    }

    function sendUA(address payable _account, uint256 _amount) public {
        lock(0);
        pool.sendUA(0, _account, _amount, "ETH", "USD", 86400);
    }
}
