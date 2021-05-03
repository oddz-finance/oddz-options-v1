pragma solidity 0.8.3;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Address.sol";

abstract contract AbstractTokenStaking {
    struct StakerDetails {
        address _address;
        uint256 _lastStakedAt;
        uint256 _rewards;
    }
    mapping(address => StakerDetails) stakers;

    function stake(
        address _token,
        address _staker,
        uint256 _amount,
        uint256 _date
    ) external virtual;

    function mint(address _staker, uint256 _amount) external virtual;

    function burn(address _staker, uint256 _amount) external virtual;

    function balance(address _address) external view virtual returns (uint256);

    function supply() external view virtual returns (uint256);

    function getLastStakedAt(address _staker) public view returns (uint256 lastStakedAt) {
        lastStakedAt = stakers[_staker]._lastStakedAt;
    }

    function setLastStakedAt(address _staker, uint256 _lastStakedAt) public {
        stakers[_staker]._lastStakedAt = _lastStakedAt;
    }

    function getRewards(address _staker) public view returns (uint256 rewards) {
        rewards = stakers[_staker]._rewards;
    }

    function addRewards(address _staker, uint256 _amount) public {
        stakers[_staker]._rewards += _amount;
    }

    function removeRewards(address _staker) public returns (uint256 rewards) {
        rewards = stakers[_staker]._rewards;
        stakers[_staker]._rewards = 0;
    }
}
