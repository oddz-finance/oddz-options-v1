// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "./IOddzAsset.sol";
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
        uint32 _pairId
    );

    event Exercise(uint256 indexed _optionId, uint256 _profit, uint256 _settlementFee, ExcerciseType _type);
    event Expire(uint256 indexed _optionId, uint256 _premium);

    struct Option {
        State state;
        address payable holder;
        uint256 strike;
        uint256 amount;
        uint256 lockedAmount;
        uint256 premium;
        uint256 expiration;
        uint32 pairId;
        OptionType optionType;
    }

    /**
     * @notice Buy a new option
     * @param _pair Underlying asset
     * @param _optionModel Option Model e.g. B_S (for BlackScholes)
     * @param _premiumWithSlippage Option premium amount with slippage
     * @param _expiration Option expiration in unix timestamp
     * @param _amount Option amount in wei
     * @param _strike Strike price expressed in wei
     * @param _optionType Option type i.e. Call or Put
     * @return optionId Created option ID
     */
    function buy(
        uint32 _pair,
        bytes32 _optionModel,
        uint256 _premiumWithSlippage,
        uint256 _expiration,
        uint256 _amount,
        uint256 _strike,
        OptionType _optionType
    ) external returns (uint256 optionId);

    /**
     * @notice Exercises an active option
     * @param _optionId Option ID
     */
    function exercise(uint256 _optionId) external;

    /**
     * @notice Exercises an active option in underlying asset
     * @param _optionId Option ID
     * @param _deadline Deadline until which txn does not revert
     */
    function excerciseUA(uint256 _optionId, uint32 _deadline) external;
}
