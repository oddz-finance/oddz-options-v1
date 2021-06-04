pragma solidity 0.8.3;

import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../Swap/ISwapUnderlyingAsset.sol";

contract MockSwap is ISwapUnderlyingAsset, Ownable {
    using SafeERC20 for ERC20;

    uint8 public oddzPrice = 2;
    

    function setOddzPrice (uint8 _price) public onlyOwner{
        oddzPrice = _price;
    }


    function swapTokensForUA(
        address _fromToken,
        address _toToken,
        address _account,
        uint256 _amountIn,
        uint256 _deadline
    ) public override returns (uint256[] memory result) {
        result = new uint256[](2);

        result[0] = _amountIn;
        result[1] = _amountIn / oddzPrice;
        ERC20(address(uint160(_toToken))).safeTransfer(_account, result[1]);

        return result;
    }
}
