pragma solidity 0.8.3;

import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../Swap/ISwapUnderlyingAsset.sol";

contract MockSwap is ISwapUnderlyingAsset, Ownable {
    using SafeERC20 for ERC20;

    mapping(address => bytes32) assets;

    uint32 public oddzPrice = 2;
    uint32 public ethPrice = 2620;
    uint32 public btcPrice = 36800;

    constructor(bytes32[] memory _names, address[] memory _addresses) {
        for (uint8 i = 0; i < _names.length; i++) {
            assets[_addresses[i]] = _names[i];
        }
    }

    function setOddzPrice(uint32 _price) public onlyOwner {
        oddzPrice = _price;
    }

    function setEthPrice(uint32 _price) public onlyOwner {
        ethPrice = _price;
    }

    function setBtcPrice(uint32 _price) public onlyOwner {
        btcPrice = _price;
    }

    function addToken(bytes32 _name, address _address) public onlyOwner {
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
    ) public override returns (uint256[] memory result) {
        result = new uint256[](2);
        require(assets[_toToken] != "", "Swap: asset not added for swap");
        result[0] = _amountIn;
        if (assets[_toToken] == stringToBytes32("ODDZ")) {
            result[1] = _amountIn / oddzPrice;
        } else if (assets[_toToken] == stringToBytes32("ETH")) {
            result[1] = _amountIn / ethPrice;
        } else {
            result[1] = _amountIn / btcPrice;
        }
        ERC20(address(uint160(_toToken))).safeTransfer(_account, result[1]);
        return result;
    }

    function stringToBytes32(string memory source) public pure returns (bytes32 result) {
        bytes memory tempEmptyStringTest = bytes(source);
        if (tempEmptyStringTest.length == 0) {
            return 0x0;
        }

        assembly {
            result := mload(add(source, 32))
        }
    }
}
