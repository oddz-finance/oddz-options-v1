pragma solidity 0.8.3;

import "../Swap/ISwapUnderlyingAsset.sol";

contract MockOddzDex is ISwapUnderlyingAsset {
    function swapTokensForUA(
        address _fromToken,
        address _toToken,
        address payable _account,
        uint256 _amountIn,
        uint256 _deadline
    ) public pure override returns (uint256[] memory result) {
        uint256[] memory result = new uint256[](2);
        uint256 counter = 0;

        for (uint256 i = 0; i < 2; i++) {
            result[counter] = 100;
            counter++;
        }
        return result;
    }
}
