import { expect } from "chai";
import Web3 from "Web3";
import { BigNumber, utils, constants } from "ethers";
import { OddzAssetManager, MockERC20, OddzPriceOracleManager, MockOddzPriceOracle } from "../../typechain";
import { DistributionPercentage, DepositType, getExpiry, addSnapshotCount } from "../../test-utils";

import { Signer } from "@ethersproject/abstract-signer";
import { formatBytes32String, parseBytes32String } from "ethers/lib/utils";
import { waffle } from "hardhat";
import { time } from "console";

const provider = waffle.provider;

export function shouldBehaveLikeTimeLockController(): void {

  it("should revert schedule for non proposer role", async function () {
    const timelockController = await this.timeLockController.connect(this.signers.admin);
    const web3 = new Web3(Web3.givenProvider);
    const contract= new web3.eth.Contract(this.oddzAdministratorAbi, this.oddzAdministrator.address)
    const deadline = 2 * 60; // 2 mins
    const data = contract.methods.updateDeadline(deadline).encodeABI()
    await expect(timelockController.schedule(
        this.oddzAdministrator.address,
        0,
       data,
       constants.HashZero, 
       constants.HashZero, 
       60
    )).to.be.revertedWith("TimelockController: sender requires permission")

  });

 

  it("should revert schedule for less than min delay", async function () {
    const timelockController = await this.timeLockController.connect(this.signers.admin1);
    const web3 = new Web3(Web3.givenProvider);
    const contract= new web3.eth.Contract(this.oddzAdministratorAbi, this.oddzAdministrator.address)
    const deadline = 2 * 60; // 2 mins
    const data = contract.methods.updateDeadline(deadline).encodeABI()
    await expect(timelockController.schedule(
        this.oddzAdministrator.address,
        0,
       data,
       constants.HashZero, 
       constants.HashZero, 
       5
    )).to.be.revertedWith("TimelockController: insufficient delay")
    

  });

  it("should revert execute for non executor role", async function () {
    const timelockController = await this.timeLockController.connect(this.signers.admin1);
    const timelockController1 = await this.timeLockController.connect(this.signers.admin);
    const web3 = new Web3(Web3.givenProvider);
    const contract= new web3.eth.Contract(this.oddzAdministratorAbi, this.oddzAdministrator.address)
    const deadline = 2 * 60; // 2 mins
    const data = contract.methods.updateDeadline(deadline).encodeABI()
    await expect(timelockController.schedule(
      this.oddzAdministrator.address,
      0,
     data,
     constants.HashZero, 
     constants.HashZero, 
     60
  )).to.emit(timelockController,"CallScheduled")

  await expect(timelockController1.execute(
    this.oddzAdministrator.address,
    0,
   data,
   constants.HashZero,
   constants.HashZero
)).to.be.revertedWith("TimelockController: sender requires permission")
    

  });

  it("should revert execute before the scheduled time", async function () {
    const timelockController = await this.timeLockController.connect(this.signers.admin1);
    const web3 = new Web3(Web3.givenProvider);
    const contract= new web3.eth.Contract(this.oddzAdministratorAbi, this.oddzAdministrator.address)
    const deadline = 2 * 60; // 2 mins
    const data = contract.methods.updateDeadline(deadline).encodeABI()
    await expect(timelockController.schedule(
        this.oddzAdministrator.address,
        0,
       data,
       constants.HashZero, 
       constants.HashZero, 
       60
    )).to.emit(timelockController,"CallScheduled")

    await expect(timelockController.execute(
      this.oddzAdministrator.address,
      0,
     data,
     constants.HashZero,
     constants.HashZero
  )).to.be.revertedWith("TimelockController: operation is not ready")
      

  });

  it.only("should update deadline", async function () {
    const timelockController = await this.timeLockController.connect(this.signers.admin1);
    const web3 = new Web3(Web3.givenProvider);
    const contract= new web3.eth.Contract(this.oddzAdministratorAbi, this.oddzAdministrator.address)
    const deadline = 2 * 60; // 2 mins
    const data = contract.methods.updateDeadline(deadline).encodeABI()
    await expect(timelockController.schedule(
        this.oddzAdministrator.address,
        0,
       data,
       constants.HashZero, // predecessor
       constants.HashZero, // salt
       65
    )).to.emit(timelockController,"CallScheduled")
    await provider.send("evm_snapshot", []);
    // execution day + 1
    await provider.send("evm_increaseTime", [getExpiry(1)]);
    await expect(timelockController.execute(
      this.oddzAdministrator.address,
      0,
     data,
     constants.HashZero,
     constants.HashZero
  )).to.emit(timelockController,"CallExecuted")
      console.log("deadline: ", await this.oddzAdministrator.deadline())
   expect(await this.oddzAdministrator.deadline()).to.equal(deadline);

    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);

  });

  it("should change gasless facilitator", async function () {
    const timelockController = await this.timeLockController.connect(this.signers.admin1);
    const web3 = new Web3(Web3.givenProvider);
    const contract= new web3.eth.Contract(this.oddzAdministratorAbi, this.oddzAdministrator.address)
    const data = contract.methods.changeGaslessFacilitator(this.accounts.admin1).encodeABI()
    console.log("data: ",data)
    console.log("constant: ",constants.HashZero)
    await expect(timelockController.schedule(
        this.oddzAdministrator.address,
        0,
       data,
       constants.HashZero, // predecessor
       constants.HashZero, // salt
       65
    )).to.emit(timelockController,"CallScheduled")
    await provider.send("evm_snapshot", []);
    // execution day + 1
    await provider.send("evm_increaseTime", [getExpiry(1)]);
    await expect(timelockController.execute(
      this.oddzAdministrator.address,
      0,
     data,
     constants.HashZero,
     constants.HashZero
  )).to.emit(timelockController,"CallExecuted")
  console.log("gasless: ", await this.oddzAdministrator.gaslessFacilitator())

   expect(await this.oddzAdministrator.gaslessFacilitator()).to.equal(this.accounts.admin1);

    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);

  });

  it("should update slippage -- using timelock controller methods effectively", async function () {
    const timelockController = await this.timeLockController.connect(this.signers.admin1);
    const web3 = new Web3(Web3.givenProvider);
    const contract= new web3.eth.Contract(this.oddzAdministratorAbi, this.oddzAdministrator.address)
    const slippage = 100; 
    const data = contract.methods.updateSlippage(slippage).encodeABI()
    const operationId = timelockController.hashOperation(
        this.oddzAdministrator.address,
        0,
      data,
      constants.HashZero, 
      constants.HashZero, 
    );
      console.log("operation id: ", operationId)
    const operationStatus = timelockController.isOperation(operationId);
    console.log("operation status: ", operationStatus);
    await expect(timelockController.schedule(
        this.oddzAdministrator.address,
        0,
       data,
       constants.HashZero, 
       constants.HashZero, 
       65
    )).to.emit(timelockController,"CallScheduled")
    await provider.send("evm_snapshot", []);
    // execution day + 1
    await provider.send("evm_increaseTime", [getExpiry(1)]);
    await expect(timelockController.execute(
      this.oddzAdministrator.address,
      0,
     data,
     constants.HashZero,
     constants.HashZero
  )).to.emit(timelockController,"CallExecuted")
      console.log("slippage: ", await this.oddzAdministrator.slippage())
   expect(await this.oddzAdministrator.slippage()).to.equal(slippage);

    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);

  });


  

  


  
}
