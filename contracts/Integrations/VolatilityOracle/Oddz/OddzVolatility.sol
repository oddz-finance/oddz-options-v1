// SPDX-License-Identifier: BSD-4-Clause
pragma solidity ^0.8.0;

import "../../../Oracle/IOddzVolatilityOracle.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract OddzVolatility is Ownable, IOddzVolatilityOracle {
    struct AssetVolatility {
        bytes32 asset;
        bytes32 strike;
        uint8 ivDecimal;
        uint256 iv;
        uint256 timestamp;
    }

    mapping(bytes32 => mapping(bytes32 => AssetVolatility)) internal assetVolatilityMap;

    uint256 public MIN_IV = 10000;
    uint256 public MAX_IV = 1e8;
    uint256 public MIN_DECIMAL = uint256(5);
    uint256 public MAX_DECIMAL = uint256(8);

    modifier validIv(uint256 _iv) {
        require(_iv >= MIN_IV && _iv <= MAX_IV, "Invalid IV");
        _;
    }

    modifier validDecimal(uint256 _decimal) {
        require(_decimal >= MIN_DECIMAL && _decimal <= MAX_DECIMAL, "Invalid Decimal");
        _;
    }

    function getIv(
        bytes32 _asset,
        bytes32 _strike,
        bool _isCallOption,
        uint256 _expiration,
        uint256 _currentPrice,
        uint256 _strikePrice
    ) external view override returns (uint256 iv, uint8 decimals) {
        AssetVolatility storage av = assetVolatilityMap[_asset][_strike];
        iv = av.iv;
        decimals = av.ivDecimal;
    }

    function setPairContract(
        bytes32 _underlying,
        bytes32 _strike,
        address _aggregator,
        uint8 _aggregatorPeriod
    ) public override {}

    function setIv(
        bytes32 _asset,
        bytes32 _strike,
        uint256 _iv,
        uint8 _decimal
    ) external onlyOwner validIv(_iv) validDecimal(_decimal) {
        assetVolatilityMap[_asset][_strike] = AssetVolatility(_asset, _strike, _decimal, _iv, block.timestamp);
    }
}
