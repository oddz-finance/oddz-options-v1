// SPDX-License-Identifier: BSD-4-Clause
pragma solidity 0.8.3;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "./IOddzTokenStaking.sol";

abstract contract AbstractTokenStaking is Ownable, IOddzTokenStaking {
    using Address for address;

    /**
     * @dev Staker Details
     * @param _amount Amount to stake
     * @param _date Date on which tokens are staked
     * @param _rewards rewards allocated for the user
     * @param _lastClaimed Last rewards claimed date for the user
     */
    struct UserStake {
        uint256 _amount;
        uint256 _date;
        uint256 _rewards;
        uint256 _lastClaimed;
    }

    /**
     * @dev Stake Contract details
     * @param _totalActiveStake Amount to total stake
     * @param _allocatedRewards Rewards allocated for the staking contract
     */
    struct Stake {
        uint256 _totalActiveStake;
        uint256 _allocatedRewards;
    }

    // staker -> UserStake
    mapping(address => UserStake) public staker;

    // date (utc) -> Stake
    mapping(uint256 => Stake) public dayStakeMap;

    uint256 public lastStaked;

    /**
     * @dev Staking token address
     */
    address public token;

    /**
     * @notice Sets staking token address
     * @param _token Address of the token
     */
    function setToken(address _token) external override onlyOwner {
        token = _token;
    }

    /**
     * @notice Allocates rewards to staker
     * @param _date Date on which tokens are staked
     * @param _amount Amount of ODDZ token allocated
     */
    function allocateRewards(uint256 _date, uint256 _amount) external override onlyOwner {
        // create the Stake data structure if not present
        getAndUpdateDaysActiveStake(_date);
        dayStakeMap[_date]._allocatedRewards += _amount;
    }

    /**
     * @notice Get last staked date for the staker
     * @param _staker Address of the staker
     * @return lastStakedAt last staked date
     */
    function getLastStakedAt(address _staker) external view override returns (uint256 lastStakedAt) {
        require(staker[_staker]._amount > 0, "invalid staker");
        lastStakedAt = staker[_staker]._date;
    }

    /**
     * @notice Get staker rewards
     * @param _staker Address of the staker
     * @return rewards staker rewards
     */
    function getRewards(address _staker, uint256 _date) public view override returns (uint256 rewards) {
        if (staker[_staker]._amount == 0) return 0;
        uint256 startDate;
        if (staker[_staker]._lastClaimed > 0) startDate = staker[_staker]._lastClaimed;
        else startDate = staker[_staker]._date;

        uint256 totalStake;
        uint256 totalReward;
        uint256 count = (_date - startDate) / 1 days;
        for (uint256 i = 0; i < count; i++) {
            totalStake += dayStakeMap[startDate + (i * 1 days)]._totalActiveStake;
            totalReward += dayStakeMap[startDate + (i * 1 days)]._allocatedRewards;
        }
        if (totalStake == 0) return 0;
        rewards = ((staker[_staker]._amount * count * totalReward) / totalStake) + staker[_staker]._rewards;
    }

    /**
     * @notice Remove staker rewards
     * @param _staker Address of the staker
     * @return rewards staker rewards
     */
    function withdrawRewards(address _staker, uint256 _date) external override onlyOwner returns (uint256 rewards) {
        rewards = getRewards(_staker, _date);
        staker[_staker]._lastClaimed = _date;
        staker[_staker]._rewards = 0;
    }

    /**
     * @notice Return if the staker is valid
     * @param _staker Address of the staker
     * @return true/ false for valid staker
     */
    function isValidStaker(address _staker) external view override returns (bool) {
        if (staker[_staker]._amount > 0) return true;
        return false;
    }

    /**
     * @notice Call this method every day
     * @param _date stake as per the date
     * @return dayStake stake for the date
     */
    function getAndUpdateDaysActiveStake(uint256 _date) public override returns (uint256 dayStake) {
        if (dayStakeMap[_date]._totalActiveStake > 0) return dayStakeMap[_date]._totalActiveStake;
        if (lastStaked == 0) return 0;
        for (uint256 i = 1; i <= (_date - lastStaked) / 1 days; i++) {
            dayStakeMap[lastStaked + i * 1 days] = Stake(dayStakeMap[lastStaked]._totalActiveStake, 0);
        }

        if (_date > lastStaked) lastStaked = _date;
        return dayStakeMap[_date]._totalActiveStake;
    }

    /**
     * @notice Updates user stake
     * @param _staker Address of the staker
     * @param _amount Amount to stake
     * @param _date  Date on which tokens are staked
     */
    function _stake(
        address _staker,
        uint256 _amount,
        uint256 _date
    ) internal onlyOwner {
        _allocateStakerRewards(_staker, _date);
        // update to stake to hold existing stake
        staker[_staker] = UserStake(staker[_staker]._amount + _amount, _date, 0, 0);

        dayStakeMap[_date]._totalActiveStake = getAndUpdateDaysActiveStake(_date) + _amount;
        lastStaked = _date;
    }

    /**
     * @notice updates user unstake tokens
     * @param _amount Amount to burn and transfer
     * @param _date  Date on which tokens are unstaked
     */
    function _unstake(
        address _staker,
        uint256 _amount,
        uint256 _date
    ) internal {
        _allocateStakerRewards(_staker, _date);
        // update to stake to hold existing stake
        staker[_staker] = UserStake(staker[_staker]._amount - _amount, _date, 0, 0);

        dayStakeMap[_date]._totalActiveStake = getAndUpdateDaysActiveStake(_date) - _amount;
        lastStaked = _date;
    }

    /**
     * @notice Allocates rewards to staker
     * @param _staker Address of the staker
     * @param _date  Date on which tokens are staked
     */
    function _allocateStakerRewards(address _staker, uint256 _date) private {
        staker[_staker]._rewards = getRewards(_staker, _date);
        staker[_staker]._lastClaimed = _date;
    }
}
