// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "./IOddzAdministrator.sol";
import "./IOddzSDK.sol";
import "./Staking/IOddzStaking.sol";
import "./Swap/IDexManager.sol";
import "./Libs/IERC20Extented.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract OddzAdministrator is IOddzAdministrator, Ownable {
    using SafeERC20 for IERC20Extented;
    IERC20Extented public usdcToken;
    IERC20 public oddzToken;

    IOddzStaking public staking;
    IOddzSDK public sdk;
    address public gaslessFacilitator;
    address public maintenanceFacilitator;
    /**
     * @dev deppsit definitions
     */
    uint256 public minimumAmount;
    /**
     * @dev distrbution percentage
     */
    struct DistributionPercentage {
        uint8 gasless;
        uint8 maintainer;
        uint8 developer;
        uint8 staker;
    }

    DistributionPercentage public txnDistribution;
    DistributionPercentage public settlementDistribution;

    /**
     * @dev DEX manager
     */
    IDexManager public dexManager;
    uint256 public deadline = 1 minutes;

    constructor(
        IERC20Extented _usdcToken,
        IERC20 _oddzToken,
        IOddzStaking _staking,
        IOddzSDK _sdk,
        address _gaslessFacilitator,
        address _maintenanceFacilitator,
        IDexManager _dexManager
    ) {
        usdcToken = _usdcToken;
        oddzToken = _oddzToken;
        staking = _staking;
        sdk = _sdk;
        gaslessFacilitator = _gaslessFacilitator;
        maintenanceFacilitator = _maintenanceFacilitator;
        txnDistribution = DistributionPercentage({ gasless: 40, maintainer: 0, developer: 20, staker: 40 });
        settlementDistribution = DistributionPercentage({ gasless: 0, maintainer: 40, developer: 0, staker: 60 });

        dexManager = _dexManager;
        minimumAmount = 1000 * 10**usdcToken.decimals();
        // Approve token transfer to staking contract
        oddzToken.approve(address(sdk), type(uint256).max);
        oddzToken.approve(address(staking), type(uint256).max);
    }

    function changeGaslessFacilitator(address _gaslessFacilitator) external onlyOwner {
        gaslessFacilitator = _gaslessFacilitator;
    }

    function changeMaintenanceFacilitator(address _maintenanceFacilitator) external onlyOwner {
        maintenanceFacilitator = _maintenanceFacilitator;
    }

    function updateMinimumAmount(uint256 _minimumAmount) external onlyOwner {
        require(
            _minimumAmount >= 1000 * 10**usdcToken.decimals() && _minimumAmount <= 1000000 * 10**usdcToken.decimals(),
            "Administrator: invalid deposit frequency"
        );
        minimumAmount = _minimumAmount;
    }

    function updateDeadline(uint256 _deadline) external onlyOwner {
        require(deadline >= 1 minutes && deadline <= 30 minutes, "Administrator: invalid deadline");
        deadline = _deadline;
    }

    function updateTxnDistribution(DistributionPercentage memory _txnDP) external onlyOwner {
        require(
            (_txnDP.developer + _txnDP.gasless + _txnDP.maintainer + _txnDP.staker) == 100,
            "Administrator: invalid txn distribution"
        );
        txnDistribution = _txnDP;
    }

    function updateSettlementDistribution(DistributionPercentage memory _settlementDP) external onlyOwner {
        require(
            (_settlementDP.developer + _settlementDP.gasless + _settlementDP.maintainer + _settlementDP.staker) == 100,
            "Administrator: invalid settlement distribution"
        );
        settlementDistribution = _settlementDP;
    }

    function deposit(
        uint256 _amount,
        DepositType _depositType,
        uint8 _slippage
    ) external override {
        require(_amount >= minimumAmount, "Administrator: amount is low for deposit");

        uint256 usdcAmount;
        if (_depositType == DepositType.Transaction)
            usdcAmount = (_amount * (txnDistribution.gasless + txnDistribution.maintainer)) / 100;
        else usdcAmount = (_amount * (settlementDistribution.gasless + settlementDistribution.maintainer)) / 100;

        uint256 oddzAmount = _amount - usdcAmount;
        convertToOddz(oddzAmount, _slippage);

        if (_depositType == DepositType.Transaction) distrbuteTxn(usdcAmount, oddzAmount);
        else distrbuteSettlement(usdcAmount, oddzAmount);

        emit Deposit(msg.sender, _depositType, _amount);
    }

    function convertToOddz(uint256 _amount, uint8 _slippage) private {
        address exchange = dexManager.getExchange("ODDZ", "USDC");
        // Transfer Funds
        usdcToken.safeTransferFrom(msg.sender, exchange, _amount);
        // block.timestamp + deadline --> deadline from the current block
        dexManager.swap("USDC", "ODDZ", exchange, address(this), _amount, block.timestamp + deadline, _slippage);
    }

    function distrbuteTxn(uint256 _usdcAmount, uint256 _oddzAmount) private {
        if (txnDistribution.staker > 0)
            staking.deposit((_oddzAmount * txnDistribution.staker) / 100, IOddzStaking.DepositType.Transaction);
        if (txnDistribution.developer > 0) sdk.allocateOddzReward((_oddzAmount * txnDistribution.developer) / 100);
        if (txnDistribution.gasless > 0)
            usdcToken.safeTransferFrom(msg.sender, gaslessFacilitator, (_usdcAmount * txnDistribution.gasless) / 100);
        if (txnDistribution.maintainer > 0)
            usdcToken.safeTransferFrom(
                msg.sender,
                maintenanceFacilitator,
                (_usdcAmount * txnDistribution.maintainer) / 100
            );
    }

    function distrbuteSettlement(uint256 _usdcAmount, uint256 _oddzAmount) private {
        if (settlementDistribution.staker > 0 && oddzToken.balanceOf(address(this)) > 0)
            staking.deposit((_oddzAmount * settlementDistribution.staker) / 100, IOddzStaking.DepositType.Settlement);
        if (settlementDistribution.developer > 0)
            sdk.allocateOddzReward((_oddzAmount * settlementDistribution.developer) / 100);
        if (settlementDistribution.gasless > 0)
            usdcToken.safeTransferFrom(
                msg.sender,
                gaslessFacilitator,
                (_usdcAmount * settlementDistribution.gasless) / 100
            );
        if (settlementDistribution.maintainer > 0)
            usdcToken.safeTransferFrom(
                msg.sender,
                maintenanceFacilitator,
                (_usdcAmount * settlementDistribution.maintainer) / 100
            );
    }
}
