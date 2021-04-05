// SPDX-License-Identifier: BSD-4-Clause
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.7/interfaces/AggregatorV3Interface.sol";

contract EthIVOneDay is AggregatorV3Interface {
    function decimals() public pure override returns (uint8) {
        return 8;
    }

    function description() public pure override returns (string memory) {
        return "ETH 1 day IV";
    }

    function version() public pure override returns (uint256) {
        return 1;
    }

    function getRoundData(uint80 _roundId)
        public
        pure
        override
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        roundId = 18446744073709562250;
        answer = 8379000000;
        startedAt = 1615816311;
        updatedAt = 1615816311;
        answeredInRound = 18446744073709562250;
    }

    function latestRoundData()
        public
        pure
        override
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        roundId = 18446744073709562250;
        answer = 8379000000;
        startedAt = 1615816311;
        updatedAt = 1615816311;
        answeredInRound = 18446744073709562250;
    }
}
