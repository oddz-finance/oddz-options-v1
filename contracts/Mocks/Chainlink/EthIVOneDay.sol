// SPDX-License-Identifier: BSD-4-Clause
pragma solidity ^0.7.0;

import "@chainlink/contracts/src/v0.7/interfaces/AggregatorV3Interface.sol";

contract EthIVOneDay is AggregatorV3Interface {
    function decimals() public view override returns (uint8) {
        return 8;
    }

    function description() public view override returns (string memory) {
        return "ETH 1 day IV";
    }

    function version() public view override returns (uint256) {
        return 1;
    }

    function getRoundData(uint80 _roundId)
        public
        view
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
        view
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
