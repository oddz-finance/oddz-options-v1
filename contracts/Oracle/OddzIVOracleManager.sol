// SPDX-License-Identifier: BSD-4-Clause
pragma solidity =0.8.3;

import "./IOddzVolatilityOracle.sol";
import "../Option/IOddzOption.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Address.sol";

contract OddzIVOracleManager is AccessControl {
    using Address for address;

    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    struct AggregatorIVData {
        bytes32 _underlying;
        bytes32 _strike;
        IOddzVolatilityOracle _aggregator;
    }

    mapping(bytes32 => mapping(bytes32 => IOddzVolatilityOracle)) public activeIVAggregator;
    mapping(bytes32 => AggregatorIVData) public aggregatorIVMap;

    /**
     * @dev Emitted when the new Oracle aggregator data has been added.
     * @param _underlying Address of the underlying asset.
     * @param _strike Address of the strike asset.
     * @param _aggregator Address of the Oracle aggregator.
     */
    event NewIVAggregator(bytes32 indexed _underlying, bytes32 indexed _strike, IOddzVolatilityOracle _aggregator);

    /**
     * @dev Emitted when the Oracle aggregator data has been changed.
     * @param _underlying Address of the underlying asset.
     * @param _strike Address of the strike asset.
     * @param _previousAggregator Address of the previous aggregator.
     * @param _newAggregator Address of the new aggregator.
     */
    event SetIVAggregator(
        bytes32 indexed _underlying,
        bytes32 indexed _strike,
        IOddzVolatilityOracle _previousAggregator,
        IOddzVolatilityOracle _newAggregator
    );

    modifier onlyOwner(address _address) {
        require(hasRole(DEFAULT_ADMIN_ROLE, _address), "caller has no access to the method");
        _;
    }

    modifier onlyManager(address _address) {
        require(hasRole(MANAGER_ROLE, _address), "caller has no access to the method");
        _;
    }

    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function setManager(address _address) public {
        require(_address != address(0) && _address.isContract(), "Invalid manager address");
        grantRole(MANAGER_ROLE, _address);
    }

    function removeManager(address _address) public {
        revokeRole(MANAGER_ROLE, _address);
    }

    /**
     * @notice Function to add the the IV Oracle aggregator data.
     * @param _underlying Id of the underlying.
     * @param _strike Id of the strike asset.
     * @param _aggregator Address of the oddz aggregator.
     * @param _aggregatorPriceContract Address of the price oracle aggregator
     * @param _aggregatorPeriod IV period (e.g. 1 day IV, 2 day IV, 14 day IV)
     */
    function addIVAggregator(
        bytes32 _underlying,
        bytes32 _strike,
        IOddzVolatilityOracle _aggregator,
        address _aggregatorPriceContract,
        uint8 _aggregatorPeriod
    ) public onlyOwner(msg.sender) returns (bytes32 agHash) {
        require(_underlying != _strike, "Invalid assets");
        require(address(_aggregator).isContract(), "Invalid aggregator");

        AggregatorIVData memory data = AggregatorIVData(_underlying, _strike, _aggregator);
        agHash = keccak256(abi.encode(_underlying, _strike, address(_aggregator)));
        aggregatorIVMap[agHash] = data;

        _aggregator.setPairContract(_underlying, _strike, _aggregatorPriceContract, _aggregatorPeriod);

        emit NewIVAggregator(_underlying, _strike, _aggregator);
    }

    /**
     * @notice Function to add the the IV Oracle aggregator data.
     * @param _agHash hash of the underlying, strike asset and oddz aggregator.
     */
    function setActiveIVAggregator(bytes32 _agHash) public onlyOwner(msg.sender) {
        AggregatorIVData storage ivData = aggregatorIVMap[_agHash];
        require(address(ivData._aggregator) != address(0), "Invalid aggregator");

        IOddzVolatilityOracle oldIvAg = activeIVAggregator[ivData._underlying][ivData._strike];
        activeIVAggregator[ivData._underlying][ivData._strike] = ivData._aggregator;

        emit SetIVAggregator(ivData._underlying, ivData._strike, oldIvAg, ivData._aggregator);
    }

    function calculateIv(
        bytes32 _underlying,
        bytes32 _strike,
        IOddzOption.OptionType _type,
        uint256 _expiration,
        uint256 _currentPrice,
        uint256 _strikePrice
    ) public view onlyManager(msg.sender) returns (uint256 iv, uint8 decimals) {
        IOddzVolatilityOracle aggregator = activeIVAggregator[_underlying][_strike];
        require(address(aggregator) != address(0), "No aggregator");

        bool isCallOption = (_type == IOddzOption.OptionType.Call);

        (iv, decimals) = aggregator.getIv(_underlying, _strike, isCallOption, _expiration, _currentPrice, _strikePrice);
    }
}
