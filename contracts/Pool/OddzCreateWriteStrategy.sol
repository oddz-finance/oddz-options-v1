pragma solidity 0.8.3;

import "./IOddzStrategyManager.sol";

contract OddzCreateWriteStrategy{
    Strategy public strategy;

    constructor(Strategy _strategy){
        strategy = _strategy;
    }

    function getPools() public returns (address[] memory){
        return strategy._pools;
    }

}