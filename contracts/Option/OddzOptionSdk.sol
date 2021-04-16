// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "./OddzOptionManager.sol";
import "../Pool/OddzLiquidityPool.sol";
import "./IOddzSdk.sol";
import "../Integrations/Gasless/BaseRelayRecipient.sol";

contract OddzOptionSdk is IOddzSdk, BaseRelayRecipient {
    OddzOptionManager public optionManager;
    OddzLiquidityPool public pool;
    mapping(address => uint256) public optionCount;

    constructor(
        OddzOptionManager _optionManager,
        OddzLiquidityPool _pool,
        address _trustedForwarder
    ) {
        optionManager = _optionManager;
        pool = _pool;
        trustedForwarder = _trustedForwarder;
    }

    function setTrustedForwarder(address forwarderAddress) public {
        require(forwarderAddress != address(0), "Forwarder Address cannot be 0");
        trustedForwarder = forwarderAddress;
    }

    function versionRecipient() external view virtual override returns (string memory) {
        return "1";
    }

    function msgSender() internal view virtual override returns (address ret) {
        if (msg.data.length >= 24 && isTrustedForwarder(msg.sender)) {
            // At this point we know that the sender is a trusted forwarder,
            // so we trust that the last bytes of msg.data are the verified sender address.
            // extract sender address from the end of msg.data
            assembly {
                ret := shr(96, calldataload(sub(calldatasize(), 20)))
            }
        } else {
            return msg.sender;
        }
    }

    function buy(
        uint32 _pair,
        bytes32 _optionModel,
        uint256 _premiumWithSlippage,
        uint256 _expiration,
        uint256 _amount,
        uint256 _strike,
        IOddzOption.OptionType _optionType,
        address _provider
    ) public override returns (uint256 optionId) {
        IOddzOption.OptionDetails memory option =
            IOddzOption.OptionDetails(_pair, _optionModel, _expiration, _amount, _strike, _optionType);
        optionId = optionManager.buy(option, _premiumWithSlippage, msgSender());

        emit BuySdk(optionId, msgSender(), _optionModel, _provider);
    }

    function getPremium(
        uint32 _pair,
        bytes32 _optionModel,
        uint256 _expiration,
        uint256 _amount,
        uint256 _strike,
        IOddzOption.OptionType _optionType
    )
        public
        view
        returns (
            uint256 optionPremium,
            uint256 txnFee,
            uint256 iv,
            uint8 ivDecimal
        )
    {
        IOddzOption.OptionDetails memory option =
            IOddzOption.OptionDetails(_pair, _optionModel, _expiration, _amount, _strike, _optionType);
        IOddzOption.PremiumResult memory premiumResult = optionManager.getPremium(option);
        optionPremium = premiumResult.optionPremium;
        txnFee = premiumResult.txnFee;
        iv = premiumResult.iv;
        ivDecimal = premiumResult.ivDecimal;
    }

    function addLiquidity(uint256 _amount, address _provider) external override returns (uint256 mint) {
        mint = pool.addLiquidity(_amount, msg.sender);

        emit AddLiquiditySdk(msg.sender, _provider, _amount, mint);
    }
}
