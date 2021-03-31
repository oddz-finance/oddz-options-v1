// SPDX-License-Identifier: BSD-4-Clause
pragma solidity ^0.7.0;

import "../../../Oracle/IOddzVolatilityOracle.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@chainlink/contracts/src/v0.7/interfaces/AggregatorV3Interface.sol";

contract ChainlinkIVOracle is AccessControl, IOddzVolatilityOracle {
    using Address for address;

    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    mapping(uint8 => bool) public allowedPeriods;
    mapping(uint256 => uint8) public ivPeriodMap;

    mapping(bytes32 => address) addressMap;

    modifier onlyOwner(address _address) {
        require(hasRole(DEFAULT_ADMIN_ROLE, _address), "caller has no access to the method");
        _;
    }

    modifier onlyManager(address _address) {
        require(hasRole(MANAGER_ROLE, _address), "caller has no access to the method");
        _;
    }

    modifier allowedPeriod(uint8 _aggregatorPeriod) {
        require(allowedPeriods[_aggregatorPeriod] == true, "Invalid aggregator period");
        _;
    }

    constructor() public {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        // Add default IV aggregation periods
        addAllowedPeriods(1);
        addAllowedPeriods(2);
        addAllowedPeriods(7);
        addAllowedPeriods(14);
        addAllowedPeriods(21);
        addAllowedPeriods(28);

        // Add default pair map for Day with IV Agg period
        createPeriodMap(1, 1);
        createPeriodMap(2, 2);
        createPeriodMap(3, 2);
        createPeriodMap(4, 2);
        createPeriodMap(5, 7);
        createPeriodMap(6, 7);
        createPeriodMap(7, 7);
        createPeriodMap(8, 7);
        createPeriodMap(9, 7);
        createPeriodMap(10, 7);
        createPeriodMap(11, 14);
        createPeriodMap(12, 14);
        createPeriodMap(13, 14);
        createPeriodMap(14, 14);
        createPeriodMap(15, 14);
        createPeriodMap(16, 14);
        createPeriodMap(17, 14);
        createPeriodMap(18, 21);
        createPeriodMap(19, 21);
        createPeriodMap(20, 21);
        createPeriodMap(21, 21);
        createPeriodMap(22, 21);
        createPeriodMap(23, 21);
        createPeriodMap(24, 21);
        createPeriodMap(25, 28);
        createPeriodMap(26, 28);
        createPeriodMap(27, 28);
        createPeriodMap(28, 28);
        createPeriodMap(29, 28);
        createPeriodMap(30, 28);
        createPeriodMap(31, 28);
    }

    function createPeriodMap(uint256 _day, uint8 _ivAgg) public onlyOwner(msg.sender) {
        ivPeriodMap[_day] = _ivAgg;
    }

    function addAllowedPeriods(uint8 _ivAgg) public onlyOwner(msg.sender) {
        allowedPeriods[_ivAgg] = true;
    }

    function setManager(address _address) public {
        require(_address != address(0) && _address.isContract(), "Invalid manager address");
        grantRole(MANAGER_ROLE, _address);
    }

    function removeManager(address _address) public {
        revokeRole(MANAGER_ROLE, _address);
    }

    function getIv(
        bytes32 _underlying,
        bytes32 _strike,
        bool _isCallOption,
        uint256 _expiration,
        uint256 _currentPrice,
        uint256 _strikePrice
    ) public view override onlyManager(msg.sender) returns (uint256 iv, uint8 decimals) {
        uint256 _expirationDay = (_expiration / 1 days);
        require(ivPeriodMap[_expirationDay] != 0, "Chainlink IV: Invalid expiration");

        bytes32 agHash = keccak256(abi.encode(_underlying, _strike, ivPeriodMap[_expirationDay]));
        address aggregator = addressMap[agHash];
        require(aggregator != address(0), "No aggregator");

        (, int256 answer, , , ) = AggregatorV3Interface(aggregator).latestRoundData();

        iv = uint256(answer);
        decimals = AggregatorV3Interface(aggregator).decimals();
    }

    function setPairContract(
        bytes32 _underlying,
        bytes32 _strike,
        address _aggregator,
        uint8 _aggregatorPeriod
    ) public override onlyManager(msg.sender) allowedPeriod(_aggregatorPeriod) {
        require(_aggregator.isContract(), "Invalid chainlink aggregator");
        bytes32 agHash = keccak256(abi.encode(_underlying, _strike, _aggregatorPeriod));
        addressMap[agHash] = _aggregator;

        emit AddAssetPairIVAggregator(_underlying, _strike, address(this), _aggregator, _aggregatorPeriod);
    }
}
