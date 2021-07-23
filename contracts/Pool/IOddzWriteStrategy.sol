// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "./IOddzLiquidityPool.sol";

interface IOddzWriteStrategy {
    function getPools() external view returns (IOddzLiquidityPool[] memory);

    function getShares() external view returns (uint256[] memory);

    function userLiquidity(address _provider) external view returns (uint256);

    function addLiquidity(address _provider, uint256 _liquidity) external;

    function removeLiquidity(address _provider) external;
}
