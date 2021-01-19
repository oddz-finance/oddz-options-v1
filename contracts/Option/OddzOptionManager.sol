// SPDX-License-Identifier: BSD-4-Clause
pragma solidity ^0.7.0;

import "./IOddzOption.sol";
import "../Oracle/IOddzOracle.sol";
import "../Pool/OddzLiquidityPool.sol";

contract OddzOptionManager is Ownable, IOddzOption {
    using SafeMath for uint256;

    OddzLiquidityPool public pool;
    IOddzOracle public oracle;
    uint256 public createdAt;

    constructor(IOddzOracle _oracle, OddzLiquidityPool _pool) {
        pool = _pool;
        oracle = _oracle;
        createdAt = block.timestamp;
    }

    function buy(uint256 _expiration,
        uint256 _amount,
        uint256 _strike,
        OptionType _optionType) external override payable returns (uint256 optionId) {}

    function excercise(uint256 _optionId) external override {}
}