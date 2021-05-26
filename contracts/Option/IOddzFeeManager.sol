// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

/**
 * @title Oddz Fee Manager
 * @notice Oddz Fee Manager Contract
 */
interface IOddzFeeManager {
    /**
     * @notice Gets transaction fee for an option buyer
     * @param _buyer Address of buyer
     * @return txnFee Transaction fee percentage for the buyer
     */
    function getTransactionFee(address _buyer) external view returns (uint256 txnFee);

    /**
     * @notice Gets settlement fee for an option holder
     * @param _holder Address of buyer
     * @return settlementFee Transaction fee percentage for the buyer
     */
    function getSettlementFee(address _holder) external view returns (uint256 settlementFee);

    /**
     * @notice returns fee decimals
     * @return decimals fee decimals
     */
    function decimals() external view returns (uint8);
}
