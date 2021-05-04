pragma solidity 0.8.3;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Address.sol";

abstract contract AbstractTokenStaking {
    /**
     * @dev Staker Details
     * @param _address Address of the staker
     * @param _lastStakedAt Last staked date for the user
     * @param _rewards rewards for the user
     */
    struct StakerDetails {
        address _address;
        uint256 _lastStakedAt;
        uint256 _rewards;
    }

    /**
     * @dev Staker details
     */
    mapping(address => StakerDetails) stakers;

    /**
     * @notice Stake tokens
     * @param _token Address of the staked token
     * @param _staker Address of the staker
     * @param _amount Amount to stake
     * @param _date  Date on which tokens are staked
     */
    function stake(
        address _token,
        address _staker,
        uint256 _amount,
        uint256 _date
    ) external virtual;

    /**
     * @notice mint tokens for the staker
     * @param _staker Address of the staker
     * @param _amount Amount to mint
     */
    function mint(address _staker, uint256 _amount) external virtual;

    /**
     * @notice burn tokens of the staker
     * @param _staker Address of the staker
     * @param _amount Amount to burn
     */
    function burn(address _staker, uint256 _amount) external virtual;

    /**
     * @notice balane of tokens for the staker
     * @param _staker Address of the staker
     * @return bal balance of the staker
     */
    function balance(address _staker) external view virtual returns (uint256 bal);

    /**
     * @notice Supply of the tokens
     * @return supply token supply
     */
    function supply() external view virtual returns (uint256 supply);

    /**
     * @notice Get last staked date for the staker
     * @param _staker Address of the staker
     * @return lastStakedAt last staked date
     */
    function getLastStakedAt(address _staker) public view returns (uint256 lastStakedAt) {
        lastStakedAt = stakers[_staker]._lastStakedAt;
    }

    /**
     * @notice Get staker rewards
     * @param _staker Address of the staker
     * @return rewards staker rewards
     */
    function getRewards(address _staker) public view returns (uint256 rewards) {
        rewards = stakers[_staker]._rewards;
    }

    /**
     * @notice Add staker rewards
     * @param _staker Address of the staker
     * @param _amount Reward amount
     */
    function addRewards(address _staker, uint256 _amount) public {
        stakers[_staker]._rewards += _amount;
    }

    /**
     * @notice Remove staker rewards
     * @param _staker Address of the staker
     * @return rewards staker rewards
     */
    function removeRewards(address _staker) public returns (uint256 rewards) {
        rewards = stakers[_staker]._rewards;
        stakers[_staker]._rewards = 0;
    }
}
