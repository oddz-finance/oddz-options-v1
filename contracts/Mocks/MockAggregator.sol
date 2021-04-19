// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "@chainlink/contracts/src/v0.7/interfaces/AggregatorV3Interface.sol";

contract MockAggregatorV3 is AggregatorV3Interface {
    int256 public lastAnswer;
    uint256 public lastTimestamp;
    string public symbolA;
    string public symbolB;
    uint8 idecimals;
    string idescription;
    uint256 iversion;

    constructor(
        string memory _symbolA,
        string memory _symbolB,
        uint8 _decimals,
        string memory _description,
        uint256 _version
    ) {
        symbolA = _symbolA;
        symbolB = _symbolB;
        idecimals = _decimals;
        idescription = _description;
        iversion = _version;
    }

    function setLatestAnswer(int256 _answer) external {
        lastAnswer = _answer;
    }

    function setLastTimestamp(uint256 _lastTimestamp) external {
        lastTimestamp = _lastTimestamp;
    }

    function decimals() external view override returns (uint8) {
        return idecimals;
    }

    function description() external view override returns (string memory) {
        return idescription;
    }

    function version() external view override returns (uint256) {
        return iversion;
    }

    // getRoundData and latestRoundData should both raise "No data present"
    // if they do not have data to report, instead of returning unset values
    // which could be misinterpreted as actual reported values.
    function getRoundData(uint80 _roundId)
        external
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
        roundId = _roundId;
        answer = lastAnswer;
        startedAt = lastTimestamp;
        updatedAt = lastTimestamp;
        answeredInRound = _roundId;
    }

    function latestRoundData()
        external
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
        roundId = 1;
        answer = lastAnswer;
        startedAt = lastTimestamp;
        updatedAt = lastTimestamp;
        answeredInRound = 1;
    }
}
