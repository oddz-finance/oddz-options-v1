// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "./IOddzAdministrator.sol";
import "./IOddzSDK.sol";
import "./Staking/IOddzStakingManager.sol";
import "./Swap/IDexManager.sol";
import "./Libs/IERC20Extented.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract OddzAdministrator is IOddzAdministrator, AccessControl {
    using SafeERC20 for IERC20Extented;
    using SafeERC20 for IERC20;

    bytes32 public constant TIMELOCKER_ROLE = keccak256("TIMELOCKER_ROLE");

    IERC20Extented public usdcToken;
    IERC20 public oddzToken;
    IOddzStakingManager public staking;
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

    modifier onlyOwner(address _address) {
        require(hasRole(DEFAULT_ADMIN_ROLE, _address), "caller has no access to the method");
        _;
    }

    modifier onlyTimeLocker(address _address) {
        require(hasRole(TIMELOCKER_ROLE, _address), "caller has no access to the method");
        _;
    }

    constructor(
        IERC20Extented _usdcToken,
        IERC20 _oddzToken,
        IOddzStakingManager _staking,
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
        settlementDistribution = DistributionPercentage({ gasless: 0, maintainer: 10, developer: 10, staker: 80 });

        dexManager = _dexManager;
        minimumAmount = 1000 * 10**usdcToken.decimals();
        // Approve token transfer to staking contract
        oddzToken.safeApprove(address(sdk), type(uint256).max);
        oddzToken.safeApprove(address(staking), type(uint256).max);
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(TIMELOCKER_ROLE, msg.sender);
        _setRoleAdmin(TIMELOCKER_ROLE, TIMELOCKER_ROLE);
    }

    function setTimeLocker(address _address) external {
        require(_address != address(0), "Invalid timelocker address");
        grantRole(TIMELOCKER_ROLE, _address);
    }

    function removeTimeLocker(address _address) external {
        revokeRole(TIMELOCKER_ROLE, _address);
    }

    function changeGaslessFacilitator(address _gaslessFacilitator) external onlyOwner(msg.sender) {
        gaslessFacilitator = _gaslessFacilitator;
    }

    function changeMaintenanceFacilitator(address _maintenanceFacilitator) external onlyOwner(msg.sender) {
        maintenanceFacilitator = _maintenanceFacilitator;
    }

    function updateMinimumAmount(uint256 _minimumAmount) external onlyOwner(msg.sender) {
        require(
            _minimumAmount >= 1000 * 10**usdcToken.decimals() && _minimumAmount <= 1000000 * 10**usdcToken.decimals(),
            "Administrator: invalid deposit amount"
        );
        minimumAmount = _minimumAmount;
    }

    function updateDeadline(uint256 _deadline) external onlyOwner(msg.sender) {
        require(_deadline >= 1 minutes && _deadline <= 30 minutes, "Administrator: invalid deadline");
        deadline = _deadline;
    }

    function updateTxnDistribution(DistributionPercentage memory _txnDP) external onlyTimeLocker(msg.sender) {
        require(
            (_txnDP.developer + _txnDP.gasless + _txnDP.maintainer + _txnDP.staker) == 100,
            "Administrator: invalid txn distribution"
        );
        txnDistribution = _txnDP;
    }

    function updateSettlementDistribution(DistributionPercentage memory _settlementDP)
        external
        onlyTimeLocker(msg.sender)
    {
        require(
            (_settlementDP.developer + _settlementDP.gasless + _settlementDP.maintainer + _settlementDP.staker) == 100,
            "Administrator: invalid settlement distribution"
        );
        settlementDistribution = _settlementDP;
    }

    function deposit(
        uint256 _amount,
        DepositType _depositType,
        uint256 _minAmountsOut
    ) external override {
        require(_amount >= minimumAmount, "Administrator: amount is low for deposit");

        uint256 usdcAmount;
        if (_depositType == DepositType.Transaction)
            usdcAmount = (_amount * (txnDistribution.gasless + txnDistribution.maintainer)) / 100;
        else usdcAmount = (_amount * (settlementDistribution.gasless + settlementDistribution.maintainer)) / 100;

        uint256 oddzAmount = _amount - usdcAmount;
        convertToOddz(oddzAmount, _minAmountsOut);

        if (_depositType == DepositType.Transaction) distrbuteTxn(_amount, oddzAmount);
        else distrbuteSettlement(_amount, oddzAmount);

        emit Deposit(msg.sender, _depositType, _amount);
    }

    function convertToOddz(uint256 _amount, uint256 _minAmountsOut) private {
        address exchange = dexManager.getExchange("ODDZ", "USD");
        // Transfer Funds
        usdcToken.safeTransferFrom(msg.sender, exchange, _amount);
        // block.timestamp + deadline --> deadline from the current block
        dexManager.swap("USD", "ODDZ", exchange, address(this), _amount, _minAmountsOut, block.timestamp + deadline);
    }

    function distrbuteTxn(uint256 _totalAmount, uint256 _oddzShare) private {
        uint256 oddzTransfer = (_totalAmount * oddzToken.balanceOf(address(this))) / _oddzShare;
        if (txnDistribution.staker > 0)
            staking.deposit((oddzTransfer * txnDistribution.staker) / 100, IOddzStakingManager.DepositType.Transaction);
        if (txnDistribution.developer > 0) sdk.allocateOddzReward((oddzTransfer * txnDistribution.developer) / 100);
        if (txnDistribution.gasless > 0)
            usdcToken.safeTransferFrom(msg.sender, gaslessFacilitator, (_totalAmount * txnDistribution.gasless) / 100);
        if (txnDistribution.maintainer > 0)
            usdcToken.safeTransferFrom(
                msg.sender,
                maintenanceFacilitator,
                (_totalAmount * txnDistribution.maintainer) / 100
            );
    }

    function distrbuteSettlement(uint256 _totalAmount, uint256 _oddzShare) private {
        uint256 oddzTransfer = (_totalAmount * oddzToken.balanceOf(address(this))) / _oddzShare;
        if (settlementDistribution.staker > 0)
            staking.deposit(
                (oddzTransfer * settlementDistribution.staker) / 100,
                IOddzStakingManager.DepositType.Settlement
            );
        if (settlementDistribution.developer > 0)
            sdk.allocateOddzReward((oddzTransfer * settlementDistribution.developer) / 100);
        if (settlementDistribution.gasless > 0)
            usdcToken.safeTransferFrom(
                msg.sender,
                gaslessFacilitator,
                (_totalAmount * settlementDistribution.gasless) / 100
            );
        if (settlementDistribution.maintainer > 0)
            usdcToken.safeTransferFrom(
                msg.sender,
                maintenanceFacilitator,
                (_totalAmount * settlementDistribution.maintainer) / 100
            );
    }
}
