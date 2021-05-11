// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;


import "../Integrations/VolatilityOracle/GenesisVol/GenesisVolatility.sol";
contract MockIv {
    GenesisVolatility volatility;

    constructor(GenesisVolatility _volatility){
        volatility = _volatility;
    }

    function getIv(
        bytes32 _underlying,
        bytes32 _strike,
        uint256 _expiration,
        uint256 _currentPrice,
        uint256 _strikePrice
    ) public view  returns (uint256, uint8) {
        uint256 iv = 180000;
        uint8 decimals = 5;
       iv = volatility.getIv( _underlying, _strike, _expiration, _currentPrice, _strikePrice, iv, decimals);

       return (iv,decimals);
    }

}
