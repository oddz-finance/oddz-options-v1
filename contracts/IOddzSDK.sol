// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "./Option/IOddzOption.sol";

interface IOddzSDK {
    event OptionProvider(uint256 indexed _month, address indexed _provider);

    function buy(
        address _pair,
        bytes32 _optionModel,
        uint256 _premiumWithSlippage,
        uint256 _expiration,
        uint256 _amount,
        uint256 _strike,
        IOddzOption.OptionType _optionType,
        address _provider
    ) external returns (uint256 optionId);

    function buyWithGasless(
        address _pair,
        bytes32 _optionModel,
        uint256 _premiumWithSlippage,
        uint256 _expiration,
        uint256 _amount,
        uint256 _strike,
        IOddzOption.OptionType _optionType,
        address _provider
    ) external returns (uint256 optionId);

    function getPremium(
        address _pair,
        bytes32 _optionModel,
        uint256 _expiration,
        uint256 _amount,
        uint256 _strike,
        IOddzOption.OptionType _optionType
    )
        external
        view
        returns (
            uint256 optionPremium,
            uint256 txnFee,
            uint256 iv,
            uint8 ivDecimal
        );

    function allocateOddzReward(uint256 _amount) external;

    function distributeReward(address[] memory _providers, uint256 _month) external;

    function minimumPremium() external returns (uint256);
}
