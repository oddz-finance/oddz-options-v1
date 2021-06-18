// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "./IOddzSDK.sol";
import "./Libs/DateTimeLibrary.sol";
import "./Integrations/Gasless/BaseRelayRecipient.sol";
import "./Libs/IERC20Extented.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract OddzSDK is IOddzSDK, BaseRelayRecipient, Ownable {
    using Address for address;
    using SafeERC20 for IERC20;

    IOddzOption public optionManager;
    IERC20 public oddzToken;
    IERC20Extented public usdcToken;
    mapping(bytes32 => bool) public usersForTheMonth;
    // Month -> Amount
    mapping(uint256 => uint256) public totalPremiumCollected;
    mapping(uint256 => uint256) public totalOddzAllocated;
    // Address -> Month -> Amount
    mapping(address => mapping(uint256 => uint256)) public premiumCollected;

    /**
     * @dev minimum premium
     */
    uint256 public override minimumPremium;

    constructor(
        IOddzOption _optionManager,
        address _trustedForwarder,
        IERC20 _oddzToken,
        IERC20Extented _usdcToken
    ) {
        oddzToken = _oddzToken;
        usdcToken = _usdcToken;
        optionManager = _optionManager;
        trustedForwarder = _trustedForwarder;
    }

    function setTrustedForwarder(address forwarderAddress) public onlyOwner {
        require(forwarderAddress != address(0), "SDK: Forwarder Address cannot be 0");
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
    ) public override returns (uint256 optionId) {
        IOddzOption.OptionDetails memory option =
            IOddzOption.OptionDetails(_optionModel, _expiration, _pair, _amount, _strike, _optionType);
        return _buy(option, _premiumWithSlippage, _provider, msg.sender);
    }

    function buyWithGasless(
        address _pair,
        bytes32 _optionModel,
        uint256 _premiumWithSlippage,
        uint256 _expiration,
        uint256 _amount,
        uint256 _strike,
        IOddzOption.OptionType _optionType,
        address _provider
    ) public override returns (uint256 optionId) {
        IOddzOption.OptionDetails memory option =
            IOddzOption.OptionDetails(_optionModel, _expiration, _pair, _amount, _strike, _optionType);
        IOddzOption.PremiumResult memory premiumResult = optionManager.getPremium(option, _msgSender());
        require(
            premiumResult.optionPremium + premiumResult.txnFee > minimumPremium,
            "SDK: premium amount not elgible for gasless"
        );
        return _buy(option, _premiumWithSlippage, _provider, _msgSender());
    }

    function _buy(
        IOddzOption.OptionDetails memory _option,
        uint256 _premiumWithSlippage,
        address _provider,
        address _buyer
    ) private returns (uint256 optionId) {
        require(_provider != address(0), "SDK: invalid provider address");
        optionId = optionManager.buy(_option, _premiumWithSlippage, _buyer);
        (, , , , , uint256 premium, , , ) = optionManager.options(optionId);
        uint256 month = DateTimeLibrary.getMonth(block.timestamp);

        if (!usersForTheMonth[keccak256(abi.encode(_provider, month))]) {
            usersForTheMonth[keccak256(abi.encode(_provider, month))] = true;
            emit OptionProvider(month, _provider);
        }
        premiumCollected[_provider][month] += premium;
        totalPremiumCollected[month] += premium;
    }

    function getPremium(
        address _pair,
        bytes32 _optionModel,
        uint256 _expiration,
        uint256 _amount,
        uint256 _strike,
        IOddzOption.OptionType _optionType
    )
        public
        view
        override
        returns (
            uint256 optionPremium,
            uint256 txnFee,
            uint256 iv,
            uint8 ivDecimal
        )
    {
        IOddzOption.OptionDetails memory option =
            IOddzOption.OptionDetails(_optionModel, _expiration, _pair, _amount, _strike, _optionType);
        IOddzOption.PremiumResult memory premiumResult = optionManager.getPremium(option, msg.sender);
        optionPremium = premiumResult.optionPremium;
        txnFee = premiumResult.txnFee;
        iv = premiumResult.iv;
        ivDecimal = premiumResult.ivDecimal;
    }

    function allocateOddzReward(uint256 _amount) public override {
        totalOddzAllocated[DateTimeLibrary.getMonth(block.timestamp)] += _amount;
        oddzToken.safeTransferFrom(msg.sender, address(this), _amount);
    }

    function distributeReward(address[] memory _providers, uint256 _month) public override {
        require(DateTimeLibrary.getMonth(block.timestamp) > _month, "SDK: Oddz rewards not enabled for the month");
        for (uint256 i = 0; i < _providers.length; i++) {
            bytes32 providerMonth = keccak256(abi.encode(_providers[i], _month));
            // skip reward for ineligible provider
            if (!usersForTheMonth[providerMonth]) continue;
            // set provider as ineligible
            delete usersForTheMonth[providerMonth];
            uint256 amount =
                (totalOddzAllocated[_month] * premiumCollected[_providers[i]][_month]) / totalPremiumCollected[_month];
            if (amount > 0) oddzToken.safeTransfer(_providers[i], amount);
        }
    }

    function setMinimumPremium(uint256 _amount) external onlyOwner {
        uint256 amount = _amount / 10**usdcToken.decimals();
        require(amount >= 1 && amount < 500, "invalid minimum premium");
        minimumPremium = _amount;
    }
}
g