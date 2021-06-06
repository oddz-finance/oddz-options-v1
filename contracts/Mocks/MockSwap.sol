pragma solidity 0.8.3;

import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "../Swap/ISwapUnderlyingAsset.sol";
import "../Oracle/IOddzPriceOracleManager.sol";

contract MockSwap is ISwapUnderlyingAsset, AccessControl {
    using Address for address;
    using SafeERC20 for ERC20;

    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    IOddzPriceOracleManager public oracle;

    mapping(address => bytes32) public assets;

    uint32 public oddzPrice = 2;

    modifier onlyOwner(address _address) {
        require(hasRole(DEFAULT_ADMIN_ROLE, _address), "Swap Error: caller has no access to the method");
        _;
    }

    modifier onlyManager(address _address) {
        require(hasRole(MANAGER_ROLE, _address), "Swap Error: caller has no access to the method");
        _;
    }

    constructor(
        IOddzPriceOracleManager _oracle,
        bytes32[] memory _names,
        address[] memory _addresses
    ) {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        oracle = _oracle;
        for (uint8 i = 0; i < _names.length; i++) {
            assets[_addresses[i]] = _names[i];
        }
    }

    function setManager(address _address) external {
        require(_address != address(0) && _address.isContract(), "Swap Error: Invalid manager address");
        grantRole(MANAGER_ROLE, _address);
    }

    function removeManager(address _address) external {
        revokeRole(MANAGER_ROLE, _address);
    }

    function setOddzPrice(uint32 _price) public onlyOwner(msg.sender) {
        oddzPrice = _price;
    }

    function addToken(bytes32 _name, address _address) public onlyOwner(msg.sender) {
        require(_name != "", "invalid asset name");
        require(_address != address(0), "invalid address");
        assets[_address] = _name;
    }

    function swapTokensForUA(
        address _fromToken,
        address _toToken,
        address _account,
        uint256 _amountIn,
        uint256 _deadline,
        uint16 _slippage
    ) public override onlyManager(msg.sender) returns (uint256[] memory result) {
        result = new uint256[](2);
        require(assets[_toToken] != "", "Swap Error: asset not added for swap");
        result[0] = _amountIn;
        // 0x4f44445a00000000000000000000000000000000000000000000000000000000 - ODDZ
        // 0x5553440000000000000000000000000000000000000000000000000000000000 - USD

        if (assets[_toToken] == 0x4f44445a00000000000000000000000000000000000000000000000000000000)
            result[1] = _amountIn / oddzPrice;
        else {
            (uint256 cp, uint8 decimal) =
                oracle.getUnderlyingPrice(
                    assets[_toToken],
                    0x5553440000000000000000000000000000000000000000000000000000000000
                );
            result[1] = _amountIn / (cp / 10**decimal);
        }

        ERC20(address(uint160(_toToken))).safeTransfer(_account, result[1]);
        return result;
    }
}
