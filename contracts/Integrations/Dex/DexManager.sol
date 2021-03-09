pragma solidity ^0.7.4;

import "./ISwapUnderlyingAsset.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "hardhat/console.sol";

contract DexManager is Ownable {
    using Address for address;

    struct ExchangeData {
        bytes32 _underlying;
        bytes32 _strikeAsset;
        ISwapUnderlyingAsset _exchange;
    }

    mapping(bytes32 => mapping(bytes32 => ISwapUnderlyingAsset)) public activeExchange;
    mapping(bytes32 => ExchangeData) public exchangeMap;

    /**
     * @dev Emitted when the new exchange data has been added.
     * @param _underlying Address of the underlying asset.
     * @param _strikeAsset Address of the strike asset.
     * @param _exchange Address of the exchange.
     */
    event NewExchange(bytes32 indexed _underlying, bytes32 indexed _strikeAsset, ISwapUnderlyingAsset _exchange);

    /**
     * @dev Emitted when the exchange data has been changed.
     * @param _underlying Address of the underlying asset.
     * @param _strikeAsset Address of the strike asset.
     * @param _previousExchange Address of the previous exchange.
     * @param _newExchange Address of the new exchange.
     */
    event SetExchange(
        bytes32 indexed _underlying,
        bytes32 indexed _strikeAsset,
        ISwapUnderlyingAsset _previousExchange,
        ISwapUnderlyingAsset _newExchange
    );

    /**
     * @dev Emitted when the tokens are swapped.
     * @param _underlying name of the underlying asset.
     * @param _strikeAsset name of the strike asset.
     * @param _inputTokens amount of input tokens.
     * @param _swappedTokens amount of swapped tokens.
     */
    event Swapped(
        bytes32 indexed _underlying,
        bytes32 indexed _strikeAsset,
        uint256 _inputTokens,
        uint256 _swappedTokens
    );

    /**
     * @notice Function to add the the exchange data data.
     * @param _underlying Id of the underlying.
     * @param _strikeAsset Id of the strike asset.
     * @param _exchange Address of the exchange.
     */
    function addExchange(
        bytes32 _underlying,
        bytes32 _strikeAsset,
        address _underlyingAssetAddress,
        address _strikeAssetAddress,
        ISwapUnderlyingAsset _exchange
    ) public onlyOwner returns (bytes32 exHash) {
        require(_underlying != _strikeAsset, "Invalid assets");
        require(address(_exchange).isContract(), "Invalid exchange");

        ExchangeData memory data = ExchangeData(_underlying, _strikeAsset, _exchange);
        exHash = keccak256(abi.encode(_underlying, _strikeAsset, address(_exchange)));
        exchangeMap[exHash] = data;
        _exchange.addAssetAddress(_underlying, _underlyingAssetAddress);
        _exchange.addAssetAddress(_strikeAsset, _strikeAssetAddress);

        emit NewExchange(_underlying, _strikeAsset, _exchange);
    }

    /**
     * @notice Function to set the exchange data.
     * @param _exHash hash of the underlying, strike asset and exchange.
     */
    function setActiveExchange(bytes32 _exHash) public onlyOwner {
        ExchangeData storage data = exchangeMap[_exHash];
        require(address(data._exchange) != address(0), "Invalid exchange");

        ISwapUnderlyingAsset oldEx = activeExchange[data._underlying][data._strikeAsset];
        activeExchange[data._underlying][data._strikeAsset] = data._exchange;

        emit SetExchange(data._underlying, data._strikeAsset, oldEx, data._exchange);
    }

    function getExchange(bytes32 _underlying, bytes32 _strike) public view returns (address exchangeAddress) {
        exchangeAddress = address(activeExchange[_underlying][_strike]);
    }

    /**
     * @notice Function to swap Tokens
     * @param _fromToken name of the asset to swap from
     * @param _toToken name of the asset to swap to
     * @param _account account to send the swapped tokens to
     * @param _amountIn amount of fromTokens to swap from
     * @param _amountOutMin minimum amount of toTokens to swap to
     * @param _deadline deadline timestamp for txn to be valid
     */

    function swap(
        bytes32 _fromToken,
        bytes32 _toToken,
        address payable _account,
        uint256 _amountIn,
        uint256 _amountOutMin,
        uint256 _deadline
    ) public {
        ISwapUnderlyingAsset exchange = activeExchange[_toToken][_fromToken];
        require(address(exchange) != address(0), "No exchange");

        uint256[] memory swapResult =
            exchange.swapTokensForUA(_fromToken, _toToken, _account, _amountIn, _amountOutMin, _deadline);
        emit Swapped(_fromToken, _toToken, swapResult[0], swapResult[1]);
    }
}
