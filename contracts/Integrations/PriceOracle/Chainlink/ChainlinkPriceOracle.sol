// SPDX-License-Identifier: BSD-4-Clause
pragma solidity ^0.7.0;

import "../../../Oracle/IOddzPriceOracle.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@chainlink/contracts/src/v0.7/interfaces/AggregatorV3Interface.sol";

contract ChainlinkPriceOracle is Ownable, IOddzPriceOracle {
    using Address for address;

    mapping(bytes32 => mapping(bytes32 => address)) addressMap;

    function getPrice(bytes32 _underlying, bytes32 _strikeAsset)
        public
        view
        override
        onlyOwner
        returns (uint256 price, uint8 decimals)
    {
        address aggregator = addressMap[_underlying][_strikeAsset];
        require(aggregator != address(0), "No aggregator");

        (, int256 answer, , , ) = AggregatorV3Interface(aggregator).latestRoundData();

        price = uint256(answer);
        decimals = AggregatorV3Interface(aggregator).decimals();
    }

    function setPairContract(
        bytes32 _underlying,
        bytes32 _strikeAsset,
        address _aggregator
    ) public override onlyOwner {
        require(_aggregator.isContract(), "Invalid chainlink aggregator");
        addressMap[_underlying][_strikeAsset] = _aggregator;

        emit AddAssetPairAggregator(_underlying, _strikeAsset, address(this), _aggregator);
    }
}
