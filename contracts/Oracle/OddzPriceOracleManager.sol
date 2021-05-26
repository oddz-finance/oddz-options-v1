// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "./IOddzPriceOracle.sol";
import "./IOddzPriceOracleManager.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Address.sol";

contract OddzPriceOracleManager is AccessControl, IOddzPriceOracleManager {
    using Address for address;

    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    struct AggregatorData {
        bytes32 _underlying;
        bytes32 _strike;
        IOddzPriceOracle _aggregator;
    }

    mapping(bytes32 => mapping(bytes32 => IOddzPriceOracle)) public activeAggregator;
    mapping(bytes32 => AggregatorData) public aggregatorMap;

    /**
     * @dev Emitted when the new Oracle aggregator data has been added.
     * @param _underlying Address of the underlying asset.
     * @param _strike Address of the strike asset.
     * @param _aggregator Address of the Oracle aggregator.
     */
    event NewAggregator(bytes32 indexed _underlying, bytes32 indexed _strike, IOddzPriceOracle _aggregator);

    /**
     * @dev Emitted when the Oracle aggregator data has been changed.
     * @param _underlying Address of the underlying asset.
     * @param _strike Address of the strike asset.
     * @param _previousAggregator Address of the previous aggregator.
     * @param _newAggregator Address of the new aggregator.
     */
    event SetAggregator(
        bytes32 indexed _underlying,
        bytes32 indexed _strike,
        IOddzPriceOracle _previousAggregator,
        IOddzPriceOracle _newAggregator
    );

    modifier onlyOwner(address _address) {
        require(hasRole(DEFAULT_ADMIN_ROLE, _address), "OPOM Error: caller has no access to the method");
        _;
    }

    modifier onlyManager(address _address) {
        require(hasRole(MANAGER_ROLE, _address), "OPOM Error: caller has no access to the method");
        _;
    }

    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function setManager(address _address) external {
        require(_address != address(0) && _address.isContract(), "OPOM Error: Invalid manager address");
        grantRole(MANAGER_ROLE, _address);
    }

    function removeManager(address _address) external {
        revokeRole(MANAGER_ROLE, _address);
    }

    /**
     * @notice Function to add the the Oracle aggregator data.
     * @param _underlying Id of the underlying.
     * @param _strike Id of the strike asset.
     * @param _aggregator Address of the oddz aggregator.
     * @param _aggregatorPriceContract Address of the price oracle aggregator
     */
    function addAggregator(
        bytes32 _underlying,
        bytes32 _strike,
        IOddzPriceOracle _aggregator,
        address _aggregatorPriceContract
    ) external onlyOwner(msg.sender) returns (bytes32 agHash) {
        require(_underlying != _strike, "OPOM Error: Invalid assets");
        require(address(_aggregator).isContract(), "OPOM Error: Invalid aggregator");

        AggregatorData memory data = AggregatorData(_underlying, _strike, _aggregator);
        agHash = keccak256(abi.encode(_underlying, _strike, address(_aggregator)));
        aggregatorMap[agHash] = data;

        _aggregator.setPairContract(_underlying, _strike, _aggregatorPriceContract);

        emit NewAggregator(_underlying, _strike, _aggregator);
    }

    /**
     * @notice Function to add the the Oracle aggregator data.
     * @param _agHash hash of the underlying, strike asset and oddz aggregator.
     */
    function setActiveAggregator(bytes32 _agHash) external onlyOwner(msg.sender) {
        AggregatorData storage data = aggregatorMap[_agHash];
        require(address(data._aggregator) != address(0), "OPOM Error: Invalid aggregator");

        IOddzPriceOracle oldAg = activeAggregator[data._underlying][data._strike];
        activeAggregator[data._underlying][data._strike] = data._aggregator;

        emit SetAggregator(data._underlying, data._strike, oldAg, data._aggregator);
    }

    function getUnderlyingPrice(bytes32 _underlying, bytes32 _strike)
        public
        view
        override
        onlyManager(msg.sender)
        returns (uint256 price, uint8 decimal)
    {
        IOddzPriceOracle aggregator = activeAggregator[_underlying][_strike];
        require(address(aggregator) != address(0), "OPOM Error: No aggregator");

        (price, decimal) = aggregator.getPrice(_underlying, _strike);
    }
}
