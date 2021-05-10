pragma solidity 0.8.3;

import "../../../Oracle/OddzPriceOracleManager.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Address.sol";

contract GenesisVolatility is AccessControl {
    using Address for address;

    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    OddzPriceOracleManager oracle;

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

    constructor(OddzPriceOracleManager _oracle) {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        oracle = _oracle;
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

    function getVolPercentage(uint256 _perc, bool _isNeg) public view returns (uint8 _volPerc) {
        if (_isNeg) {
            _volPerc = _getNegPercentage(_perc);
        } else {
            _volPerc = _getPosPercentage(_perc);
        }
    }

    function _getNegPercentage(uint256 _perc) private pure returns (uint8 _volPerc) {
        if (_perc > 0 && _perc <= 5) {
            _volPerc = 5;
        } else if (_perc > 5 && _perc <= 10) {
            _volPerc = 10;
        } else if (_perc > 10 && _perc <= 20) {
            _volPerc = 20;
        } else if (_perc > 20 && _perc <= 40) {
            _volPerc = 40;
        } else if (_perc > 40) {
            _volPerc = 90;
        }
    }

    function _getPosPercentage(uint256 _perc) private pure returns (uint8 _volPerc) {
        if (_perc > 0 && _perc <= 5) {
            _volPerc = 105;
        } else if (_perc > 5 && _perc <= 10) {
            _volPerc = 110;
        } else if (_perc > 10 && _perc <= 20) {
            _volPerc = 120;
        } else if (_perc > 20 && _perc <= 40) {
            _volPerc = 140;
        } else if (_perc > 40) {
            _volPerc = 190;
        }
    }

    function addMapping(
        bytes32 _underlying,
        bytes32 _strike,
        uint8 _expiration,
        uint8 _volPerc,
        uint256 _volatility
    ) public onlyOwner(msg.sender) {
        bytes32 volHash = keccak256(abi.encode(_underlying, _strike, _expiration));
        volatility[volHash][_volPerc] = _volatility * volatilityPrecision;
    }

    function getIv(
        bytes32 _underlying,
        bytes32 _strike,
        uint8 _expiration,
        uint256 _currentPrice,
        uint256 _strikePrice
    ) public view onlyManager(msg.sender) returns (uint256) {
        uint256 perc;
        uint8 volPerc;
        bytes32 volHash = keccak256(abi.encode(_underlying, _strike, _expiration));
        if (_strikePrice > _currentPrice) {
            perc = ((_strikePrice - _currentPrice) / _currentPrice) * 100;
            volPerc = getVolPercentage(perc, false);
        } else if (_strikePrice > _currentPrice) {
            perc = ((_currentPrice - _strikePrice) / _strikePrice) * 100;
            volPerc = getVolPercentage(perc, true);
        }

        return volatility[volHash][volPerc];
    }
}
