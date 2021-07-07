import { expect } from "chai";
import { BigNumber, constants, Contract, utils } from "ethers";
import { getExpiry, ManageStrategy, TransactionType, addSnapshotCount } from "../../test-utils";
import { ethers, waffle } from "hardhat";

const provider = waffle.provider;

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

  it("should revert create strategy for no input pools provided", async function () {
    const oddzStrategyManager = await this.oddzStrategyManager.connect(this.signers.admin);
    await expect(
      oddzStrategyManager.createStrategy([], [], BigNumber.from(utils.parseEther("1000"))),
    ).to.be.revertedWith("SM Error: no pool selected for strategy");
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

  it("should revert create strategy again within create lockup duration", async function () {
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
    await expect(
      oddzStrategyManager.createStrategy(
        [this.oddzDefaultPool.address],
        [100],
        BigNumber.from(utils.parseEther("1000")),
      ),
    ).to.be.revertedWith("SM Error: Strategy creation not allowed within lockup duration");
  });

  it("should add liquidity to the existing strategy", async function () {
    const oddzStrategyManager = await this.oddzStrategyManager.connect(this.signers.admin);
    await oddzStrategyManager.addPool(this.oddzDefaultPool.address);
    await this.usdcToken.approve(this.oddzStrategyManager.address, BigNumber.from(utils.parseEther("1000")));
    await oddzStrategyManager.createStrategy(
      [this.oddzDefaultPool.address],
      [100],
      BigNumber.from(utils.parseEther("1000")),
    ),
      expect(await this.usdcToken.balanceOf(this.oddzLiquidityPoolManager.address)).to.equal(
        BigNumber.from(utils.parseEther("1000")),
      );
    const strategy = await oddzStrategyManager.latestStrategy();

    await this.usdcToken.approve(this.oddzStrategyManager.address, BigNumber.from(utils.parseEther("1000")));
    await expect(
      oddzStrategyManager.manageLiquidity(strategy, BigNumber.from(utils.parseEther("1000")), TransactionType.ADD),
    ).to.emit(oddzStrategyManager, "AddedLiquidity");
    expect(await this.usdcToken.balanceOf(this.oddzLiquidityPoolManager.address)).to.equal(
      BigNumber.from(utils.parseEther("2000")),
    );
  });

  it("should remove liquidity from the existing strategy", async function () {
    const oddzStrategyManager = await this.oddzStrategyManager.connect(this.signers.admin);
    await oddzStrategyManager.addPool(this.oddzDefaultPool.address);
    await this.usdcToken.approve(this.oddzStrategyManager.address, BigNumber.from(utils.parseEther("1000")));
    await oddzStrategyManager.createStrategy(
      [this.oddzDefaultPool.address],
      [100],
      BigNumber.from(utils.parseEther("1000")),
    ),
      expect(await this.usdcToken.balanceOf(this.oddzLiquidityPoolManager.address)).to.equal(
        BigNumber.from(utils.parseEther("1000")),
      );
    const strategy = await oddzStrategyManager.latestStrategy();
    await this.usdcToken.approve(this.oddzStrategyManager.address, BigNumber.from(utils.parseEther("1000")));
    await expect(
      oddzStrategyManager.manageLiquidity(strategy, BigNumber.from(utils.parseEther("800")), TransactionType.REMOVE),
    ).to.emit(oddzStrategyManager, "RemovedLiquidity");
    expect(await this.usdcToken.balanceOf(this.oddzLiquidityPoolManager.address)).to.equal(
      BigNumber.from(utils.parseEther("200")),
    );
  });

  it("should revert remove liquidity from the existing strategy to maintain the pool balance", async function () {
    const oddzStrategyManager = await this.oddzStrategyManager.connect(this.signers.admin);
    await oddzStrategyManager.addPool(this.oddzDefaultPool.address);
    await this.usdcToken.approve(this.oddzStrategyManager.address, BigNumber.from(utils.parseEther("1000")));
    await oddzStrategyManager.createStrategy(
      [this.oddzDefaultPool.address],
      [100],
      BigNumber.from(utils.parseEther("1000")),
    ),
      expect(await this.usdcToken.balanceOf(this.oddzLiquidityPoolManager.address)).to.equal(
        BigNumber.from(utils.parseEther("1000")),
      );
    const strategy = await oddzStrategyManager.latestStrategy();
    await this.usdcToken.approve(this.oddzStrategyManager.address, BigNumber.from(utils.parseEther("1000")));
    await expect(
      oddzStrategyManager.manageLiquidity(strategy, BigNumber.from(utils.parseEther("1000")), TransactionType.REMOVE),
    ).to.be.revertedWith("LP Error: Not enough funds in the pool. Please lower the amount");
    await expect(
      oddzStrategyManager.manageLiquidity(strategy, BigNumber.from(utils.parseEther("900")), TransactionType.REMOVE),
    ).to.be.revertedWith("LP Error: Not enough funds in the pool. Please lower the amount");
    await expect(
      oddzStrategyManager.manageLiquidity(strategy, BigNumber.from(utils.parseEther("800")), TransactionType.REMOVE),
    ).to.emit(oddzStrategyManager, "RemovedLiquidity");
    expect(await this.usdcToken.balanceOf(this.oddzLiquidityPoolManager.address)).to.equal(
      BigNumber.from(utils.parseEther("200")),
    );
  });

  it("should change strategy", async function () {
    const oddzStrategyManager = await this.oddzStrategyManager.connect(this.signers.admin);
    await oddzStrategyManager.addPool(this.oddzDefaultPool.address);
    await this.usdcToken.approve(this.oddzStrategyManager.address, BigNumber.from(utils.parseEther("1000")));
    await oddzStrategyManager.createStrategy(
      [this.oddzDefaultPool.address],
      [100],
      BigNumber.from(utils.parseEther("1000")),
    ),
      expect(await this.usdcToken.balanceOf(this.oddzLiquidityPoolManager.address)).to.equal(
        BigNumber.from(utils.parseEther("1000")),
      );
    const oldStrategy = await oddzStrategyManager.latestStrategy();

    await provider.send("evm_snapshot", []);
    // execution day + 3
    await provider.send("evm_increaseTime", [getExpiry(3)]);
    await this.usdcToken.approve(this.oddzStrategyManager.address, BigNumber.from(utils.parseEther("10000")));
    await oddzStrategyManager.createStrategy(
      [this.oddzDefaultPool.address],
      [100],
      BigNumber.from(utils.parseEther("10000")),
    ),
      expect(await this.usdcToken.balanceOf(this.oddzLiquidityPoolManager.address)).to.equal(
        BigNumber.from(utils.parseEther("11000")),
      );
    const newStrategy = await oddzStrategyManager.latestStrategy();

    await oddzStrategyManager.changeStrategy(oldStrategy, newStrategy);
    const strategyContract1: Contract = await ethers.getContractAt(this.oddzWriteStrategyAbi, oldStrategy);
    const strategyContract2: Contract = await ethers.getContractAt(this.oddzWriteStrategyAbi, newStrategy);
    expect(await strategyContract1.userLiquidity(this.accounts.admin)).to.equal(BigNumber.from(utils.parseEther("0")));
    expect(await strategyContract2.userLiquidity(this.accounts.admin)).to.equal(
      BigNumber.from(utils.parseEther("11000")),
    );
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);
  });
}
