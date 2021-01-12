// SPDX-License-Identifier: BSD-4-Clause
pragma solidity ^0.7.0;

import { Ownable } from "openzeppelin-solidity/contracts/access/Ownable.sol";
import { SafeMath } from "openzeppelin-solidity/contracts/math/SafeMath.sol";
import { IERC20 } from "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";

/**
 * @title TokenVesting
 * @dev A token holder contract that can release its token balance gradually like a
 * typical vesting scheme, with a cliff and vesting period. Optionally revocable by the
 * owner.
 */

contract OddzTokenVesting is Ownable {
  using SafeMath for uint256;
  using SafeERC20 for IERC20;

  IERC20 private oddzToken;
  uint256 private tokensToVest;
  uint256 public vestingId;

  string private constant INSUFFICIENT_BALANCE = "Insufficient balance";
  string private constant INVALID_VESTING_ID = "Invalid vesting id";
  string private constant VESTING_ALREADY_RELEASED = "Vesting already released";
  string private constant INVALID_BENEFICIARY = "Invalid beneficiary address";
  string private constant NOT_VESTED = "Tokens have not vested yet";

  struct Vesting {
    uint256 releaseTime;
    uint256 amount;
    address beneficiary;
    bool released;
  }

  mapping(uint256 => Vesting) public vestings;

  event TokenVestingReleased(uint256 indexed vestingId, address indexed beneficiary, uint256 amount);
  event TokenVestingAdded(uint256 indexed vestingId, address indexed beneficiary, uint256 amount);
  event TokenVestingRemoved(uint256 indexed vestingId, address indexed beneficiary, uint256 amount);
  event RetrieveExcessTokens(uint256 indexed amount);

  constructor(IERC20 _token) public {
    require(address(_token) != address(0x0), "Oddz token address is not valid");
    oddzToken = _token;
    uint256 SCALING_FACTOR = 10 ** 18;
    uint256 day = 1 days;
    // Add vesting in a batch
    addVesting(0x59AD7074E468d212bD038573e807D1eDa715C5ec, block.timestamp + 30 * day, 2140000  * SCALING_FACTOR);
    addVesting(0x59AD7074E468d212bD038573e807D1eDa715C5ec, block.timestamp + 60 * day, 2140000  * SCALING_FACTOR);
    addVesting(0x59AD7074E468d212bD038573e807D1eDa715C5ec, block.timestamp + 90 * day, 6140000  * SCALING_FACTOR);
    addVesting(0x59AD7074E468d212bD038573e807D1eDa715C5ec, block.timestamp + 120 * day, 2140000  * SCALING_FACTOR);
    addVesting(0x59AD7074E468d212bD038573e807D1eDa715C5ec, block.timestamp + 150 * day, 2140000  * SCALING_FACTOR);
    addVesting(0x59AD7074E468d212bD038573e807D1eDa715C5ec, block.timestamp + 180 * day, 11840000  * SCALING_FACTOR);
    addVesting(0x59AD7074E468d212bD038573e807D1eDa715C5ec, block.timestamp + 210 * day, 1396250  * SCALING_FACTOR);
    addVesting(0x59AD7074E468d212bD038573e807D1eDa715C5ec, block.timestamp + 240 * day, 1396250  * SCALING_FACTOR);
    addVesting(0x59AD7074E468d212bD038573e807D1eDa715C5ec, block.timestamp + 270 * day, 5396250  * SCALING_FACTOR);
    addVesting(0x59AD7074E468d212bD038573e807D1eDa715C5ec, block.timestamp + 300 * day, 1396250  * SCALING_FACTOR);
    addVesting(0x59AD7074E468d212bD038573e807D1eDa715C5ec, block.timestamp + 330 * day, 1396250  * SCALING_FACTOR);
    addVesting(0x59AD7074E468d212bD038573e807D1eDa715C5ec, block.timestamp + 360 * day, 11096250  * SCALING_FACTOR);
    addVesting(0x59AD7074E468d212bD038573e807D1eDa715C5ec, block.timestamp + 390 * day, 1396250  * SCALING_FACTOR);
    addVesting(0x59AD7074E468d212bD038573e807D1eDa715C5ec, block.timestamp + 420 * day, 1396250  * SCALING_FACTOR);
    addVesting(0x59AD7074E468d212bD038573e807D1eDa715C5ec, block.timestamp + 450 * day, 3896250  * SCALING_FACTOR);
    addVesting(0x59AD7074E468d212bD038573e807D1eDa715C5ec, block.timestamp + 480 * day, 1396250  * SCALING_FACTOR);
    addVesting(0x59AD7074E468d212bD038573e807D1eDa715C5ec, block.timestamp + 510 * day, 1396250  * SCALING_FACTOR);
    addVesting(0x59AD7074E468d212bD038573e807D1eDa715C5ec, block.timestamp + 540 * day, 7096250  * SCALING_FACTOR);
    addVesting(0x59AD7074E468d212bD038573e807D1eDa715C5ec, block.timestamp + 570 * day, 1396250  * SCALING_FACTOR);
    addVesting(0x59AD7074E468d212bD038573e807D1eDa715C5ec, block.timestamp + 600 * day, 1396250  * SCALING_FACTOR);
    addVesting(0x59AD7074E468d212bD038573e807D1eDa715C5ec, block.timestamp + 630 * day, 1396250  * SCALING_FACTOR);
    addVesting(0x59AD7074E468d212bD038573e807D1eDa715C5ec, block.timestamp + 660 * day, 1396250  * SCALING_FACTOR);
    addVesting(0x59AD7074E468d212bD038573e807D1eDa715C5ec, block.timestamp + 690 * day, 1396250  * SCALING_FACTOR);
    addVesting(0x59AD7074E468d212bD038573e807D1eDa715C5ec, block.timestamp + 720 * day, 4596250  * SCALING_FACTOR);
    addVesting(0x59AD7074E468d212bD038573e807D1eDa715C5ec, block.timestamp + 750 * day, 1396250  * SCALING_FACTOR);
    addVesting(0x59AD7074E468d212bD038573e807D1eDa715C5ec, block.timestamp + 780 * day, 1396250  * SCALING_FACTOR);
    addVesting(0x59AD7074E468d212bD038573e807D1eDa715C5ec, block.timestamp + 810 * day, 1396250  * SCALING_FACTOR);
    addVesting(0x59AD7074E468d212bD038573e807D1eDa715C5ec, block.timestamp + 840 * day, 1396250  * SCALING_FACTOR);
    addVesting(0x59AD7074E468d212bD038573e807D1eDa715C5ec, block.timestamp + 870 * day, 1396250  * SCALING_FACTOR);
    addVesting(0x59AD7074E468d212bD038573e807D1eDa715C5ec, block.timestamp + 900 * day, 4596250  * SCALING_FACTOR);
  }

  /**
     * @dev Token address for vesting contract
     * @return Token contract address
     */
  function token() public view returns (IERC20) {
    return oddzToken;
  }

  /**
   * @dev Function to check beneficiary of a vesting
   * @param _vestingId  vesting Id
   * @return Beneficiary's address
   */
  function beneficiary(uint256 _vestingId) public view returns (address) {
    return vestings[_vestingId].beneficiary;
  }

  /**
   * @dev Function to check Release Time of a vesting
   * @param _vestingId  vesting Id
   * @return Release Time in unix timestamp
   */
  function releaseTime(uint256 _vestingId) public view returns (uint256) {
    return vestings[_vestingId].releaseTime;
  }

  /**
   * @dev Function to check token amount of a vesting
   * @param _vestingId  vesting Id
   * @return Number of tokens for a vesting
   */
  function vestingAmount(uint256 _vestingId) public view returns (uint256) {
    return vestings[_vestingId].amount;
  }

  /**
   * @notice Function to remove a vesting by owner of vesting contract
   * @param _vestingId  vesting Id
   */
  function removeVesting(uint256 _vestingId) public onlyOwner {
    Vesting storage vesting = vestings[_vestingId];
    require(vesting.beneficiary != address(0x0), INVALID_VESTING_ID);
    require(!vesting.released , VESTING_ALREADY_RELEASED);
    vesting.released = true;
    tokensToVest = tokensToVest.sub(vesting.amount);
    emit TokenVestingRemoved(_vestingId, vesting.beneficiary, vesting.amount);
  }

  /**
   * @notice Function to add a vesting
   * Since this is onlyOwner protected, tokens are assumed to be transferred to the vesting contract
   * @param _beneficiary  Beneficiary's address
   * @param _releaseTime  Time for release
   * @param _amount       Amount of vesting
   */
  function addVesting(address _beneficiary, uint256 _releaseTime, uint256 _amount) public onlyOwner {
    require(_beneficiary != address(0x0), INVALID_BENEFICIARY);
    require(_releaseTime > block.timestamp, "Invalid release time");
    require(_amount != 0, "Amount must be greater then 0");
    tokensToVest = tokensToVest.add(_amount);
    vestingId = vestingId.add(1);
    vestings[vestingId] = Vesting({
    beneficiary: _beneficiary,
    releaseTime: _releaseTime,
    amount: _amount,
    released: false
    });
    emit TokenVestingAdded(vestingId, _beneficiary, _amount);
  }

  /**
   * @notice Function to release tokens of a vesting id
   * @param _vestingId  vesting Id
   */
  function release(uint256 _vestingId) public {
    Vesting storage vesting = vestings[_vestingId];
    require(vesting.beneficiary != address(0x0), INVALID_VESTING_ID);
    require(!vesting.released , VESTING_ALREADY_RELEASED);
    // solhint-disable-next-line not-rely-on-time
    require(block.timestamp >= vesting.releaseTime, NOT_VESTED);

    require(oddzToken.balanceOf(address(this)) >= vesting.amount, INSUFFICIENT_BALANCE);
    vesting.released = true;
    tokensToVest = tokensToVest.sub(vesting.amount);
    oddzToken.safeTransfer(vesting.beneficiary, vesting.amount);
    emit TokenVestingReleased(_vestingId, vesting.beneficiary, vesting.amount);
  }

  /**
   * @dev Function to remove any extra tokens, i.e cancelation of a vesting
   * @param _amount Amount to retrieve
   */
  function retrieveExcessTokens(uint256 _amount) public onlyOwner {
    require(_amount <= oddzToken.balanceOf(address(this)).sub(tokensToVest), INSUFFICIENT_BALANCE);
    emit RetrieveExcessTokens(_amount);
    oddzToken.safeTransfer(owner(), _amount);
  }
}
