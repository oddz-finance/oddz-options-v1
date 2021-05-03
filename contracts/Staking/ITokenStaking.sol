pragma solidity 0.8.3;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Address.sol";


interface ITokenStaking {


    struct StakerDetails {
        address _address;
        uint256 _lastStakedAt;
        uint256 _rewards;
    }


    function stake(
        address _token,
        address _staker,
        uint256 _amount,
        uint256 _date
    ) external;

    function balance(address _staker) external returns (uint256);

    function mint(address _staker, uint256 _amount) external;

    function burn(address _staker, uint256 _amount) external;

    function getLastStakedAt(address _staker) external view returns(uint256);

    function setLastStakedAt(address _staker, uint256 _lastStakedAt) external;

    function getRewards(address _staker) external view returns(uint256 rewards);

    function addRewards(address _staker, uint256 _amount) external ;

    function removeRewards(address _staker) external returns (uint256 rewards);
}
