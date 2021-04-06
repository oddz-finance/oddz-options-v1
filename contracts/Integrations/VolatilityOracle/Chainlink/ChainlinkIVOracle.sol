// SPDX-License-Identifier: BSD-4-Clause
pragma solidity =0.8.3;

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

    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        // Add default IV aggregation periods
        addAllowedPeriods(1);
        addAllowedPeriods(2);
        addAllowedPeriods(7);
        addAllowedPeriods(14);
        addAllowedPeriods(21);
        addAllowedPeriods(28);

        // Add default pair map for Day with IV Agg period
        mapDaysToIVPeriod(1, 1);
        mapDaysToIVPeriod(2, 2);
        mapDaysToIVPeriod(3, 2);
        mapDaysToIVPeriod(4, 2);
        mapDaysToIVPeriod(5, 7);
        mapDaysToIVPeriod(6, 7);
        mapDaysToIVPeriod(7, 7);
        mapDaysToIVPeriod(8, 7);
        mapDaysToIVPeriod(9, 7);
        mapDaysToIVPeriod(10, 7);
        mapDaysToIVPeriod(11, 14);
        mapDaysToIVPeriod(12, 14);
        mapDaysToIVPeriod(13, 14);
        mapDaysToIVPeriod(14, 14);
        mapDaysToIVPeriod(15, 14);
        mapDaysToIVPeriod(16, 14);
        mapDaysToIVPeriod(17, 14);
        mapDaysToIVPeriod(18, 21);
        mapDaysToIVPeriod(19, 21);
        mapDaysToIVPeriod(20, 21);
        mapDaysToIVPeriod(21, 21);
        mapDaysToIVPeriod(22, 21);
        mapDaysToIVPeriod(23, 21);
        mapDaysToIVPeriod(24, 21);
        mapDaysToIVPeriod(25, 28);
        mapDaysToIVPeriod(26, 28);
        mapDaysToIVPeriod(27, 28);
        mapDaysToIVPeriod(28, 28);
        mapDaysToIVPeriod(29, 28);
        mapDaysToIVPeriod(30, 28);
        mapDaysToIVPeriod(31, 28);
    }

    /**
     @notice Add/update allowed Option expiry preiod to IV period map
     @param _day option expiry days
     @param _ivAgg IV aggregation period
     */
    function mapDaysToIVPeriod(uint256 _day, uint8 _ivAgg) public onlyOwner(msg.sender) allowedPeriod(_ivAgg) {
        ivPeriodMap[_day] = _ivAgg;
    }

    /**
     @notice Add/update allowed IV period map
     @param _ivAgg IV aggregation period
     */
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
