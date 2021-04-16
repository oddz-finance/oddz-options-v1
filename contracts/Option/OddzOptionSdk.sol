// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "./OddzOptionManager.sol";
import "../Pool/OddzLiquidityPool.sol";
import "./IOddzSdk.sol";

contract OddzOptionSdk is IOddzSdk {

    OddzOptionManager public optionManager;
    OddzLiquidityPool public pool;
    mapping(address => uint256) public optionCount;

    constructor(
        OddzOptionManager _optionManager,
        OddzLiquidityPool _pool
    ){
        optionManager = _optionManager;
        pool = _pool;
    }

    function buySdk(
        uint32 _pair,
        bytes32 _optionModel,
        uint256 _premiumWithSlippage,
        uint256 _expiration,
        uint256 _amount,
        uint256 _strike,
        IOddzOption.OptionType _optionType,
        address _provider
    ) public override returns (uint256 optionId){

        IOddzOption.OptionDetails memory option = IOddzOption.OptionDetails(
                                                                        _pair,
                                                                        _optionModel,
                                                                        _premiumWithSlippage,
                                                                        _expiration,
                                                                        _amount,
                                                                        _strike,
                                                                        _optionType

                                                                     );
       optionId =  optionManager.buy(
                                option,
                                msg.sender
                            );

        emit BuySdk(
            optionId,
            msg.sender,
            _optionModel,
            _provider
        );                    
    }

    function getPremiumSdk(
        uint32 _pair,
        bytes32 _optionModel,
        uint256 _premiumWithSlippage,
        uint256 _expiration,
        uint256 _amount,
        uint256 _strike,
        IOddzOption.OptionType _optionType
        
    ) public returns (
            uint256 optionPremium,
            uint256 txnFee,
            uint256 iv,
            uint8 ivDecimal
        ){
             IOddzOption.OptionDetails memory option = IOddzOption.OptionDetails(
                                                                        _pair,
                                                                        _optionModel,
                                                                        _premiumWithSlippage,
                                                                        _expiration,
                                                                        _amount,
                                                                        _strike,
                                                                        _optionType

                                                                     );
            ( optionPremium,  txnFee,  iv,  ivDecimal) =
            optionManager.getPremium(
                                option
                            );
        }

       function addLiquiditySdk(uint256 _amount, address _provider) external override returns (uint256 mint) {
           mint = pool.addLiquidity(
                                        _amount,
                                        msg.sender
                                        );

            emit AddLiquiditySdk(msg.sender, _provider,  _amount, mint);                            
       }
}