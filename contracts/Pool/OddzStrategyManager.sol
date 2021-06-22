pragma solidity 0.8.3;

import "./IOddzLiquidityPoolManager.sol";
import "./OddzCreateWriteStrategy.sol";

contract OddzStrategyManager{

    IOddzLiquidityPoolManager poolManager;
    mapping(address => Strategy) strategies;
    mapping(address => Strategy) userStrategies;
    Strategy[] public strategies;
    address[] public pools;
    mapping(address => bool) public validPool;
     // user address -> date of strategy transfer
    mapping(address => uint256) public lastStrategyChange;

    uint256 public strategyChangeLockupDuration = 7 days;

    constructor(IOddzLiquidityPoolManager _poolManager){
        poolManager = _poolManager;
    }

    //function addPools()

    function createStrategy(Strategy _strategy) public {
        require(
            block.timestamp > lastStrategyChange + strategyChangeLockupDuration, 
            "SM Error: Strategy creation not allowed within lockup duration"
        );
        require(
            _strategy._pool.length > 0,
            "SM Error: no pool selected for strategy"
        );    
          
        lastStrategyChange[msg.sender] = block.timestamp;
        address deployedStrategy = address(new OddzCreateWriteStrategy(_strategy));
        strategies[deployedStrategy] = _strategy;
        userStrategies[msg.sender] = _strategy;
        strategies.push(_strategy);
        uint256 totalAmount;

        for(uint256 i = 0; i<_strategy._pools.length; i++){
            require(
                validPool[_strategy._pools[i]], "SM Error: invalid pool"
            ); 
            totalAmount += _strategy._shares[i];
            poolManager.addLiquidity(_strategy._pools[i], _strategy._shares[i]);
        }
        require(totalAmount == _strategy._amount, "SM Error: invalid shares between pools");
    }

    function addLiquidity()

    function changeStrategy(Strategy _old, Strategy _new) public {
    }
}