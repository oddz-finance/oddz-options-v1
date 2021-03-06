pragma solidity 0.8.3;

import "../Pool/IOddzLiquidityPoolManager.sol";

contract MockOptionManager {
    IOddzLiquidityPoolManager public pool;
    IERC20 public token;

    constructor(IOddzLiquidityPoolManager _pool, IERC20 _token) {
        pool = _pool;
        token = _token;
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
        token.transfer(address(pool), 10000000000);
    }

    function lockWithParams(
        uint256 _id,
        address _assetPair,
        IOddzOption.OptionType _type
    ) public {
        IOddzLiquidityPoolManager.LiquidityParams memory liquidityParams =
            IOddzLiquidityPoolManager.LiquidityParams(1000000000000, 86400, _assetPair, "B_S", _type);
        pool.lockLiquidity(_id, liquidityParams, 10000000000);
        token.transfer(address(pool), 10000000000);
    }

    function lockWithCustomParams(
        uint256 _id,
        address _assetPair,
        IOddzOption.OptionType _type,
        uint256 _amount,
        uint256 _expiration,
        bytes32 _model
    ) public {
        IOddzLiquidityPoolManager.LiquidityParams memory liquidityParams =
            IOddzLiquidityPoolManager.LiquidityParams(_amount, _expiration, _assetPair, _model, _type);

        pool.lockLiquidity(_id, liquidityParams, 10000000000);
        token.transfer(address(pool), 10000000000);
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
        pool.sendUA(_id, _account, _amount, "ETH", "USD", 86400, 1);
    }
}
