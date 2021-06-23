pragma solidity 0.8.3;

import "./IOddzLiquidityPoolManager.sol";
import "./IOddzStrategyManager.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";


contract OddzStrategyManager is IOddzStrategyManager,Ownable{
    using Address for address;

    IOddzLiquidityPoolManager poolManager;

    mapping(address => bool) public validPools;
    mapping(address => uint256) public lastStrategyChanged;
    mapping(address => uint256) public lastStrategyCreated;

    uint256 public strategyChangeLockupDuration = 7 days;
    uint256 public strategyCreateLockupDuration = 7 days;

    constructor(IOddzLiquidityPoolManager _poolManager){
        poolManager = _poolManager;
    }

    function addPool(address _pool) public onlyOwner{
        require(_pool.isContract(), "SM Error: invalid pool address");
        validPools[_pool] = true;
    }

    function updateStrategyCreateLockupDuration(uint256 _duration) public onlyOwner{
        require(_duration >= 1 days && _duration <= 30 days, "SM Error: invalid duration");
        strategyCreateLockupDuration = _duration;
    }

    function updateStrategyChangeLockupDuration(uint256 _duration) public onlyOwner{
        require(_duration >= 1 days && _duration <= 30 days, "SM Error: invalid duration");
        strategyChangeLockupDuration = _duration;
    }


    function createStrategy(
        address[] memory _pools, 
        uint256[] memory _shares, 
        uint256 _amount
        ) public override returns (uint256 strategyId){
        require(
            block.timestamp > lastStrategyCreated[msg.sender] + strategyCreateLockupDuration, 
            "SM Error: Strategy creation not allowed within lockup duration"
        );
        require(
            _pools.length > 0,
            "SM Error: no pool selected for strategy"
        );    
          
        lastStrategyCreated[msg.sender] = block.timestamp;
        uint256 totalAmount=0;
        for(uint256 i = 0; i < _pools.length;i++){
             require(
                validPools[_pools[i]], "SM Error: invalid pool"
            ); 
            totalAmount += (_shares[i] * _amount) / 100;

        }
        require(totalAmount == _amount, "SM Error: invalid shares between pools");
        address strategyId = address(new OddzWriteStrategy(_pools, _shares, poolManager));
        addLiquidity(strategyId, _amount);
        emit CreatedStrategy(strategyId, msg.sender);
    }

    function addLiquidity(address _strategy, uint256 _amount) public{
        IOddzWriteStrategy(_strategy).addLiquidity(msg.sender,_amount);
    }

    function removeLiquidity(address _strategy, uint256 _amount) public{
        IOddzWriteStrategy(_strategy).removeLiquidity(msg.sender,_amount);
    }

    function changeStrategy(address _old, address _new) public override{
        require(
            block.timestamp > lastStrategyChanged[msg.sender] + strategyChangeLockupDuration, 
            "SM Error: Strategy changes not allowed within lockup duration"
        );
        lastStrategyChanged[msg.sender] = block.timestamp;
        uint256 userLiquidity = OddzWriteStrategy(_old).userLiquidity(msg.sender);
        uint256[] memory oldPools = OddzWriteStrategy(_old).getShares();
        uint256[] memory oldStrategyPoolLiquidity;
        for(uint256 i = 0; i < oldPools.length; i++){
            oldStrategyPoolLiquidity[i] = userLiquidity *  oldPools[i] / 100;
        }
        uint256[] memory newPools = OddzWriteStrategy(_new).getShares();
        uint256[] memory newStrategyPoolLiquidity;
        for(uint256 i = 0; i < newPools.length; i++){
            newStrategyPoolLiquidity[i] = userLiquidity *  newPools[i] / 100;
        }
        IOddzLiquidityPoolManager.PoolTransfer memory poolTransfer = IOddzLiquidityPoolManager.PoolTransfer(
            OddzWriteStrategy(_old).getPools(),
            OddzWriteStrategy(_new).getPools(),
            oldStrategyPoolLiquidity,
            newStrategyPoolLiquidity
        );

        poolManager.move(poolTransfer);
        IOddzWriteStrategy(_old).updateLiquidity(msg.sender, userLiquidity, IOddzWriteStrategy.TransactionType.REMOVE);
        IOddzWriteStrategy(_new).updateLiquidity(msg.sender, userLiquidity, IOddzWriteStrategy.TransactionType.ADD);

        emit ChangedStrategy(_old, _new, msg.sender);

    }
}