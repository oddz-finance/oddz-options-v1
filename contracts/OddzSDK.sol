// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "./Option/IOddzOption.sol";
import "./Pool/IOddzLiquidityPoolManager.sol";
import "./Integrations/Gasless/BaseRelayRecipient.sol";

contract OddzSDK is BaseRelayRecipient {
    IOddzOption public optionManager;
    IOddzLiquidityPoolManager public pool;
    mapping(address => uint256) public optionCount;
    mapping(address => uint256) public liquidityCount;

    constructor(
        IOddzOption _optionManager,
        IOddzLiquidityPoolManager _pool,
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
        address _pair,
        bytes32 _optionModel,
        uint256 _premiumWithSlippage,
        uint256 _expiration,
        uint256 _amount,
        uint256 _strike,
        IOddzOption.OptionType _optionType,
        address _provider
    ) external returns (uint256 optionId) {
        require(_provider != address(0), "invalid provider address");
        IOddzOption.OptionDetails memory option =
            IOddzOption.OptionDetails(_optionModel, _expiration, _pair, _amount, _strike, _optionType);
        optionId = optionManager.buy(option, _premiumWithSlippage, msgSender());
        optionCount[_provider] += 1;
    }

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
        )
    {
        IOddzOption.OptionDetails memory option =
            IOddzOption.OptionDetails(_optionModel, _expiration, _pair, _amount, _strike, _optionType);
        IOddzOption.PremiumResult memory premiumResult = optionManager.getPremium(option);
        optionPremium = premiumResult.optionPremium;
        txnFee = premiumResult.txnFee;
        iv = premiumResult.iv;
        ivDecimal = premiumResult.ivDecimal;
    }

    function addLiquidity(
        uint256 _amount,
        IOddzLiquidityPool _pool,
        address _provider
    ) external returns (uint256 mint) {
        require(_provider != address(0), "invalid provider address");

        mint = pool.addLiquidity(_pool, _amount, msg.sender);
        liquidityCount[_provider] += 1;
    }
}
