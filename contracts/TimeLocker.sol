// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "@openzeppelin/contracts/governance/TimelockController.sol";

contract TimeLocker is TimelockController {
    constructor(
        uint256 _minDelay,
        address[] memory _proposers,
        address[] memory _executors
    ) TimelockController(_minDelay, _proposers, _executors) {}

    function setProposer(address _proposer) public onlyRole(TIMELOCK_ADMIN_ROLE) {
        require(_proposer != address(0), "invalid proposer address");
        _setupRole(PROPOSER_ROLE, _proposer);
    }

    function setExecutor(address _executor) public onlyRole(TIMELOCK_ADMIN_ROLE) {
        require(_executor != address(0), "invalid executor address");
        _setupRole(EXECUTOR_ROLE, _executor);
    }
}
