const OddzToken = artifacts.require("OddzToken");

const SCALING_FACTOR = web3.utils.toBN(10 ** 18);

module.exports = async function(deployer) {
  deployer
    .then(async () => {
      // Total oddz supply
      const totalSupply = web3.utils.toBN(100000000).mul(SCALING_FACTOR);

      // Total oddz supply
      const vestingSupply = web3.utils.toBN(100000000).mul(SCALING_FACTOR);

      // Deploy token contract
      await deployer.deploy(
        OddzToken,
        "OddzToken",
        "ODDZ",
        totalSupply
      );

      const deployedOddzToken = await OddzToken.deployed();
      console.log("Oddz token deployement done:", OddzToken.address);
    });
}
