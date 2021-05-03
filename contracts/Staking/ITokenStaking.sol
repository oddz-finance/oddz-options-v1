pragma solidity 0.8.3;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";


interface ITokenStaking{
    function stake(address _token, address _staker,uint256 _amount) external;
    function balance(address _staker) external returns(uint256);
    function mint(address _staker, uint256 _amount) external ;
    function burn(address _staker, uint256 _amount) external ;
}