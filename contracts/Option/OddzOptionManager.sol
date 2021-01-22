// SPDX-License-Identifier: BSD-4-Clause
pragma solidity ^0.7.0;

import "./IOddzOption.sol";
import "../Oracle/IOddzPriceOracle.sol";
import "../Oracle/IOddzVolatility.sol";
import "../Pool/OddzLiquidityPool.sol";
import "../Libs/BlackScholes.sol";
import "hardhat/console.sol";


contract OddzOptionManager is Ownable, IOddzOption {
    using SafeMath for uint256;

    OddzLiquidityPool public pool;
    IOddzPriceOracle public oracle;
    IOddzVolatility public iv;
    uint256 public createdAt;
    uint256 public maxExpiry = 30 days;
    uint256 public minExpiry = 1 days;
    /**
     * @dev The percentage precision. (100000 = 100%)
     */
    uint256 internal constant PERCENTAGE_PRECISION = 100000;

    constructor(IOddzPriceOracle _oracle, IOddzVolatility _iv, OddzLiquidityPool _pool) {
        pool = _pool;
        oracle = _oracle;
        iv = _iv;
        createdAt = block.timestamp;
    }

    modifier validOptionType(OptionType _optionType) {
        require(
            _optionType == OptionType.Call || _optionType == OptionType.Put,
            "Invalid option type"
        );
        _;
    }

    modifier validExpiration(uint256 _expiration) {
        require(_expiration - block.timestamp <= maxExpiry, "Expiration is too large");
        require(_expiration - block.timestamp >= minExpiry, "Expiration is too small");
        _;
    }

    modifier validStrike(uint32 _underlying, uint256 _strike) {
        uint256 _cp = getCurrentPrice(_underlying);
        require(
            _strike <= getCallOverColl(_underlying, _cp) && _strike >= getPutOverColl(_underlying, _cp),
            "Strike out of Range"
        );
        _;
    }

    function validateOptionAmount(uint256 _amount, uint256 premium) private pure {
        require(_amount >= premium, "Premium is low");
    }

    function getCallOverColl(uint256 _underlying, uint256 _cp) private returns (uint256 oc) {
        // TODO: Fetch Call Over Collateralization using _underlying and _cp
    }

    function getPutOverColl(uint256 _underlying, uint256 _cp) private returns (uint256 oc) {
        // TODO: Fetch Put Over Collateralization using _underlying and _cp
    }

    function getCurrentPrice(uint32 _underlying) private view returns (uint256 currentPrice) {
        currentPrice = oracle.getPrice(_underlying);
        return currentPrice;
    }

    function buy(
        uint32 _underlying,
        uint256 _expiration,
        uint256 _amount,
        uint256 _strike,
        OptionType _optionType
    )
        external
        override
        payable
        validOptionType(_optionType)
        validExpiration(_expiration)
        validStrike(_underlying, _strike)
        returns (uint256 optionId)
    {
        (uint256 optionPremium, uint256 trxFee) = getPremium(
            _underlying,
            _expiration,
            _amount,
            _strike,
            _optionType
        );
        validateOptionAmount(_amount, optionPremium.add(trxFee));
    }

    /**
     * @notice Used for getting the actual options prices
     * @param _expiration Option period in seconds (1 days <= period <= 4 weeks)
     * @param _amount Option amount
     * @param _strike Strike price of the option
     * @return optionPremium Premium to be paid
     * @return trxFee Transaction Fee
     */
    function getPremium(
        uint32 _underlying,
        uint256 _expiration,
        uint256 _amount,
        uint256 _strike,
        OptionType _optionType
    )
        public
        view
        returns (
            uint256 optionPremium,
            uint256 trxFee
        )
    {
        require(
            _optionType == OptionType.Call || _optionType == OptionType.Put,
            "Given option type is not supported"
        );
        (uint256 _iv, uint256 _decimal) = iv.calculateIv(_underlying, _optionType, _expiration, _amount, _strike);
        optionPremium = BlackScholes.getOptionPrice(
            _optionType == OptionType.Call ? true : false,
            _strike,
            getCurrentPrice(_underlying),
            _expiration,
            _underlying,
            _iv,
            0,
            0,
            PERCENTAGE_PRECISION
        );
        trxFee = getTransactionFee(_amount);
    }

    function getTransactionFee(uint256 _amount) view private returns (uint256 trxFee) {}

    function excercise(uint256 _optionId) external override {}
}
