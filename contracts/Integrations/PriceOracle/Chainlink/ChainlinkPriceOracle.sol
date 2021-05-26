// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "../../../Oracle/IOddzPriceOracle.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@chainlink/contracts/src/v0.7/interfaces/AggregatorV3Interface.sol";

contract ChainlinkPriceOracle is AccessControl, IOddzPriceOracle {
    using Address for address;
    uint256 public delayInSeconds = 30 * 60;
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    mapping(bytes32 => mapping(bytes32 => address)) public addressMap;

    modifier onlyOwner(address _address) {
        require(hasRole(DEFAULT_ADMIN_ROLE, _address), "Chainlink: caller has no access to the method");
        _;
    }

    modifier onlyManager(address _address) {
        require(hasRole(MANAGER_ROLE, _address), "Chainlink: caller has no access to the method");
        _;
    }

    function setManager(address _address) public {
        require(_address != address(0) && _address.isContract(), "Chainlink: Invalid manager");
        grantRole(MANAGER_ROLE, _address);
    }

    function removeManager(address _address) public {
        revokeRole(MANAGER_ROLE, _address);
    }

    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function getPrice(bytes32 _underlying, bytes32 _strike)
        public
        view
        override
        onlyManager(msg.sender)
        returns (uint256 price, uint8 decimals)
    {
        address aggregator = addressMap[_underlying][_strike];
        require(aggregator != address(0), "Chainlink: No aggregator");

        (, int256 answer, , uint256 updatedAt, ) = AggregatorV3Interface(aggregator).latestRoundData();
        price = uint256(answer);
        decimals = AggregatorV3Interface(aggregator).decimals();

        require(updatedAt > (block.timestamp - delayInSeconds), "Chainlink: Out Of Sync");
    }

    function setPairContract(
        bytes32 _underlying,
        bytes32 _strike,
        address _aggregator
    ) public override onlyManager(msg.sender) {
        require(_aggregator.isContract(), "Chainlink: Invalid aggregator");
        addressMap[_underlying][_strike] = _aggregator;

        emit AddAssetPairAggregator(_underlying, _strike, address(this), _aggregator);
    }

    function setDelay(uint256 _delay) public onlyOwner(msg.sender) {
        delayInSeconds = _delay;
    }
}
