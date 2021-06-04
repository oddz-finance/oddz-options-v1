pragma solidity 0.8.3;
import "../Swap/DexManager.sol";

contract MockLiquidityPool {
    DexManager public dexManager;

    constructor(DexManager _dexManager) {
        dexManager = _dexManager;
    }

    function sendUA(
        bytes32 _fromToken,
        bytes32 _toToken,
        address _exchange,
        address _account
    ) public {
        dexManager.swap(_fromToken, _toToken, _exchange, _account, 100, 1000000, 1);
    }

    function getExchange(bytes32 _fromToken, bytes32 _toToken) public view returns (address exchange) {
        exchange = dexManager.getExchange(_fromToken, _toToken);
    }
}
