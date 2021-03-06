// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "./IOddzPremium.sol";
import "./IOddzOptionPremiumManager.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract OddzOptionPremiumManager is AccessControl, IOddzOptionPremiumManager {
    using Address for address;

    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant TIMELOCKER_ROLE = keccak256("TIMELOCKER_ROLE");

    struct PremiumModel {
        bool _active;
        IOddzPremium _model;
    }

    mapping(bytes32 => PremiumModel) public premiumModelMap;

    /**
     * @dev Emitted when the new option premium model is added
     * @param _name option premium model name
     * @param _address Address of the option premium pricing contract
     */
    event NewOptionPremiumModel(bytes32 indexed _name, IOddzPremium _address);

    /**
     * @dev Emitted when the option premium model status is updated
     * @param _name option premium model name
     * @param _active model status
     */
    event OptionPremiumModelStatusUpdate(bytes32 indexed _name, bool indexed _active);

    modifier onlyOwner(address _address) {
        require(hasRole(DEFAULT_ADMIN_ROLE, _address), "caller has no access to the method");
        _;
    }

    modifier onlyManager(address _address) {
        require(hasRole(MANAGER_ROLE, _address), "caller has no access to the method");
        _;
    }

    modifier onlyTimeLocker(address _address) {
        require(hasRole(TIMELOCKER_ROLE, _address), "caller has no access to the method");
        _;
    }

    modifier validModelName(bytes32 _name) {
        require(address(premiumModelMap[_name]._model) == address(0), "model name already used");
        _;
    }

    modifier validModel(bytes32 _name) {
        require(address(premiumModelMap[_name]._model) != address(0), "model doesn't exist");
        _;
    }

    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(TIMELOCKER_ROLE, msg.sender);
        _setRoleAdmin(TIMELOCKER_ROLE, TIMELOCKER_ROLE);
    }

    function setManager(address _address) external {
        require(_address != address(0) && _address.isContract(), "Invalid manager address");
        grantRole(MANAGER_ROLE, _address);
    }

    function removeManager(address _address) external {
        revokeRole(MANAGER_ROLE, _address);
    }

    function setTimeLocker(address _address) external {
        require(_address != address(0), "Invalid timelocker address");
        grantRole(TIMELOCKER_ROLE, _address);
    }

    function removeTimeLocker(address _address) external {
        revokeRole(TIMELOCKER_ROLE, _address);
    }

    /**
     * @notice Function to add option premium model
     * @param _name premium model identifier.
     * @param _modelAddress Address of the premium contract.
     */
    function addOptionPremiumModel(bytes32 _name, IOddzPremium _modelAddress)
        external
        onlyOwner(msg.sender)
        validModelName(_name)
    {
        require(address(_modelAddress).isContract(), "Invalid premium model address");

        premiumModelMap[_name] = PremiumModel(true, _modelAddress);

        emit NewOptionPremiumModel(_name, _modelAddress);
    }

    /**
     * @notice Function to enable option premium model
     * @param _name premium model identifier.
     */
    function enableOptionPremiumModel(bytes32 _name) external onlyOwner(msg.sender) validModel(_name) {
        PremiumModel storage data = premiumModelMap[_name];
        require(data._active == false, "Premium model is enabled");

        data._active = true;

        emit OptionPremiumModelStatusUpdate(_name, true);
    }

    /**
     * @notice Function to enable option premium model
     * @param _name premium model identifier.
     */
    function disableOptionPremiumModel(bytes32 _name) external onlyTimeLocker(msg.sender) validModel(_name) {
        PremiumModel storage data = premiumModelMap[_name];
        require(data._active == true, "Premium model is disabled");

        data._active = false;

        emit OptionPremiumModelStatusUpdate(_name, false);
    }

    /**
     * @notice Function to get option premium
     * @param _isCallOption True if the option type is CALL, false for PUT.
     * @param _precision current price and strike price precision
     * @param _currentPrice underlying asset current price
     * @param _strikePrice underlying asset strike price
     * @param _expiration Option period in unix timestamp
     * @param _amount Option amount
     * @param _iv implied volatility of the underlying asset
     * @param _model option premium model identifier
     * @return premium option premium amount
     */
    function getPremium(
        bool _isCallOption,
        uint8 _precision,
        uint8 _ivDecimal,
        uint256 _currentPrice,
        uint256 _strikePrice,
        uint256 _expiration,
        uint256 _amount,
        uint256 _iv,
        bytes32 _model
    ) public view override onlyManager(msg.sender) returns (uint256 premium) {
        IOddzPremium.PremiumDetails memory premiumDetails =
            IOddzPremium.PremiumDetails(
                _isCallOption,
                _precision,
                _ivDecimal,
                _currentPrice,
                _strikePrice,
                _expiration,
                _amount,
                _iv
            );
        premium = premiumModelMap[_model]._model.getPremium(premiumDetails);
    }
}
