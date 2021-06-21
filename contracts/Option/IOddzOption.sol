// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title Oddz Call and Put Options
 * @notice Oddz Options Contract
 */
interface IOddzOption {
    enum State { Active, Exercised, Expired }
    enum OptionType { Call, Put }
    enum ExcerciseType { Cash, Physical }

    event Buy(
        uint256 indexed _optionId,
        address indexed _account,
        bytes32 indexed _model,
        uint256 _transactionFee,
        uint256 _totalFee,
        address _pair
    );
    event Exercise(uint256 indexed _optionId, uint256 _profit, uint256 _settlementFee, ExcerciseType _type);
    event Expire(uint256 indexed _optionId, uint256 _premium);
    event OptionTransfer(
        uint256 indexed _optionId,
        address indexed _oldOwner,
        address indexed _newOwner,
        uint256 _amount,
        uint256 _transferFee
    );
    event OptionTransferEnabled(uint256 indexed _optionId, uint256 indexed _minAmount);

    struct Option {
        State state;
        address holder;
        uint256 strike;
        uint256 amount;
        uint256 lockedAmount;
        uint256 premium;
        uint256 expiration;
        address pair;
        OptionType optionType;
    }

    struct OptionDetails {
        bytes32 _optionModel;
        uint256 _expiration;
        address _pair;
        uint256 _amount;
        uint256 _strike;
        OptionType _optionType;
    }

    struct PremiumResult {
        uint256 optionPremium;
        uint256 txnFee;
        uint256 iv;
        uint8 ivDecimal;
    }

    /**
     * @notice Buy a new option
     * @param _option Options details
     * @param _premiumWithSlippage Options details
     * @param _buyer Address of option buyer
     * @return optionId Created option ID
     */
    function buy(
        OptionDetails memory _option,
        uint256 _premiumWithSlippage,
        address _buyer
    ) external returns (uint256 optionId);

    /**
     * @notice getPremium of option
     * @param _option Options details
     * @param _buyer Address of option buyer
     * @return premiumResult premium Result Created option ID
     */
    function getPremium(OptionDetails memory _option, address _buyer)
        external
        view
        returns (PremiumResult memory premiumResult);

    /**
     * @notice Exercises an active option
     * @param _optionId Option ID
     */
    function exercise(uint256 _optionId) external;

    /**
     * @notice Exercises an active option in underlying asset
     * @param _optionId Option ID
     * @param _deadline Deadline until which txn does not revert
     * @param _slippage Slippage percentage
     */
    function exerciseUA(
        uint256 _optionId,
        uint32 _deadline,
        uint16 _slippage
    ) external;

    /**
     * @notice Returns option details
     * @param _optionId Option ID
     */
    function options(uint256 _optionId)
        external
        returns (
            State state,
            address holder,
            uint256 strike,
            uint256 amount,
            uint256 lockedAmount,
            uint256 premium,
            uint256 expiration,
            address pair,
            OptionType optionType
        );
}
