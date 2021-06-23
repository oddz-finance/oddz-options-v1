pragma solidity 0.8.3;
import "./OddzWriteStrategy.sol";

interface IOddzStrategyManager{
   
    event CreatedStrategy(address indexed _strategy, address indexed _user);
    event ChangedStrategy(address indexed _old, address indexed _new, address indexed _user);
    function createStrategy(
        address[] memory _pools, 
        uint256[] memory _shares, 
        uint256 _amount
        ) 
        external 
        returns 
        (uint256 strategyId);
    function changeStrategy(address _old, address _new) external;
}