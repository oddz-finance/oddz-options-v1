// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers } from "hardhat";
import { BigNumber, Contract, ContractFactory } from "ethers";

const SCALING_FACTOR = BigNumber.from(10 ** 18);

async function main(): Promise<void> {
  // Hardhat always runs the compile task when running scripts through it.
  // If this runs in a standalone fashion you may want to call compile manually
  // to make sure everything is compiled
  // await run("compile");

  // Total oddz supply
  const totalSupply = BigNumber.from(100000000).mul(SCALING_FACTOR);

  // We get the contract to deploy
  const Greeter: ContractFactory = await ethers.getContractFactory("Greeter");
  const greeter: Contract = await Greeter.deploy("Hello, Buidler!");
  await greeter.deployed();
  console.log("Greeter deployed to: ", greeter.address);

  const OddzToken: ContractFactory = await ethers.getContractFactory("OddzToken");
  const oddzToken: Contract = await OddzToken.deploy(OddzToken,
    "OddzToken",
    "ODDZ",
    totalSupply)
  console.log("OddzToken deployed to: ", oddzToken.address);

  const OddzOptionManager: ContractFactory = await ethers.getContractFactory("OddzOptionManager");
  const oddzOptionManager: Contract = await OddzOptionManager.deploy();
  console.log("OddzOptionManager deployed to", oddzOptionManager.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
