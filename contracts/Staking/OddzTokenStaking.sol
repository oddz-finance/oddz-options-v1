pragma solidity 0.8.3;

import "./AbstractTokenStaking.sol";
import "./IOddzStaking.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract OddzTokenStaking is AbstractTokenStaking, AccessControl, ERC20("Oddz Staking Token", "sOddz") {
    using Address for address;
    using SafeERC20 for IERC20;

    /**
     * @dev Access control specific data definitions
     */
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    modifier onlyOwner(address _address) {
        require(hasRole(DEFAULT_ADMIN_ROLE, _address), "Caller has no access to the method");
        _;
    }

    modifier onlyManager(address _address) {
        require(hasRole(MANAGER_ROLE, _address), "Caller has no access to the method");
        _;
    }

    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /**
     @dev sets the manager for the staking  contract
     @param _address manager contract address
     Note: This can be called only by the owner
     */
    function setManager(address _address) public {
        require(_address != address(0) && _address.isContract(), "LP Error: Invalid manager address");
        grantRole(MANAGER_ROLE, _address);
    }

    /**
     @dev removes the manager for the staking contract for valid managers
     @param _address manager contract address
     Note: This can be called only by the owner
     */
    function removeManager(address _address) public {
        revokeRole(MANAGER_ROLE, _address);
    }

    function stake(
        address _staker,
        uint256 _amount,
        uint256 _date
    ) external override {
        _mint(_staker, _amount);
        if (stakers[_staker]._address == address(0)) {
            stakers[_staker] = StakerDetails(_staker, _date, 0);
        } else {
            stakers[_staker]._lastStakedAt = _date;
        }
        IERC20(token).safeTransferFrom(_staker, address(this), _amount);
    }

    function mint(address _staker, uint256 _amount) external override onlyManager(msg.sender) {
        _mint(_staker, _amount);
    }

    function burn(address _staker, uint256 _amount) external override onlyManager(msg.sender) {
        _burn(_staker, _amount);
    }

    function setToken(address _token) external override onlyManager(msg.sender) {
        token = _token;
    }

    function balance(address _address) external view override returns (uint256 bal) {
        bal = balanceOf(_address);
    }

    function supply() external view override returns (uint256 supply) {
        supply = totalSupply();
    }

    
}
