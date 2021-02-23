// SPDX-License-Identifier: BSD-4-Clause
pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "./IOddzPriceOracle.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "./IStdReference.sol";

contract BandPriceOracle is Ownable, IOddzPriceOracle {
    using SafeMath for uint256;
    using Address for address;

    mapping(bytes32 => mapping(bytes32 => IStdReference)) addressMap;

    function getPrice(bytes32 _underlying, bytes32 _strikeAsset)
        public
        view
        override
        onlyOwner
        returns (uint256 price, uint8 decimals)
    {
        IStdReference aggregator = addressMap[_underlying][_strikeAsset];
        require(address(aggregator) != address(0), "No aggregator");

        IStdReference.ReferenceData memory data =
            aggregator.getReferenceData(string(abi.encodePacked(_underlying)), string(abi.encodePacked(_strikeAsset)));

        price = data.rate.mul(10**9);
        decimals = 9;
    }

    function setPairContract(
        bytes32 _underlying,
        bytes32 _strikeAsset,
        address _aggregator
    ) public override onlyOwner {
        require(_aggregator.isContract(), "Invalid band aggregator");
        addressMap[_underlying][_strikeAsset] = IStdReference(_aggregator);

        emit AddAssetPairAggregator(_underlying, _strikeAsset, address(this), _aggregator);
    }
}
