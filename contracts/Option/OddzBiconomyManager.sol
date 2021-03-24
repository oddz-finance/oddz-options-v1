pragma solidity ^0.7.0;

import "../Integrations/Biconomy/BaseRelayRecipient.sol";

contract OddzBiconomyManager is BaseRelayRecipient{



    function setTrustedForwarder(address forwarderAddress) public {
        require(forwarderAddress != address(0), "Forwarder Address cannot be 0");
        trustedForwarder = forwarderAddress;
    }

    function versionRecipient() external view virtual override returns (string memory) {
        return "1";
    }

    

}