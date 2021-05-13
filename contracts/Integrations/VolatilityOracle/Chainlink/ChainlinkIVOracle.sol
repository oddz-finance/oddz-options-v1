// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;
import "../../../Oracle/IOddzVolatilityOracle.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@chainlink/contracts/src/v0.7/interfaces/AggregatorV3Interface.sol";
contract ChainlinkIVOracle is AccessControl, IOddzVolatilityOracle {
    using Address for address;

    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    uint256 public delayInSeconds = 30 * 60;
    mapping(uint8 => bool) public allowedPeriods;
    mapping(uint256 => uint8) public ivPeriodMap;

    mapping(bytes32 => address) public addressMap;

    //bytes(underlying,strike,expiry) => volPerc => val
    mapping(bytes32 => mapping(uint8 => uint256)) public volatility;
    uint256 public volatilityPrecision = 2;

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
        uint256 _expiration,
        uint256 _currentPrice,
        uint256 _strikePrice
    ) public view override onlyManager(msg.sender) returns (uint256 iv, uint8 decimals) {
        uint256 _expirationDay = (_expiration / 1 days);
        require(ivPeriodMap[_expirationDay] != 0, "Chainlink IV: Invalid expiration");

        bytes32 agHash = keccak256(abi.encode(_underlying, _strike, ivPeriodMap[_expirationDay]));
        address aggregator = addressMap[agHash];
        require(aggregator != address(0), "No aggregator");
        (, int256 answer, , uint256 updatedAt, ) = AggregatorV3Interface(aggregator).latestRoundData();

        iv = uint256(answer);
        require(updatedAt > (uint256(block.timestamp) - delayInSeconds), "Chain link IV Out Of Sync");
        decimals = AggregatorV3Interface(aggregator).decimals();
        uint256 _iv = _getIv(_underlying, _strike, _expirationDay, _currentPrice, _strikePrice, iv, decimals);
        // _iv can be 0 when there are no entries to mapping
        if (_iv > 0) iv = _iv;

        // converting iv from percentage to value
        iv = iv / 100;
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

    function setDelay(uint256 _delay) public onlyOwner(msg.sender) {
        delayInSeconds = _delay;
    }
    /**
     * @notice Function to set iv precision decimals
     * @param _precision volatility precision
     */
    function setVolatilityPrecision(uint8 _precision) public onlyOwner(msg.sender) {
        volatilityPrecision = _precision;
    }

    /**
     * @notice Function to get valid percentage difference in strike and current price
     * @param _perc Calculated percentage difference
     * @param _isNeg if the percentage is negative
     * @return _volPercentage valid percentage difference (90, 40, 20, 10)
     */
    function _getVolPercentage(uint256 _perc, bool _isNeg) private pure returns (uint8 _volPercentage) {
        if (_isNeg) _volPercentage = _getNegPercentage(_perc);
        else _volPercentage = _getPosPercentage(_perc);
    }

    /**
     * @notice Function to get valid negative percentage difference in strike and current price
     * @param _perc Calculated negative percentage difference
     * @return _volPercentage valid negative percentage difference (90, 40, 20, 10)
     */
    function _getNegPercentage(uint256 _perc) private pure returns (uint8 _volPercentage) {
        if (_perc > 0 && _perc <= 5) _volPercentage = 5;
        else if (_perc > 5 && _perc <= 10) _volPercentage = 10;
        else if (_perc > 10 && _perc <= 20) _volPercentage = 20;
        else if (_perc > 20 && _perc <= 40) _volPercentage = 40;
        else if (_perc > 40) _volPercentage = 90;
    }

    /**
     * @notice Function to get valid posituve percentage difference in strike and current price
     * @param _perc Calculated positive percentage difference
     * @return _volPercentage valid positive percentage difference (90, 40, 20, 10)
     */
    function _getPosPercentage(uint256 _perc) private pure returns (uint8 _volPercentage) {
        if (_perc > 0 && _perc <= 5) _volPercentage = 105;
        else if (_perc > 5 && _perc <= 10) _volPercentage = 110;
        else if (_perc > 10 && _perc <= 20) _volPercentage = 120;
        else if (_perc > 20 && _perc <= 40) _volPercentage = 140;
        else if (_perc > 40) _volPercentage = 190;
    }

    /**
     * @notice Function to add volatility for an option based on volatility percentage
     * @param _underlying Underlying asset name
     * @param _strike Strike aseet name
     * @param _expiration expiration of option
     * @param _volPercentage Volatility percentage difference (90, 40, 20, 10)
     * @param _volatility Volatility value
     */
    function addVolatilityMapping(
        bytes32 _underlying,
        bytes32 _strike,
        uint256 _expiration,
        uint8 _volPercentage,
        uint256 _volatility // 96.68 => 9668
    ) public onlyOwner(msg.sender) {
        volatility[keccak256(abi.encode(_underlying, _strike, _expiration))][_volPercentage] = _volatility;
    }

    function _getIv(
        bytes32 _underlying,
        bytes32 _strike,
        uint256 _expiration,
        uint256 _currentPrice,
        uint256 _strikePrice,
        uint256 _chainlinkVol,
        uint256 _ivDecimal
    ) private view returns (uint256) {
        if (_currentPrice == _strikePrice) return _chainlinkVol;
        uint8 volPercentage;
        if (_strikePrice > _currentPrice)
            volPercentage = _getVolPercentage(((_strikePrice - _currentPrice) * 100) / _currentPrice, false);
        else if (_strikePrice < _currentPrice)
            volPercentage = _getVolPercentage(((_currentPrice - _strikePrice) * 100) / _strikePrice, true);
        return
            (volatility[keccak256(abi.encode(_underlying, _strike, _expiration))][volPercentage] * (10**_ivDecimal)) /
            (10**volatilityPrecision);
    }
}
