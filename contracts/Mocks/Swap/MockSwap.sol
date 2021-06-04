pragma solidity 0.8.3;

import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./IMockSwapUnderlyingAsset.sol";

contract MockSwap is IMockSwapUnderlyingAsset, Ownable {
    using SafeERC20 for ERC20;

    uint32 public oddzPrice = 2;
    uint32 public ethPrice = 2620;
    uint32 public btcPrice = 36800;

    function setOddzPrice(uint32 _price) public onlyOwner {
        oddzPrice = _price;
    }

    function setEthPrice(uint32 _price) public onlyOwner {
        ethPrice = _price;
    }

    function setBtcPrice(uint32 _price) public onlyOwner {
        btcPrice = _price;
    }

    function swapTokensForUA(
        bytes32 _toTokenName,
        address _fromToken,
        address _toToken,
        address _account,
        uint256 _amountIn,
        uint256 _deadline,
        uint16 _slippage
    ) public override returns (uint256[] memory result) {
        result = new uint256[](2);

        result[0] = _amountIn;
        if (_toTokenName == stringToBytes32("ODDZ")) {
            result[1] = _amountIn / oddzPrice;
        } else if (_toTokenName == stringToBytes32("ETH")) {
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
