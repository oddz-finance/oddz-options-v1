import { expect } from "chai";
import { BigNumber, constants, Contract, utils } from "ethers";
import { getExpiry, ManageStrategy } from "../../test-utils";
import { ethers } from "hardhat";

export function shouldBehaveLikeOddzStrategyManager(): void {
  it("should revert setting strategy create lockup duration for non owner", async function () {
    const oddzStrategyManager = await this.oddzStrategyManager.connect(this.signers.admin1);
    await expect(oddzStrategyManager.updateStrategyCreateLockupDuration(getExpiry(2))).to.be.revertedWith(
      "Ownable: caller is not the owner",
    );
  });

  it("should revert setting strategy create lockup duration for invalid value", async function () {
    const oddzStrategyManager = await this.oddzStrategyManager.connect(this.signers.admin);
    await expect(oddzStrategyManager.updateStrategyCreateLockupDuration(getExpiry(31))).to.be.revertedWith(
      "SM Error: invalid duration",
    );
  });

  it("should set strategy create lockup duration for owner", async function () {
    const oddzStrategyManager = await this.oddzStrategyManager.connect(this.signers.admin);
    await oddzStrategyManager.updateStrategyCreateLockupDuration(getExpiry(30));
    expect(await oddzStrategyManager.strategyCreateLockupDuration()).to.equal(getExpiry(30));
  });

  it("should revert setting strategy change lockup duration for non owner", async function () {
    const oddzStrategyManager = await this.oddzStrategyManager.connect(this.signers.admin1);
    await expect(oddzStrategyManager.updateStrategyChangeLockupDuration(getExpiry(2))).to.be.revertedWith(
      "Ownable: caller is not the owner",
    );
  });

  it("should revert setting strategy change lockup duration for invalid value", async function () {
    const oddzStrategyManager = await this.oddzStrategyManager.connect(this.signers.admin);
    await expect(oddzStrategyManager.updateStrategyChangeLockupDuration(getExpiry(31))).to.be.revertedWith(
      "SM Error: invalid duration",
    );
  });

  it("should set strategy change lockup duration for owner", async function () {
    const oddzStrategyManager = await this.oddzStrategyManager.connect(this.signers.admin);
    await oddzStrategyManager.updateStrategyChangeLockupDuration(getExpiry(30));
    expect(await oddzStrategyManager.strategyChangeLockupDuration()).to.equal(getExpiry(30));
  });

  it("should revert add pool for non owner", async function () {
    const oddzStrategyManager = await this.oddzStrategyManager.connect(this.signers.admin1);
    await expect(oddzStrategyManager.addPool(this.oddzDefaultPool.address)).to.be.revertedWith(
      "Ownable: caller is not the owner",
    );
  });
  it("should add pool for owner", async function () {
    const oddzStrategyManager = await this.oddzStrategyManager.connect(this.signers.admin);
    await oddzStrategyManager.addPool(this.oddzDefaultPool.address);
    expect(await oddzStrategyManager.validPools(this.oddzDefaultPool.address)).to.be.true;
  });

  it("should revert remove pool for non owner", async function () {
    const oddzStrategyManager = await this.oddzStrategyManager.connect(this.signers.admin1);
    await expect(oddzStrategyManager.removePool(this.oddzDefaultPool.address)).to.be.revertedWith(
      "Ownable: caller is not the owner",
    );
  });
  it("should remove pool for owner", async function () {
    const oddzStrategyManager = await this.oddzStrategyManager.connect(this.signers.admin);
    await oddzStrategyManager.removePool(this.oddzDefaultPool.address);
    expect(await oddzStrategyManager.validPools(this.oddzDefaultPool.address)).to.be.false;
  });

  it("should create strategy", async function () {
    const oddzStrategyManager = await this.oddzStrategyManager.connect(this.signers.admin);
    await oddzStrategyManager.addPool(this.oddzDefaultPool.address);
    await this.usdcToken.approve(this.oddzStrategyManager.address, BigNumber.from(utils.parseEther("1000")));
    await expect(
      oddzStrategyManager.createStrategy(
        [this.oddzDefaultPool.address],
        [100],
        BigNumber.from(utils.parseEther("1000")),
      ),
    )
      .to.emit(oddzStrategyManager, "CreatedStrategy")
      .to.emit(oddzStrategyManager, "AddedLiquidity");
    expect(await this.usdcToken.balanceOf(this.oddzLiquidityPoolManager.address)).to.equal(
      BigNumber.from(utils.parseEther("1000")),
    );
  });

  it("should revert deactivate strategy for zero address strategy", async function () {
    const oddzStrategyManager = await this.oddzStrategyManager.connect(this.signers.admin);
    await expect(
      oddzStrategyManager.manageStrategy(constants.AddressZero, ManageStrategy.DEACTIVATE),
    ).to.be.revertedWith("SM Error: strategy cannot be zero address");
  });

  it("should revert deactivate strategy for non contract address strategy", async function () {
    const oddzStrategyManager = await this.oddzStrategyManager.connect(this.signers.admin);
    await expect(oddzStrategyManager.manageStrategy(this.accounts.admin, ManageStrategy.DEACTIVATE)).to.be.revertedWith(
      "SM Error: strategy is not contract address",
    );
  });

  it("should revert deactivate strategy for non owner", async function () {
    const oddzStrategyManager = await this.oddzStrategyManager.connect(this.signers.admin1);
    await expect(oddzStrategyManager.manageStrategy(this.accounts.admin, ManageStrategy.DEACTIVATE)).to.be.revertedWith(
      "Ownable: caller is not the owner",
    );
  });

  it.only("should deactivate strategy for owner", async function () {
    const oddzStrategyManager = await this.oddzStrategyManager.connect(this.signers.admin);
    await oddzStrategyManager.addPool(this.oddzDefaultPool.address);
    await this.usdcToken.approve(this.oddzStrategyManager.address, BigNumber.from(utils.parseEther("1000")));
    await oddzStrategyManager.createStrategy(
      [this.oddzDefaultPool.address],
      [100],
      BigNumber.from(utils.parseEther("1000")),
    );
    expect(await this.usdcToken.balanceOf(this.oddzLiquidityPoolManager.address)).to.equal(
      BigNumber.from(utils.parseEther("1000")),
    );

    await oddzStrategyManager.manageStrategy("0x61c36a8d610163660e21a8b7359e1cac0c9133e1", ManageStrategy.DEACTIVATE);
    const strategyContract: Contract = await ethers.getContractAt(
      this.oddzWriteStrategyAbi,
      "0x61c36a8d610163660e21a8b7359e1cac0c9133e1",
    );
    expect(await strategyContract.isActive()).to.be.false;
  });
}
