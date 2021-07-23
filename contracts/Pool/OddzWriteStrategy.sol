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
    mapping(address => uint256) public override userLiquidity;

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

    function addLiquidity(address _provider, uint256 _liquidity) external override onlyOwner {
        userLiquidity[_provider] += _liquidity;
    }

    function removeLiquidity(address _provider) external override onlyOwner {
        userLiquidity[_provider] = 0;
    }
}
