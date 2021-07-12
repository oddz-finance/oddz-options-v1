// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "./IOddzWriteStrategy.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract OddzWriteStrategy is IOddzWriteStrategy, Ownable {
    IOddzLiquidityPool[] public pools;
    uint256[] public shares;
    // user => liquidity in pools
    mapping(address => uint256[]) public poolsLiquidity;

    constructor(IOddzLiquidityPool[] memory _pools, uint256[] memory _shares) {
        pools = _pools;
        shares = _shares;
    }

    function getPools() external view override returns (IOddzLiquidityPool[] memory) {
        return pools;
    }

    function getShares() external view override returns (uint256[] memory) {
        return shares;
    }

    function getPoolsLiquidity(address _provider) external view override returns (uint256[] memory) {
        return poolsLiquidity[_provider];
    }

    function addLiquidity(address _provider, uint256[] memory _shares) external override onlyOwner {
        uint256[] storage liquidity = poolsLiquidity[_provider];

        if (liquidity.length == 0) {
            for (uint256 i = 0; i < pools.length; i++) {
                liquidity.push(_shares[i]);
            }
        } else {
            for (uint256 i = 0; i < pools.length; i++) {
                liquidity[i] += _shares[i];
            }
        }
    }

    function removeLiquidity(address _provider) external override onlyOwner {
        uint256[] storage liquidity = poolsLiquidity[_provider];
        for (uint256 i = 0; i < pools.length; i++) {
            liquidity[i] = 0;
        }
    }
}
