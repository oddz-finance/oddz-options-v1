// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IOddzAdministrator {
    enum DepositType { Transaction, Settlement }

    /**
     * @dev Emitted when txn fee and settlement fee is deposited
     * @param _sender Address of the depositor
     * @param _type  DepositType (Transaction or Settlement)
     * @param _amount Amount deposited
     */
    event Deposit(address indexed _sender, DepositType indexed _type, uint256 _amount);

    function deposit(uint256 _amount, DepositType _depositType) external;
}
