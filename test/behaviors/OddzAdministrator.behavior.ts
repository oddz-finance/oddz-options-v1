import { expect } from "chai";
import { BigNumber, utils } from "ethers";
import { OddzAssetManager, MockERC20 } from "../../typechain";
import { DistributionPercentage, DepositType } from "../../test-utils";

import { Signer } from "@ethersproject/abstract-signer";

const addAssetPair = async (
  oddzAssetManager: OddzAssetManager,
  admin: Signer,
  usdcToken: MockERC20,
  oddzToken: MockERC20,
) => {
  const oam = await oddzAssetManager.connect(admin);
  await oam.addAsset(utils.formatBytes32String("USDC"), usdcToken.address, 8);
  await oam.addAsset(utils.formatBytes32String("ODDZ"), oddzToken.address, 8);
  await oam.addAssetPair(
    utils.formatBytes32String("ODDZ"),
    utils.formatBytes32String("USDC"),
    BigNumber.from(utils.parseEther("0.01")),
    2592000,
    86400,
  );
};

export function shouldBehaveLikeOddzAdministrator(): void {
  it("should revert set update minimum amount for non owner", async function () {
    const oddzAdministrator = await this.oddzAdministrator.connect(this.signers.admin1);
    await expect(oddzAdministrator.updateMinimumAmount(BigNumber.from(utils.parseEther("1100")))).to.be.revertedWith(
      "Ownable: caller is not the owner",
    );
  });

  it("should revert set update minimum amount for less than minimum amount range", async function () {
    const oddzAdministrator = await this.oddzAdministrator.connect(this.signers.admin);
    await expect(oddzAdministrator.updateMinimumAmount(BigNumber.from(utils.parseEther("999")))).to.be.revertedWith(
      "Administrator: invalid deposit amount",
    );
  });

  it("should set update minimum amount for valid amount", async function () {
    const oddzAdministrator = await this.oddzAdministrator.connect(this.signers.admin);
    await oddzAdministrator.updateMinimumAmount(BigNumber.from(utils.parseEther("1100")));
    expect(await oddzAdministrator.minimumAmount()).to.equal(BigNumber.from(utils.parseEther("1100")));
  });

  it("should revert set update minimum amount for more than minimum amount range", async function () {
    const oddzAdministrator = await this.oddzAdministrator.connect(this.signers.admin);
    await expect(oddzAdministrator.updateMinimumAmount(BigNumber.from(utils.parseEther("1000001")))).to.be.revertedWith(
      "Administrator: invalid deposit amount",
    );
  });

  it("should revert change gasless facililatator for non owner", async function () {
    const oddzAdministrator = await this.oddzAdministrator.connect(this.signers.admin1);
    await expect(oddzAdministrator.changeGaslessFacilitator(this.accounts.admin1)).to.be.revertedWith(
      "Ownable: caller is not the owner",
    );
  });

  it("should change gasless facililatator", async function () {
    const oddzAdministrator = await this.oddzAdministrator.connect(this.signers.admin);
    await oddzAdministrator.changeGaslessFacilitator(this.accounts.admin1);
    expect(await oddzAdministrator.gaslessFacilitator()).to.equal(this.accounts.admin1);
  });

  it("should revert change maintenance facililatator for non owner", async function () {
    const oddzAdministrator = await this.oddzAdministrator.connect(this.signers.admin1);
    await expect(oddzAdministrator.changeMaintenanceFacilitator(this.accounts.admin1)).to.be.revertedWith(
      "Ownable: caller is not the owner",
    );
  });

  it("should change maintenance facililatator", async function () {
    const oddzAdministrator = await this.oddzAdministrator.connect(this.signers.admin);
    await oddzAdministrator.changeMaintenanceFacilitator(this.accounts.admin);
    expect(await oddzAdministrator.maintenanceFacilitator()).to.equal(this.accounts.admin);
  });

  it("should revert update deadline for non owner", async function () {
    const oddzAdministrator = await this.oddzAdministrator.connect(this.signers.admin1);
    await expect(oddzAdministrator.updateDeadline(60)).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("should revert update deadline for invalid value", async function () {
    const oddzAdministrator = await this.oddzAdministrator.connect(this.signers.admin);
    await expect(oddzAdministrator.updateDeadline(31 * 60)).to.be.revertedWith("Administrator: invalid deadline");
  });

  it("should update deadline", async function () {
    const oddzAdministrator = await this.oddzAdministrator.connect(this.signers.admin);
    await oddzAdministrator.updateDeadline(30 * 60);
    expect(await oddzAdministrator.deadline()).to.equal(30 * 60);
  });

  it("should revert update slippage for non owner", async function () {
    const oddzAdministrator = await this.oddzAdministrator.connect(this.signers.admin1);
    await expect(oddzAdministrator.updateSlippage(60)).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("should revert update slippage for invalid value", async function () {
    const oddzAdministrator = await this.oddzAdministrator.connect(this.signers.admin);
    await expect(oddzAdministrator.updateSlippage(1001)).to.be.revertedWith("Administrator: invalid slippage");
  });

  it("should update slippage", async function () {
    const oddzAdministrator = await this.oddzAdministrator.connect(this.signers.admin);
    await oddzAdministrator.updateSlippage(1000);
    expect(await oddzAdministrator.slippage()).to.equal(1000);
  });

  it("should revert update txn distribution for non owner", async function () {
    const oddzAdministrator = await this.oddzAdministrator.connect(this.signers.admin1);
    const distribution: DistributionPercentage = {
      gasless: 40,
      maintainer: 0,
      developer: 20,
      staker: 40,
    };
    await expect(oddzAdministrator.updateTxnDistribution(distribution)).to.be.revertedWith(
      "Ownable: caller is not the owner",
    );
  });

  it("should revert update txn distribution for invalid value", async function () {
    const oddzAdministrator = await this.oddzAdministrator.connect(this.signers.admin);
    const distribution: DistributionPercentage = {
      gasless: 40,
      maintainer: 10,
      developer: 20,
      staker: 40,
    };
    await expect(oddzAdministrator.updateTxnDistribution(distribution)).to.be.revertedWith(
      "Administrator: invalid txn distribution",
    );
  });

  it("should update txn distribution", async function () {
    const oddzAdministrator = await this.oddzAdministrator.connect(this.signers.admin);
    const distribution: DistributionPercentage = {
      gasless: 30,
      maintainer: 10,
      developer: 20,
      staker: 40,
    };
    await oddzAdministrator.updateTxnDistribution(distribution);
    let maintainer = 0;
    [, maintainer, , ,] = await oddzAdministrator.txnDistribution();
    expect(maintainer).to.equal(10);
  });

  it("should revert update settlement distribution for non owner", async function () {
    const oddzAdministrator = await this.oddzAdministrator.connect(this.signers.admin1);
    const distribution: DistributionPercentage = {
      gasless: 40,
      maintainer: 0,
      developer: 20,
      staker: 40,
    };
    await expect(oddzAdministrator.updateSettlementDistribution(distribution)).to.be.revertedWith(
      "Ownable: caller is not the owner",
    );
  });

  it("should revert update settlement distribution for invalid value", async function () {
    const oddzAdministrator = await this.oddzAdministrator.connect(this.signers.admin);
    const distribution: DistributionPercentage = {
      gasless: 40,
      maintainer: 10,
      developer: 20,
      staker: 40,
    };
    await expect(oddzAdministrator.updateSettlementDistribution(distribution)).to.be.revertedWith(
      "Administrator: invalid settlement distribution",
    );
  });

  it("should update settlement distribution", async function () {
    const oddzAdministrator = await this.oddzAdministrator.connect(this.signers.admin);
    const distribution: DistributionPercentage = {
      gasless: 30,
      maintainer: 10,
      developer: 20,
      staker: 40,
    };
    await oddzAdministrator.updateSettlementDistribution(distribution);
    let maintainer = 0;
    [, maintainer, , ,] = await oddzAdministrator.settlementDistribution();
    expect(maintainer).to.equal(10);
  });

  it("should revert deposit for lower amount", async function () {
    const oddzAdministrator = await this.oddzAdministrator.connect(this.signers.admin);

    await expect(
      oddzAdministrator.deposit(BigNumber.from(utils.parseEther("999")), DepositType.Transaction),
    ).to.be.revertedWith("Administrator: amount is low for deposit");
  });

  it.only("should deposit amount of transaction type", async function () {
    const oddzAdministrator = await this.oddzAdministrator.connect(this.signers.admin);
    const usdcToken = await this.usdcToken.connect(this.signers.admin);

    await addAssetPair(this.oddzAssetManager, this.signers.admin, this.usdcToken, this.oddzToken);
    // const distribution: DistributionPercentage = {
    //   gasless: 50,
    //   maintainer: 50,
    //   developer: 0,
    //   staker: 0,
    // };
    //await oddzAdministrator.updateTxnDistribution(distribution);
    // ideally should deposit from optionManager
    await usdcToken.approve(this.oddzAdministrator.address, BigNumber.from(utils.parseEther("1000000")));
    await oddzAdministrator.deposit(BigNumber.from(utils.parseEther("1000")), DepositType.Transaction);
    // check balance of maintenance facilitator
    expect(await usdcToken.balanceOf(this.accounts.admin1)).to.equal(BigNumber.from(utils.parseEther("1000")).div(2));
  });

  it("should deposit amount of settlement type", async function () {
    const oddzAdministrator = await this.oddzAdministrator.connect(this.signers.admin);
    const usdcToken = await this.usdcToken.connect(this.signers.admin);

    await addAssetPair(this.oddzAssetManager, this.signers.admin, this.usdcToken, this.oddzToken);
    const distribution: DistributionPercentage = {
      gasless: 50,
      maintainer: 50,
      developer: 0,
      staker: 0,
    };
    await oddzAdministrator.updateSettlementDistribution(distribution);
    // ideally should deposit from optionManager
    await usdcToken.approve(this.oddzAdministrator.address, BigNumber.from(utils.parseEther("1000000")));
    await oddzAdministrator.deposit(BigNumber.from(utils.parseEther("1000")), DepositType.Settlement);
    // check balance of maintenance facilitator
    expect(await usdcToken.balanceOf(this.accounts.admin1)).to.equal(BigNumber.from(utils.parseEther("1000")).div(2));
  });
}
