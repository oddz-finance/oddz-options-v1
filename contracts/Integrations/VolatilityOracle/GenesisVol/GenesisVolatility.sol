pragma solidity 0.8.3;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Address.sol";

contract GenesisVolatility is AccessControl {

    event AddedVolatilityMapping(
        bytes32 indexed _underlying,
        bytes32 indexed _strike,
        uint256 _expiration,
        uint8 _volPercentage,
        uint256 _volatility 
    );
    using Address for address;

    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");


    uint256 public volatilityPrecision = 2;

    //bytes(underlying,strike,expiry) => volPerc => val
    mapping(bytes32 => mapping(uint8 => uint256)) public volatility;

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

    function setVolatilityPrecision(uint8 _precision) public onlyOwner(msg.sender) {
        volatilityPrecision = _precision;
    }

    function getVolPercentage(uint256 _perc, bool _isNeg) public view returns (uint8 _volPercentage) {
        if (_isNeg) {
            _volPercentage = _getNegPercentage(_perc);
        } else {
            _volPercentage = _getPosPercentage(_perc);
        }
    }

    function _getNegPercentage(uint256 _perc) private view returns (uint8 _volPercentage) {
        if (_perc > 0 && _perc <= 5) {
            _volPercentage = 5;
        } else if (_perc > 5 && _perc <= 10) {
            _volPercentage = 10;
        } else if (_perc > 10 && _perc <= 20) {
            _volPercentage = 20;
        } else if (_perc > 20 && _perc <= 40) {
            _volPercentage = 40;
        } else if (_perc > 40) {
            _volPercentage = 90;
        }
    }

    function _getPosPercentage(uint256 _perc) private view returns (uint8 _volPercentage) {
        if (_perc > 0 && _perc <= 5) {
            _volPercentage = 105;
        } else if (_perc > 5 && _perc <= 10) {
            _volPercentage = 110;
        } else if (_perc > 10 && _perc <= 20) {
            _volPercentage = 120;
        } else if (_perc > 20 && _perc <= 40) {
            _volPercentage = 140;
        } else if (_perc > 40) {
            _volPercentage = 190;
        }
    }

    function addVolatilityMapping(
        bytes32 _underlying,
        bytes32 _strike,
        uint256 _expiration,
        uint8 _volPercentage,
        uint256 _volatility // 96.68 => 9668
    ) public onlyOwner(msg.sender) {
        bytes32 volHash = keccak256(abi.encode(_underlying, _strike, _expiration));
        volatility[volHash][_volPercentage] = _volatility;
        emit AddedVolatilityMapping(_underlying, _strike, _expiration, _volPercentage, _volatility);
    }

    function getIv(
        bytes32 _underlying,
        bytes32 _strike,
        uint256 _expiration,
        uint256 _currentPrice,
        uint256 _strikePrice,
        uint256 _chainlinkVol,
        uint256 _ivDecimal
    ) public view onlyManager(msg.sender) returns (uint256) {
        uint256 perc;
        bytes32 volHash = keccak256(abi.encode(_underlying, _strike, _expiration));
        if (_strikePrice > _currentPrice) {
            perc = (_strikePrice - _currentPrice) * 100 / _currentPrice ;
            uint8 volPercentage = getVolPercentage(perc, false);
           return  volatility[volHash][volPercentage] * (10**_ivDecimal) / (10**volatilityPrecision);
        } else if (_strikePrice < _currentPrice) {
            perc = (_currentPrice - _strikePrice) * 100 / _strikePrice ;
            uint8 volPercentage = getVolPercentage(perc, true);
            return volatility[volHash][volPercentage] * (10**_ivDecimal) / (10**volatilityPrecision);
        }
        return _chainlinkVol;
    }

    
}
