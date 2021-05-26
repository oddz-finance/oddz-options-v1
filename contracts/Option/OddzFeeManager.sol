// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "./IOddzFeeManager.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../Libs/IERC20Extented.sol";

contract OddzFeeManager is IOddzFeeManager, Ownable {
    IERC20Extented[] public txnFeeTokens;
    IERC20Extented[] public settlementFeeTokens;
    mapping(IERC20 => bool) public tokens;
    uint8 public constant override decimals = 2;

    // token -> digits -> discount percentage
    /**
     * Example: Oddz token
     * 4 -> 20 #1000 - 9999 tokens can get max 20% discount
     * 5 -> 40 #10000 - 99999 tokens can get max 40% discount
     * 6 -> 60 #100000 - 999999 tokens can get max 60% discount
     * 7 -> 80 #1000000 - 9999999 tokens can get max 80% discount
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
    function addTxnTokens(IERC20Extented _token) public onlyOwner {
        txnFeeTokens.push(_token);
        tokens[_token] = true;
    }

    /**
     * @notice add settlement fee discount tokens
     * @param _token IERC20 token
     */
    function addSettlementTokens(IERC20Extented _token) public onlyOwner {
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
    function getTransactionFee(address _buyer) public view override returns (uint256 txnFee) {
        uint256 maxDiscount;
        txnFee = txnFeePerc * 10**decimals;
        for (uint256 i = 0; i < txnFeeTokens.length; i++) {
            if (txnFeeTokens[i].balanceOf(_buyer) == 0) continue;
            uint256 discount =
                tokenFeeDiscounts[txnFeeTokens[i]][
                    numDigits(txnFeeTokens[i].balanceOf(_buyer) / 10**txnFeeTokens[i].decimals())
                ];
            if (discount > maxDiscount) maxDiscount = discount;
        }
        txnFee -= (txnFeePerc * maxDiscount * 10**decimals) / 100;
    }

    /**
     * @notice Gets settlement fee for an option holder
     * @param _holder Address of buyer
     * @return settlementFee Transaction fee percentage for the buyer
     */
    function getSettlementFee(address _holder) public view override returns (uint256 settlementFee) {
        uint256 maxDiscount;
        settlementFee = settlementFeePerc * 10**decimals;
        for (uint256 i = 0; i < settlementFeeTokens.length; i++) {
            if (settlementFeeTokens[i].balanceOf(_holder) == 0) continue;
            uint256 discount =
                tokenFeeDiscounts[settlementFeeTokens[i]][
                    numDigits(settlementFeeTokens[i].balanceOf(_holder) / 10**settlementFeeTokens[i].decimals())
                ];
            if (discount > maxDiscount) maxDiscount = discount;
        }
        settlementFee -= (settlementFeePerc * maxDiscount * 10**decimals) / 100;
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
