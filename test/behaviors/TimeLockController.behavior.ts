import { expect } from "chai";
import Web3 from "Web3";
import { utils, constants } from "ethers";
import { DistributionPercentage, getExpiry, addSnapshotCount } from "../../test-utils";

import { waffle } from "hardhat";

const provider = waffle.provider;

export function shouldBehaveLikeTimeLockController(): void {
  it("should revert schedule for non proposer role", async function () {
    const timelockController = await this.timeLockController.connect(this.signers.admin);
    const web3 = new Web3(Web3.givenProvider);
    const contract = new web3.eth.Contract(this.oddzAdministratorAbi, this.oddzAdministrator.address);
    const distribution: DistributionPercentage = {
      gasless: 30,
      maintainer: 10,
      developer: 20,
      staker: 40,
    };
    const data = contract.methods.updateTxnDistribution(distribution).encodeABI();
    await expect(
      timelockController.schedule(this.oddzAdministrator.address, 0, data, constants.HashZero, constants.HashZero, 60),
    ).to.be.revertedWith("TimelockController: sender requires permission");
  });

  it("should revert schedule for less than min delay", async function () {
    const timelockController = await this.timeLockController.connect(this.signers.admin1);
    const web3 = new Web3(Web3.givenProvider);
    const contract = new web3.eth.Contract(this.oddzAdministratorAbi, this.oddzAdministrator.address);
    const distribution: DistributionPercentage = {
      gasless: 30,
      maintainer: 10,
      developer: 20,
      staker: 40,
    };
    const data = contract.methods.updateTxnDistribution(distribution).encodeABI();
    await expect(
      timelockController.schedule(this.oddzAdministrator.address, 0, data, constants.HashZero, constants.HashZero, 5),
    ).to.be.revertedWith("TimelockController: insufficient delay");
  });

  it("should revert execute for non executor role", async function () {
    const timelockController = await this.timeLockController.connect(this.signers.admin1);
    const timelockController1 = await this.timeLockController.connect(this.signers.admin);
    const web3 = new Web3(Web3.givenProvider);
    const contract = new web3.eth.Contract(this.oddzAdministratorAbi, this.oddzAdministrator.address);
    const distribution: DistributionPercentage = {
      gasless: 30,
      maintainer: 10,
      developer: 20,
      staker: 40,
    };
    const data = contract.methods.updateTxnDistribution(distribution).encodeABI();
    await expect(
      timelockController.schedule(this.oddzAdministrator.address, 0, data, constants.HashZero, constants.HashZero, 60),
    ).to.emit(timelockController, "CallScheduled");

    await expect(
      timelockController1.execute(this.oddzAdministrator.address, 0, data, constants.HashZero, constants.HashZero),
    ).to.be.revertedWith("TimelockController: sender requires permission");
  });

  it("should revert execute before the scheduled time", async function () {
    const timelockController = await this.timeLockController.connect(this.signers.admin1);
    const web3 = new Web3(Web3.givenProvider);
    const contract = new web3.eth.Contract(this.oddzAdministratorAbi, this.oddzAdministrator.address);
    const distribution: DistributionPercentage = {
      gasless: 30,
      maintainer: 10,
      developer: 20,
      staker: 40,
    };
    const data = contract.methods.updateTxnDistribution(distribution).encodeABI();
    await expect(
      timelockController.schedule(this.oddzAdministrator.address, 0, data, constants.HashZero, constants.HashZero, 60),
    ).to.emit(timelockController, "CallScheduled");

    await expect(
      timelockController.execute(this.oddzAdministrator.address, 0, data, constants.HashZero, constants.HashZero),
    ).to.be.revertedWith("TimelockController: operation is not ready");
  });

  it("should update transaction distribution percentage", async function () {
    const timelockController = await this.timeLockController.connect(this.signers.admin1);
    const web3 = new Web3(Web3.givenProvider);
    const contract = new web3.eth.Contract(this.oddzAdministratorAbi, this.oddzAdministrator.address);
    const distribution: DistributionPercentage = {
      gasless: 30,
      maintainer: 10,
      developer: 20,
      staker: 40,
    };
    const data = contract.methods.updateTxnDistribution(distribution).encodeABI();
    await expect(
      timelockController.schedule(
        this.oddzAdministrator.address,
        0,
        data,
        constants.HashZero, // predecessor
        constants.HashZero, // salt
        65,
      ),
    ).to.emit(timelockController, "CallScheduled");
    await provider.send("evm_snapshot", []);
    // execution day + 1
    await provider.send("evm_increaseTime", [getExpiry(1)]);
    await expect(
      timelockController.execute(this.oddzAdministrator.address, 0, data, constants.HashZero, constants.HashZero),
    ).to.emit(timelockController, "CallExecuted");
    let maintainer = 0;
    [, maintainer, , ,] = await this.oddzAdministrator.settlementDistribution();
    expect(maintainer).to.equal(10);

    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);
  });

  it("should update settlement distribution percentage", async function () {
    const timelockController = await this.timeLockController.connect(this.signers.admin1);
    const web3 = new Web3(Web3.givenProvider);
    const contract = new web3.eth.Contract(this.oddzAdministratorAbi, this.oddzAdministrator.address);
    const distribution: DistributionPercentage = {
      gasless: 30,
      maintainer: 10,
      developer: 20,
      staker: 40,
    };
    const data = contract.methods.updateSettlementDistribution(distribution).encodeABI();
    await expect(
      timelockController.schedule(
        this.oddzAdministrator.address,
        0,
        data,
        constants.HashZero, // predecessor
        constants.HashZero, // salt
        65,
      ),
    ).to.emit(timelockController, "CallScheduled");
    await provider.send("evm_snapshot", []);
    // execution day + 1
    await provider.send("evm_increaseTime", [getExpiry(1)]);
    await expect(
      timelockController.execute(this.oddzAdministrator.address, 0, data, constants.HashZero, constants.HashZero),
    ).to.emit(timelockController, "CallExecuted");

    let maintainer = 0;
    [, maintainer, , ,] = await this.oddzAdministrator.settlementDistribution();
    expect(maintainer).to.equal(10);

    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);
  });
}
