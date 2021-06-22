pragma solidity 0.8.3;
import "./IOddzLiquidityPool.sol";


interface IOddzStrategyManager{
    struct Strategy{
        address _address;
        IOddzLiquidityPool[] _pools;
        uint256[] _shares;
    }

}