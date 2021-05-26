// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "../../../Oracle/IOddzVolatilityOracle.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract OddzVolatility is Ownable, IOddzVolatilityOracle {
    uint256 public delayInSeconds = 30 * 60;
    uint256 public lastUpdatedAt;
    mapping(uint256 => bool) public allowedPeriods;
    mapping(uint256 => uint256) public ivPeriodMap;

    mapping(bytes32 => address) public addressMap;

    //bytes(underlying,strike,expiry) => volPerc => val
    mapping(bytes32 => mapping(uint8 => uint256)) public volatility;
    mapping(bytes32 => uint256) public defaultIvMap;
    uint8 public volatilityPrecision = 2;

    modifier allowedPeriod(uint256 _aggregatorPeriod) {
        require(allowedPeriods[_aggregatorPeriod] == true, "Chainlink IV: Invalid aggregator period");
        _;
    }

    constructor() {
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
    function mapDaysToIVPeriod(uint256 _day, uint8 _ivAgg) public onlyOwner allowedPeriod(_ivAgg) {
        ivPeriodMap[_day] = _ivAgg;
    }

    /**
     @notice Add/update allowed IV period map
     @param _ivAgg IV aggregation period
     */
    function addAllowedPeriods(uint8 _ivAgg) public onlyOwner {
        allowedPeriods[_ivAgg] = true;
    }

    function getIv(
        bytes32 _underlying,
        bytes32 _strike,
        uint256 _expiration,
        uint256 _currentPrice,
        uint256 _strikePrice
    ) public view override returns (uint256 iv, uint8 decimals) {
        require((lastUpdatedAt + delayInSeconds) > block.timestamp, "Oddz IV: out of sync");
        // update _expiration to next day if spillover seconds in a day
        if ((_expiration % 1 days) > 0) _expiration = _expiration + 1 days;
        iv = _getIv(_underlying, _strike, ivPeriodMap[_expiration / 1 days], _currentPrice, _strikePrice);
        if (iv == 0) iv = defaultIvMap[keccak256(abi.encode(_underlying, _strike))];
        require(iv > 0, "Oddz IV: invalid");
        decimals = volatilityPrecision;
    }

    function setPairContract(
        bytes32 _underlying,
        bytes32 _strike,
        address _aggregator,
        uint8 _aggregatorPeriod
    ) public override {}

    function setDelay(uint256 _delay) public onlyOwner {
        delayInSeconds = _delay;
    }

    /**
     * @notice Function to set iv precision decimals
     * @param _precision volatility precision
     */
    function setVolatilityPrecision(uint8 _precision) public onlyOwner {
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
     * @param _expiration expiration period in days
     * @param _volPercentage Volatility percentage difference (90, 40, 20, 10)
     * @param _volatility Volatility value
     */
    function addVolatilityMapping(
        bytes32 _underlying,
        bytes32 _strike,
        uint256 _expiration,
        uint8 _volPercentage,
        uint256 _volatility // 96.68 => 9668
    ) public onlyOwner allowedPeriod(_expiration) {
        volatility[keccak256(abi.encode(_underlying, _strike, _expiration))][_volPercentage] = _volatility;
        lastUpdatedAt = block.timestamp;
    }

    /**
     * @notice Function to set default volatility for an asset pair
     * @param _underlying Underlying asset name
     * @param _strike Strike aseet name
     * @param _volatility Volatility value
     * Note: IV decimal is defaulted to volatilityPrecision
     */
    function setDefaultIv(
        bytes32 _underlying,
        bytes32 _strike,
        uint256 _volatility // 96.68 => 9668
    ) external onlyOwner {
        defaultIvMap[keccak256(abi.encode(_underlying, _strike))] = _volatility;
    }

    function _getIv(
        bytes32 _underlying,
        bytes32 _strike,
        uint256 _expiration,
        uint256 _currentPrice,
        uint256 _strikePrice
    ) private view returns (uint256) {
        uint8 volPercentage;
        if (_strikePrice >= _currentPrice)
            volPercentage = _getVolPercentage(((_strikePrice - _currentPrice) * 100) / _currentPrice, false);
        else volPercentage = _getVolPercentage(((_currentPrice - _strikePrice) * 100) / _strikePrice, true);

        return volatility[keccak256(abi.encode(_underlying, _strike, _expiration))][volPercentage];
    }
}
