pragma solidity 0.8.3;

import "../Pool/IOddzLiquidityPoolManager.sol";

contract MockOptionManager {
    IOddzLiquidityPoolManager public pool;

    constructor(IOddzLiquidityPoolManager _pool) {
        pool = _pool;
    }

    function lock(uint256 _id) public {
        IOddzLiquidityPoolManager.LiquidityParams memory liquidityParams =
            IOddzLiquidityPoolManager.LiquidityParams(
                1000000000000,
                86400,
                0xFCb06D25357ef01726861B30b0b83e51482db417,
                "B_S",
                IOddzOption.OptionType.Call
            );
        pool.lockLiquidity(_id, liquidityParams, 10000000000);
    }

    function unlock(uint256 _id) public {
        pool.unlockLiquidity(_id);
    }

    function send(
        address payable _account,
        uint256 _amount,
        uint256 _id
    ) public {
        lock(_id);
        pool.send(_id, _account, _amount);
    }

    function sendUA(
        address payable _account,
        uint256 _amount,
        uint256 _id
    ) public {
        lock(_id);
        pool.sendUA(_id, _account, _amount, "ETH", "USD", 86400);
    }
}
