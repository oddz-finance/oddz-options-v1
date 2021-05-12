pragma solidity 0.8.3;

import "./AbstractTokenStaking.sol";
import "./IOddzStaking.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract OddzTokenStaking is AbstractTokenStaking, ERC20("Oddz Staking Token", "sOddz") {
    using SafeERC20 for IERC20;

    

    function stake(
        address _staker,
        uint256 _amount,
        uint256 _date
    ) external override {
        _mint(_staker, _amount);
        if (stakers[_staker]._address == address(0)) {
            stakers[_staker] = StakerDetails(_staker, _date, 0);
        } else {
            stakers[_staker]._lastStakedAt = _date;
        }
        IERC20(token).safeTransferFrom(_staker, address(this), _amount);
    }

    function mint(address _staker, uint256 _amount) external override onlyOwner {
        _mint(_staker, _amount);
    }

    function burn(address _staker, uint256 _amount) external override onlyOwner {
        _burn(_staker, _amount);
    }

    function balance(address _address) external view override returns (uint256 bal) {
        bal = balanceOf(_address);
    }

    function supply() external view override returns (uint256 supply) {
        supply = totalSupply();
    }
}
