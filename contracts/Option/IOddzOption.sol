// SPDX-License-Identifier: BSD-4-Clause
pragma solidity ^0.7.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

/**
 * @title Oddz Call and Put Options
 * @notice Oddz Options Contract
 */
interface IOddzOption {
    enum State {Active, Exercised, Expired}
    enum OptionType {Put, Call}
    enum ExcerciseType {Cash, Physical}

    event Buy(
        uint256 indexed _optionId,
        address indexed _account,
        uint256 _settlementFee,
        uint256 _totalFee,
        uint32 _underlying
    );

    event Exercise(uint256 indexed _optionId, uint256 _profit, ExcerciseType _type);
    event Expire(uint256 indexed _optionId, uint256 _premium);

    struct Option {
        State state;
        address payable holder;
        uint256 strike;
        uint256 amount;
        uint256 lockedAmount;
        uint256 premium;
        uint256 expiration;
        uint32 underlying;
        OptionType optionType;
    }

    /**
     * @notice Buy a new option
     * @param _underlying Underlying asset
     * @param _expiration Option expiration in unix timestamp
     * @param _amount Option amount in wei
     * @param _strike Strike price expressed in wei
     * @param _optionType Option type i.e. Call or Put
     * @return optionId Created option ID
     */
    function buy(
        uint32 _underlying,
        uint256 _expiration,
        uint256 _amount,
        uint256 _strike,
        OptionType _optionType) external payable returns (uint256 optionId);

    
    /**
     * @notice Exercises an active option
     * @param _optionId Option ID
     */
    function excercise(uint256 _optionId) external;

    /**
     * @notice Exercises an active option in underlying asset
     * @param _optionId Option ID
     * @param _uaAddress Underlying asset address
     */
    function excerciseUA(uint256 _optionId, address payable _uaAddress) external;
}