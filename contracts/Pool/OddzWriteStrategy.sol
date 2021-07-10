pragma solidity 0.8.3;

import "./IOddzWriteStrategy.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract OddzWriteStrategy is IOddzWriteStrategy, Ownable {
    IOddzLiquidityPool[] public pools;
    uint256[] public shares;
    uint256 public liquidity;
    // user => amount
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

   

}
