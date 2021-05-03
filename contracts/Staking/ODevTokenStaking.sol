pragma solidity 0.8.3;

import "./ITokenStaking.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract ODevTokenStaking is ITokenStaking, ERC20("Oddz Dev Staking Token", "sODev") {
    using SafeERC20 for IERC20;

    function stake(
        address _token,
        address _staker,
        uint256 _amount
    ) external override {
        _mint(msg.sender, _amount);
        IERC20(_token).transferFrom(_staker, address(this), _amount);
    }

    function balance(address _address) external override returns (uint256 bal) {
        bal = balanceOf(_address);
    }

    function mint(address _staker, uint256 _amount) external override {
        _mint(_staker, _amount);
    }

    function burn(address _staker, uint256 _amount) external override {
        _burn(_staker, _amount);
    }
}
