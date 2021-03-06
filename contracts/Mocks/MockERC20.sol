// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ERC20Permit } from "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";

/**
 * @title Mock ERC20 Token
 * @dev Mock ERC20 Token
 */
contract MockERC20 is ERC20, ERC20Permit, Ownable {
    event RescueExcessTokens(address indexed token, address indexed destination, uint256 indexed amount);

    constructor(
        string memory name,
        string memory symbol,
        uint256 totalSupply
    ) ERC20(name, symbol) ERC20Permit(name) {
        _mint(msg.sender, totalSupply * (10**decimals()));
    }

    /**
     * @notice Function to rescue funds
     * Owner is assumed to be governance or Mock ERC20 trusted party for helping users
     * Function can be disabled by destroying ownership via `renounceOwnership` function
     * @param token Address of token to be rescued
     * @param destination User address
     * @param amount Amount of tokens
     */
    function rescueTokens(
        address token,
        address destination,
        uint256 amount
    ) external onlyOwner {
        require(token != destination, "Invalid address");
        require(ERC20(token).transfer(destination, amount), "Retrieve failed");
        emit RescueExcessTokens(token, destination, amount);
    }
}
