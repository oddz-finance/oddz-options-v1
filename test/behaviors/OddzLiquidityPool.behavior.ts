import { expect } from "chai";
import { BigNumber, ethers, utils } from "ethers";
import { OptionType } from "../../test-utils";
import exp from "constants";
import { waffle } from "hardhat";

const provider = waffle.provider;
const date = Date.parse(new Date().toISOString().slice(0, 10))/1000;

export function shouldBehaveLikeOddzLiquidityPool(): void {
  it("should return available balance and total balance. Both of them should be set to 0", async function () {
    const liquidityManager = await this.oddzLiquidityPool.connect(this.signers.admin);
    const totalBalance = await liquidityManager.totalBalance();
    const availableBalance = await liquidityManager.availableBalance();
    expect(availableBalance.toNumber()).to.equal(totalBalance.toNumber());
  });

  it("should allow deposit, emit AddLiquidity event and should update available balance", async function () {
    const liquidityManager = await this.oddzLiquidityPool.connect(this.signers.admin);
    const depositAmount = 1000;
    await expect(liquidityManager.addLiquidity({ value: depositAmount })).to.emit(liquidityManager, "AddLiquidity");
    const availableBalance = await liquidityManager.availableBalance();
    expect(availableBalance.toNumber()).to.equal(depositAmount);
    await expect(liquidityManager.addLiquidity({ value: depositAmount })).to.emit(liquidityManager, "AddLiquidity");
    const newavailableBalance = await liquidityManager.availableBalance();
    expect(newavailableBalance.toNumber()).to.equal(depositAmount + depositAmount);
    expect(await liquidityManager.daysActiveLiquidity(BigNumber.from(date))).to.equal(2000);
  });

  it("should not allow withdraw when the pool does not have sufficient balance", async function () {
    const liquidityManager = await this.oddzLiquidityPool.connect(this.signers.admin);
    const withdrawalAmount = 1000;
    await expect(liquidityManager.removeLiquidity(BigNumber.from(withdrawalAmount))).to.be.revertedWith(
      "LP Error: Not enough funds on the pool contract. Please lower the amount.",
    );
  });

  it("should not allow withdrawal when the the user is trying to withdraw more amount than deposited", async function () {
    const depositAmount = 1000;
    const liquidityManager = await this.oddzLiquidityPool.connect(this.signers.admin);
    await expect(liquidityManager.addLiquidity({ value: depositAmount })).to.emit(liquidityManager, "AddLiquidity");
    const liquidityManager1 = await this.oddzLiquidityPool.connect(this.signers.admin1);
    await expect(liquidityManager1.addLiquidity({ value: depositAmount })).to.emit(liquidityManager, "AddLiquidity");
    const withdrawalAmount = 1001;
    await expect(liquidityManager.removeLiquidity(BigNumber.from(withdrawalAmount))).to.be.revertedWith(
      "LP: Amount is too large",
    );
  });

  it("should allow withdraw when the pool has sufficient balance", async function () {
    const liquidityManager = await this.oddzLiquidityPool.connect(this.signers.admin);
    const depositAmount = 1000;
    await expect(liquidityManager.addLiquidity({ value: depositAmount })).to.emit(liquidityManager, "AddLiquidity");
    const withdrawalAmount = 1000;
    await expect(liquidityManager.removeLiquidity(BigNumber.from(withdrawalAmount))).to.emit(liquidityManager, "RemoveLiquidity");
    expect(await liquidityManager.daysActiveLiquidity(BigNumber.from(date))).to.equal(0);
  });
}
