import { ethers, waffle } from "hardhat";
import OddzOptionManagerArtifact from "../artifacts/contracts/Option/OddzOptionManager.sol/OddzOptionManager.json";
import { BigNumber, Contract, utils } from "ethers";
import OddzTokenArtifact from "../artifacts/contracts/OddzToken.sol/OddzToken.json";

async function main() {
  try {
    const [owner] = await ethers.getSigners();
    const { deployContract } = waffle;
    const usdcTokenAddress = "0x1fAD2f9d5f033E916632ba4B951B15271cfb9f96";
    const optionManagerAddress = "0x360A2B04dDb263aD1701C346589F25AF296ff2A0";
    //const usdcToken: Contract = await ethers.getContractAt(OddzTokenArtifact.abi, usdcTokenAddress);
    //await usdcToken.approve(optionManagerAddress, BigNumber.from(utils.parseEther("1")));

    const oddzOptionManagerContract: Contract = await ethers.getContractAt(
      OddzOptionManagerArtifact.abi,
      optionManagerAddress,
    );
    const option = await oddzOptionManagerContract.options(2);
    console.log("option: ",option)
    await oddzOptionManagerContract.connect(owner).exercise(2);
    console.log("exercised")
  } catch (ex) {
    console.log("Exception : ", ex);
  }
}

export const getExpiry = (days = 1) => {
  return 60 * 60 * 24 * days;
};

export const OptionType = {
  Call: 0,
  Put: 1,
};

main();