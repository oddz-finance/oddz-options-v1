// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "./IOddzFeeManager.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract OddzFeeManager is IOddzFeeManager, Ownable {
    IERC20[] public txnFeeTokens;
    IERC20[] public settlementFeeTokens;
    mapping(IERC20 => bool) public tokens;

    // token -> digits -> discount percentage
    /**
     * Example: Oddz token
     * 3 -> 10 #100 - 999 tokens can get 10% discount
     * 4 -> 25 #1000 - 9999 tokens can get 25% discount
     * 5 -> 50 #10000 - 99999 tokens can get 50% discount
     * 6 -> 75 #100000 - 999999 tokens can get 75% discount
     * 7 -> 100 #1000000 - 9999999 tokens can get 100% discount
     */
    mapping(IERC20 => mapping(uint8 => uint8)) public tokenFeeDiscounts;

    uint8 public txnFeePerc = 5;
    uint8 public settlementFeePerc = 4;

    /**
     * @notice adds token discounts
     * @param _token Approved token
     * @param _digits Number of digits
     * @param _discount Percentage discount
     */
    function addTokenDiscounts(
        IERC20 _token,
        uint8 _digits,
        uint8 _discount
    ) public onlyOwner {
        require(tokens[_token], "invalid token");
        tokenFeeDiscounts[_token][_digits] = _discount;
    }

    /**
     * @notice add transaction fee discount tokens
     * @param _token IERC20 token
     */
    function addTxnTokens(IERC20 _token) public onlyOwner {
        txnFeeTokens.push(_token);
        tokens[_token] = true;
    }

    /**
     * @notice add settlement fee discount tokens
     * @param _token IERC20 token
     */
    function addSettlementTokens(IERC20 _token) public onlyOwner {
        settlementFeeTokens.push(_token);
        tokens[_token] = true;
    }

    /**
     * @notice set transaction fee percentage
     * @param _feePerc transaction fee percentage valid range (1, 10)
     */
    function setTransactionFeePerc(uint8 _feePerc) external onlyOwner {
        require(_feePerc >= 1 && _feePerc <= 10, "Invalid transaction fee");
        txnFeePerc = _feePerc;
    }

    /**
     * @notice set settlement fee percentage
     * @param _feePerc settlement fee percentage valid range (1, 10)
     */
    function setSettlementFeePerc(uint8 _feePerc) external onlyOwner {
        require(_feePerc >= 1 && _feePerc <= 10, "Invalid settlement fee");
        settlementFeePerc = _feePerc;
    }

    /**
     * @notice Gets transaction fee for an option buyer
     * @param _buyer Address of buyer
     * @return txnFee Transaction fee percentage for the buyer
     */
    function getTransactionFee(address _buyer) public view override returns (uint8 txnFee) {
        uint8 maxDiscount;
        for (uint256 i = 0; i < txnFeeTokens.length; i++) {
            uint8 discount = tokenFeeDiscounts[txnFeeTokens[i]][numDigits(txnFeeTokens[i].balanceOf(_buyer))];
            if (discount > maxDiscount) maxDiscount = discount;
        }
        txnFee = txnFeePerc - (txnFeePerc * maxDiscount) / 100;
    }

    /**
     * @notice Gets settlement fee for an option holder
     * @param _holder Address of buyer
     * @return settlementFee Transaction fee percentage for the buyer
     */
    function getSettlementFee(address _holder) public view override returns (uint256 settlementFee) {
        uint8 maxDiscount;
        for (uint256 i = 0; i < settlementFeeTokens.length; i++) {
            uint8 discount =
                tokenFeeDiscounts[settlementFeeTokens[i]][numDigits(settlementFeeTokens[i].balanceOf(_holder))];
            if (discount > maxDiscount) maxDiscount = discount;
        }
        settlementFee = settlementFeePerc - (settlementFeePerc * maxDiscount) / 100;
    }

    /**
     * @notice Returns number of digits for an input
     * @param _amount user balance
     * @return digits - number of digits
     */
    function numDigits(uint256 _amount) private pure returns (uint8 digits) {
        digits = 0;
        while (_amount != 0) {
            _amount /= 10;
            digits++;
        }
    }
}
