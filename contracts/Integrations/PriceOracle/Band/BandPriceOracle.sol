// SPDX-License-Identifier: BSD-4-Clause
pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "../../../Oracle/IOddzPriceOracle.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "./IStdReference.sol";

contract BandPriceOracle is Ownable, IOddzPriceOracle {
    using Address for address;

    mapping(bytes32 => mapping(bytes32 => IStdReference)) public addressMap;

    function getPrice(bytes32 _underlying, bytes32 _strike)
        public
        view
        override
        onlyOwner
        returns (uint256 price, uint8 decimals)
    {
        IStdReference aggregator = addressMap[_underlying][_strike];
        require(address(aggregator) != address(0), "No aggregator");
        IStdReference.ReferenceData memory data =
            aggregator.getReferenceData(bytes32ToString(_underlying), bytes32ToString(_strike));

        price = data.rate;
        decimals = 18;
    }

    function setPairContract(
        bytes32 _underlying,
        bytes32 _strike,
        address _aggregator
    ) public override onlyOwner {
        require(_aggregator.isContract(), "Invalid band aggregator");
        addressMap[_underlying][_strike] = IStdReference(_aggregator);

        emit AddAssetPairAggregator(_underlying, _strike, address(this), _aggregator);
    }

    function bytes32ToString(bytes32 _bytes32) private pure returns (string memory) {
        uint8 i = 0;
        while (i < 32 && _bytes32[i] != 0) {
            i++;
        }
        bytes memory bytesArray = new bytes(i);
        for (i = 0; i < 32 && _bytes32[i] != 0; i++) {
            bytesArray[i] = _bytes32[i];
        }
        return string(bytesArray);
    }
}
