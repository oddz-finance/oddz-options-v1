pragma solidity 0.8.3;

import "./IOddzWriteStrategy.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract OddzWriteStrategy is IOddzWriteStrategy, Ownable {
    IOddzLiquidityPool[] public pools;
    uint256[] public shares;
    uint256 public liquidity;
    bool public isActive;
    mapping(address => uint256) public userLiquidity;

    modifier activeStrategy() {
        require(isActive == true, "strategy is not active");
        _;
    }

    constructor(IOddzLiquidityPool[] memory _pools, uint256[] memory _shares) {
        pools = _pools;
        shares = _shares;
        isActive = true;
    }

    function deactivateStrategy() external onlyOwner activeStrategy {
        isActive = false;
    }

    function activateStrategy() external onlyOwner {
        isActive = true;
    }

    function getPools() external view override returns (IOddzLiquidityPool[] memory) {
        return pools;
    }

    function getShares() external view override returns (uint256[] memory) {
        return shares;
    }

    function updateLiquidity(
        address _provider,
        uint256 _amount,
        TransactionType _transaction
    ) external override onlyOwner activeStrategy {
        if (_transaction == TransactionType.ADD) {
            userLiquidity[_provider] += _amount;
            liquidity += _amount;
        } else {
            userLiquidity[_provider] -= _amount;
            liquidity -= _amount;
        }
    }
}
