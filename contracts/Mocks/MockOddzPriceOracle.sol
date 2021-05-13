// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "../Oracle/IOddzPriceOracle.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Address.sol";

contract MockOddzPriceOracle is AccessControl, IOddzPriceOracle {
    using Address for address;

    uint256 public price;
    uint8 public decimals = 8;
    uint256 public updatedAt = uint256(block.timestamp);
    uint256 public delayInSeconds = 30 * 60;
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    constructor(uint256 _price) {
        price = _price;
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    modifier onlyManager(address _address) {
        require(hasRole(MANAGER_ROLE, _address), "caller has no access to the method");
        _;
    }

    modifier onlyOwner(address _address) {
        require(hasRole(DEFAULT_ADMIN_ROLE, _address), "caller has no access to the method");
        _;
    }

    function setManager(address _address) public {
        require(_address != address(0) && _address.isContract(), "Invalid manager address");
        grantRole(MANAGER_ROLE, _address);
    }

    function getPrice(bytes32 _underlying, bytes32 _strike)
        public
        view
        override
        onlyManager(msg.sender)
        returns (uint256, uint8)
    {
        require(updatedAt > uint256(block.timestamp) - delayInSeconds, "Chain link Price Out Of Sync");

        return (price, decimals);
    }

    function setUnderlyingPrice(uint256 _price) external {
        price = _price;
    }

    function setDecimals(uint8 _decimals) external {
        decimals = _decimals;
    }

    function setUpdatedAt(uint256 _delay) external {
        updatedAt = uint256(block.timestamp) - _delay;
    }

    function setPairContract(
        bytes32 _underlying,
        bytes32 _strike,
        address _aggregator
    ) public override onlyManager(msg.sender) {}

    function setDelay(uint256 _delay) public onlyOwner(msg.sender) {
        delayInSeconds = _delay;
    }
}
