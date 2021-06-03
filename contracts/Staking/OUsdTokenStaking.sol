// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "./AbstractTokenStaking.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract OUsdTokenStaking is AbstractTokenStaking, ERC20("Oddz USD Staking Token", "soUSD") {
    using SafeERC20 for IERC20;

    constructor(address _token) {
        token = _token;
    }

    function stake(address _staker, uint256 _amount) external override onlyOwner {
        _stake(_staker, _amount);
        _mint(_staker, _amount);

        IERC20(token).safeTransferFrom(_staker, address(this), _amount);
    }

    function unstake(address _staker, uint256 _amount) external override onlyOwner {
        _unstake(_staker, _amount);
        _burn(_staker, _amount);

        // Transfer source staking tokens
        IERC20(token).safeTransfer(_staker, _amount);
    }

    function balance(address _address) external view override returns (uint256 bal) {
        bal = balanceOf(_address);
    }
}
