const OddzToken = artifacts.require("OddzToken");
const TokenVesting = artifacts.require("OddzTokenVesting");

const SCALING_FACTOR = web3.utils.toBN(10 ** 18);

module.exports = async function (deployer) {
  deployer.then(async () => {
    // Total oddz supply
    const totalSupply = web3.utils.toBN(100000000).mul(SCALING_FACTOR);

    // Total oddz vesting supply
    const vestingSupply = web3.utils.toBN(88350000).mul(SCALING_FACTOR);
    // Deploy token contract
    await deployer.deploy(OddzToken, "OddzToken", "ODDZ", totalSupply);

    // deploy token contract
    const oddzTokenContract = await OddzToken.deployed();
    console.log("Oddz token deployement done:", OddzToken.address);

    // deploy vesting contract
    await deployer.deploy(TokenVesting, OddzToken.address);
    const vestingContract = await TokenVesting.deployed();
    console.log("Vesting deployment done", vestingContract.address);

    //transfer funds to vesting contract
    await oddzTokenContract.transfer(vestingContract.address, vestingSupply);
    console.log("Transfer done");
  });
};
