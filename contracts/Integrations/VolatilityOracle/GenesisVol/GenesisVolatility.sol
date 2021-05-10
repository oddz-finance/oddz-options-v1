pragma solidity 0.8.3;

contract GenesisVolatility{
    OddzOracleManager oracle;

    uint256 public volatilityPrecision = 2;

    //bytes(underlying,strike,expiry) => volPerc => val
    mapping(bytes32 => mapping(uint8 => uint256)) public volatility;

    constructor(
        OddzOracleManager _oracle
    ){
        oracle = _oracle;
    }

    function setVolatilityPrecision(uint8 _precision) public {
        volatilityPrecision = _precision;
    }

    function getVolPercentage(uint256 _perc, bool _isNeg) public view returns(uint8 _volPerc){
        if (_isNeg){
            _volPerc = _getNegPercentage(_perc);
        }else{
            _volPerc = _getPosPercentage(_perc);
        }
    }

    function _getNegPercentage(uint256 _perc) private view returns (uint256 _volPerc){
            if (_perc > 0 && _perc<=5 ){
                _volPerc = 5;
            }else if (_perc >5 && _perc<=10){
                _volPerc =10;
            }else if(_perc > 10 && _perc<=20){
                _volPerc = 20;
            }else if (_perc >20 && _perc<=40){
                _volPerc =40;
            }else if(_perc > 40 ){
                _volPerc = 90;
            }
    }

    function _getPosPercentage(uint256 _perc) private view returns (uint256 _volPerc){
            if (_perc > 0 && _perc<=5 ){
                _volPerc = 105;
            }else if (_perc >5 && _perc<=10){
                _volPerc =110;
            }else if(_perc > 10 && _perc<=20){
                _volPerc = 120;
            }else if (_perc >20 && _perc<=40){
                _volPerc =140;
            }else if(_perc > 40 ){
                _volPerc = 190;
            }
    }

    function addMapping(
        bytes32 _underlying,
        bytes32 _strike,
        uint8 _expiration,
        uint8 _volPerc,
        uint256 _volatility
    ) public {
        bytes32 volHash = keccak256(abi.encode(_underlying, _strike, _expiration));
        volatility[volHash][_volPerc] = _volatility * volatilityPrecision; 
    }

    function getIv(
        bytes32 _underlying,
        bytes32 _strike,
        uint8 _expiration
    ) public returns (uint256){
       (uint256 price, uint8 decimal) = oracle.getUnderlyingPrice(_underlying, _strike);
       uint256 perc;
       uint256 volPerc;
       bytes32 volHash = keccak256(abi.encode(_underlying, _strike, _expiration));
        if (_strike > price){
            perc = (_strike - price)/ price * 100;
           volPerc= getVolPercentage(perc, false);
        }else if (_strike > price){
            perc = (price - _strike) / _strike * 100;
            volPerc =getVolPercentage(perc, true);
        }

        return volatility[volHash][volPerc];


    }
}