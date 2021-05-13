pragma solidity 0.8.3;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";

abstract contract AbstractTokenStaking is Ownable {
    using Address for address;

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
     * @dev Staking token address
     */
    address public token;

    /**
     * @notice Stake tokens
     * @param _staker Address of the staker
     * @param _amount Amount to stake
     * @param _date  Date on which tokens are staked
     */
    function stake(
        address _staker,
        uint256 _amount,
        uint256 _date
    ) external virtual;

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
     * @notice Sets staking token address
     * @param _token Address of the token
     */
    function setToken(address _token) public onlyOwner {
        token = _token;
    }

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

    /**
     * @notice Return if the staker is valid
     * @param _staker Address of the staker
     * @return true/ false for valid staker
     */
    function isValidStaker(address _staker) public view returns (bool) {
        if (stakers[_staker]._address != address(0)) {
            return true;
        }
        return false;
    }
}
