// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;
import "./IOddzOption.sol";


interface IOddzSdk{

    event BuySdk(
        uint256 indexed _optionId,
        address indexed _account,
        bytes32 indexed _model,
        address _provider
    );

    event AddLiquiditySdk(
                        address indexed _account, 
                        address indexed _provider,
                        uint256 _amount, 
                        uint256 _writeAmount
                        );

    /**
     * @notice Buy a new option
     * @param _pair Underlying asset
     * @param _optionModel Option Model e.g. B_S (for BlackScholes)
     * @param _premiumWithSlippage Option premium amount with slippage
     * @param _expiration Option expiration in unix timestamp
     * @param _amount Option amount in wei
     * @param _strike Strike price expressed in wei
     * @param _optionType Option type i.e. Call or Put
     * @param _provider address of the buyer
     * @return optionId Created option ID
     */
    function buySdk(
        uint32 _pair,
        bytes32 _optionModel,
        uint256 _premiumWithSlippage,
        uint256 _expiration,
        uint256 _amount,
        uint256 _strike,
        IOddzOption.OptionType _optionType,
        address _provider
    ) external returns (uint256 optionId);

    /**
     * @notice A provider supplies USD pegged stablecoin to the pool and receives oUSD tokens
     * @param _amount Amount of USD to receive
     * @param _provider address of the provider
     * @return mint Amount of tokens minted
     */
    function addLiquiditySdk(uint256 _amount,address _provider) external returns (uint256 mint);


    
   

}