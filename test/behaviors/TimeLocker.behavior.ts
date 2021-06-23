import { expect } from "chai";
import Web3 from "web3";
import { utils, constants } from "ethers";
import { DistributionPercentage, getExpiry, addSnapshotCount } from "../../test-utils";

import { waffle } from "hardhat";

const provider = waffle.provider;

export function shouldBehaveLikeTimeLocker(): void {
  it("should revert update txn distribution for default admin", async function () {
    const distribution: DistributionPercentage = {
      gasless: 30,
      maintainer: 10,
      developer: 20,
      staker: 40,
    };
    await this.oddzAdministrator.removeExecutor(this.accounts.admin);
    // keccak256("EXECUTOR_ROLE")
    const roleHash = "0xd8aa0f3194971a2a116679f7c2090f6939c8d4e01a2a8d7e41d55e5351469e63";
    expect(await this.oddzAdministrator.hasRole(roleHash, this.accounts.admin)).to.be.false;

    await expect(this.oddzAdministrator.updateTxnDistribution(distribution)).to.be.revertedWith(
      "caller has no access to the method",
    );
  });

  it("should revert setting role for default admin", async function () {
    await this.oddzAdministrator.removeExecutor(this.accounts.admin);

    // keccak256("EXECUTOR_ROLE")
    const roleHash = "0xd8aa0f3194971a2a116679f7c2090f6939c8d4e01a2a8d7e41d55e5351469e63";
    expect(await this.oddzAdministrator.hasRole(roleHash, this.accounts.admin)).to.be.false;

    await expect(this.oddzAdministrator.setExecutor(this.accounts.admin)).to.be.revertedWith(
      "AccessControl: sender must be an admin to grant",
    );
  });

  it("should update txn distribution for default admin", async function () {
    const distribution: DistributionPercentage = {
      gasless: 30,
      maintainer: 10,
      developer: 20,
      staker: 40,
    };
    // keccak256("EXECUTOR_ROLE")
    const roleHash = "0xd8aa0f3194971a2a116679f7c2090f6939c8d4e01a2a8d7e41d55e5351469e63";
    expect(await this.oddzAdministrator.hasRole(roleHash, this.accounts.admin)).to.be.true;

    await this.oddzAdministrator.updateTxnDistribution(distribution);
    let maintainer = 0;
    [, maintainer, , ,] = await this.oddzAdministrator.txnDistribution();
    expect(maintainer).to.equal(10);
  });

  it("should revert set proposer for non timelock admin role", async function () {
    const timeLocker = await this.timeLocker.connect(this.signers.admin1);
    await expect(timeLocker.setProposer(this.accounts.admin)).to.be.revertedWith(
      "TimelockController: sender requires permission",
    );
  });

  it("should set proposer for timelock admin role", async function () {
    const timeLocker = await this.timeLocker.connect(this.signers.admin);
    await timeLocker.setProposer(this.accounts.admin);
    // keccak256("PROPOSER_ROLE")
    const roleHash = "0xb09aa5aeb3702cfd50b6b62bc4532604938f21248a27a1d5ca736082b6819cc1";
    expect(await timeLocker.hasRole(roleHash, this.accounts.admin)).to.be.true;
  });

  it("should revert set executor for non timelock admin role", async function () {
    const timeLocker = await this.timeLocker.connect(this.signers.admin1);
    await expect(timeLocker.setExecutor(this.accounts.admin)).to.be.revertedWith(
      "TimelockController: sender requires permission",
    );
  });

  it("should set executor for timelock admin role", async function () {
    const timeLocker = await this.timeLocker.connect(this.signers.admin);
    await timeLocker.setExecutor(this.accounts.admin);
    // keccak256("EXECUTOR_ROLE")
    const roleHash = "0xd8aa0f3194971a2a116679f7c2090f6939c8d4e01a2a8d7e41d55e5351469e63";
    expect(await timeLocker.hasRole(roleHash, this.accounts.admin)).to.be.true;
  });

  it("should revert schedule for non proposer role", async function () {
    const timeLocker = await this.timeLocker.connect(this.signers.admin);
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
      timeLocker.schedule(this.oddzAdministrator.address, 0, data, constants.HashZero, constants.HashZero, 60),
    ).to.be.revertedWith("TimelockController: sender requires permission");
  });

  it("should revert schedule for less than min delay", async function () {
    const timeLocker = await this.timeLocker.connect(this.signers.admin1);
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
      timeLocker.schedule(this.oddzAdministrator.address, 0, data, constants.HashZero, constants.HashZero, 5),
    ).to.be.revertedWith("TimelockController: insufficient delay");
  });

  it("should revert execute for non executor role", async function () {
    const timeLocker = await this.timeLocker.connect(this.signers.admin1);
    const timeLocker1 = await this.timeLocker.connect(this.signers.admin);
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
      timeLocker.schedule(this.oddzAdministrator.address, 0, data, constants.HashZero, constants.HashZero, 60),
    ).to.emit(timeLocker, "CallScheduled");

    await expect(
      timeLocker1.execute(this.oddzAdministrator.address, 0, data, constants.HashZero, constants.HashZero),
    ).to.be.revertedWith("TimelockController: sender requires permission");
  });

  it("should revert execute before the scheduled time", async function () {
    const timeLocker = await this.timeLocker.connect(this.signers.admin1);
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
      timeLocker.schedule(this.oddzAdministrator.address, 0, data, constants.HashZero, constants.HashZero, 60),
    ).to.emit(timeLocker, "CallScheduled");

    await expect(
      timeLocker.execute(this.oddzAdministrator.address, 0, data, constants.HashZero, constants.HashZero),
    ).to.be.revertedWith("TimelockController: operation is not ready");
  });

  it("should update transaction distribution percentage", async function () {
    const timeLocker = await this.timeLocker.connect(this.signers.admin1);
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
      timeLocker.schedule(
        this.oddzAdministrator.address,
        0,
        data,
        constants.HashZero, // predecessor
        constants.HashZero, // salt
        65,
      ),
    ).to.emit(timeLocker, "CallScheduled");
    await provider.send("evm_snapshot", []);
    // execution day + 1
    await provider.send("evm_increaseTime", [getExpiry(1)]);
    await expect(
      timeLocker.execute(this.oddzAdministrator.address, 0, data, constants.HashZero, constants.HashZero),
    ).to.emit(timeLocker, "CallExecuted");
    let maintainer = 0;
    [, maintainer, , ,] = await this.oddzAdministrator.txnDistribution();
    expect(maintainer).to.equal(10);

    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);
  });

  it("should update settlement distribution percentage", async function () {
    const timeLocker = await this.timeLocker.connect(this.signers.admin1);
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
      timeLocker.schedule(
        this.oddzAdministrator.address,
        0,
        data,
        constants.HashZero, // predecessor
        constants.HashZero, // salt
        65,
      ),
    ).to.emit(timeLocker, "CallScheduled");
    await provider.send("evm_snapshot", []);
    // execution day + 1
    await provider.send("evm_increaseTime", [getExpiry(1)]);
    await expect(
      timeLocker.execute(this.oddzAdministrator.address, 0, data, constants.HashZero, constants.HashZero),
    ).to.emit(timeLocker, "CallExecuted");

    let maintainer = 0;
    [, maintainer, , ,] = await this.oddzAdministrator.settlementDistribution();
    expect(maintainer).to.equal(10);

    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);
  });
}
