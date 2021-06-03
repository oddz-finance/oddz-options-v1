// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "../IOddzAdministrator.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract MockAdministrator is IOddzAdministrator {
    using SafeERC20 for IERC20;

    IERC20 public token;

    constructor(IERC20 _token) {
        token = _token;
    }

    function deposit(uint256 _amount, DepositType _depositType) external override {
        token.safeTransferFrom(msg.sender, address(this), _amount);
        emit Deposit(msg.sender, _depositType, _amount);
    }
}
