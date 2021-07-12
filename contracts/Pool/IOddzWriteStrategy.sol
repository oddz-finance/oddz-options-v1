// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "./IOddzLiquidityPool.sol";

interface IOddzWriteStrategy {
    function getPools() external view returns (IOddzLiquidityPool[] memory);

    function getShares() external view returns (uint256[] memory);

    function getPoolsLiquidity(address _provider) external view returns (uint256[] memory);

    function addLiquidity(address _provider, uint256[] memory _shares) external;

    function removeLiquidity(address _provider) external;
}
