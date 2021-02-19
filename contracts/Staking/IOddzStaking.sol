// SPDX-License-Identifier: BSD-4-Clause
pragma solidity ^0.7.0;

interface IOddzStaking {
    enum DepositType { Settlement, Transaction, Others }

    event Redeem(address indexed _staker, uint256 _amount);
    event Deposit(uint256 indexed _time, uint256 _amount, DepositType _type);

    function redeemProfit() external returns (uint256 _profit);

    function profitInfo(address _staker) external view returns (uint256);

    function deposit(uint256 _amount, DepositType _type) external;
}
