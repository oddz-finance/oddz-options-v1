// SPDX-License-Identifier: BSD-4-Clause
pragma solidity ^0.7.0;

import "./IOddzVolatility.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract OddzVolatility is Ownable, IOddzVolatility {
    mapping(uint32 => AssetVolatility) internal assetVolatilityMap;
    uint256 public MIN_IV = 3;
    uint256 public MAX_IV = 10;
    uint256 public MIN_DECIMAL = uint256(6);
    uint256 public MAX_DECIMAL = uint256(18);

    function calculateIv(
        uint32 _asset,
        IOddzOption.OptionType _optionType,
        uint256 _expiration,
        uint256 _currentPrice,
        uint256 _strikePrice
    ) external view override returns (uint256 iv, uint256 decimal) {
        // TODO: On chain IV calculation
    }

    modifier validIv(uint256 _iv) {
        require(_iv >= MIN_IV && _iv <= MAX_IV, "Invalid IV");
        _;
    }

    modifier validDecimal(uint256 _decimal) {
        require(_decimal >= MIN_DECIMAL && _decimal <= MAX_DECIMAL, "Invalid Decimal");
        _;
    }

    function setIv(
        uint32 _asset,
        uint256 _iv,
        uint256 _decimal
    ) external onlyOwner validIv(_iv) validDecimal(_decimal) {
        assetVolatilityMap[_asset] = AssetVolatility(_asset, _iv, _decimal);
    }

    function getIv(uint32 _asset) external view returns (uint256 iv, uint256 decimal) {
        AssetVolatility storage av = assetVolatilityMap[_asset];
        iv = av._iv;
        decimal = av._decimal;
    }
}
