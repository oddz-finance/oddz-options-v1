// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "@chainlink/contracts/src/v0.7/interfaces/AggregatorV3Interface.sol";

contract EthIVTwentyoneDays is AggregatorV3Interface {
    function decimals() public pure override returns (uint8) {
        return 8;
    }

    function description() public pure override returns (string memory) {
        return "ETH 21 days IV";
    }

    function version() public pure override returns (uint256) {
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
        roundId = 18446744073709557194;
        answer = 10586000000;
        startedAt = 1615816281;
        updatedAt = block.timestamp;
        answeredInRound = 18446744073709557194;
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
        roundId = 18446744073709557194;
        answer = 10586000000;
        startedAt = 1615816281;
        updatedAt = block.timestamp;
        answeredInRound = 18446744073709557194;
    }
}
