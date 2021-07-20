import { expect } from "chai";
import { BigNumber, utils } from "ethers";
import { getExpiry, OptionType, PoolTransfer, addSnapshotCount } from "../../test-utils";
import { waffle } from "hardhat";
import OddzDefaultPoolArtifact from "../../artifacts/contracts/Pool/OddzPools.sol/OddzDefaultPool.json";
import OddzEthUsdCallBS1PoolArtifact from "../../artifacts/contracts/Pool/OddzPools.sol/OddzEthUsdCallBS1Pool.json";

import { OddzDefaultPool, OddzEthUsdCallBS1Pool } from "../../typechain";

const { deployContract, provider } = waffle;

const addPoolsWithLiquidity = async (admin: any, oddzLiquidityPoolManager: any) => {
  const oddzDefaultPool = (await deployContract(admin, OddzDefaultPoolArtifact, [])) as OddzDefaultPool;
  const oddzEthUsdCallBS1Pool = (await deployContract(
    admin,
    OddzEthUsdCallBS1PoolArtifact,
    [],
  )) as OddzEthUsdCallBS1Pool;

  await oddzDefaultPool.transferOwnership(oddzLiquidityPoolManager.address);
  await oddzEthUsdCallBS1Pool.transferOwnership(oddzLiquidityPoolManager.address);

  // ETH Call
  await oddzLiquidityPoolManager
    .connect(admin)
    .mapPool("0xfcb06d25357ef01726861b30b0b83e51482db417", OptionType.Call, utils.formatBytes32String("B_S"), 1, [
      oddzDefaultPool.address,
      oddzEthUsdCallBS1Pool.address,
    ]);
  await oddzLiquidityPoolManager
    .connect(admin)
    .mapPool("0xfcb06d25357ef01726861b30b0b83e51482db417", OptionType.Call, utils.formatBytes32String("B_S"), 2, [
      oddzDefaultPool.address,
    ]);
  await oddzLiquidityPoolManager
    .connect(admin)
    .mapPool("0xfcb06d25357ef01726861b30b0b83e51482db417", OptionType.Call, utils.formatBytes32String("B_S"), 7, [
      oddzDefaultPool.address,
    ]);
  await oddzLiquidityPoolManager
    .connect(admin)
    .mapPool("0xfcb06d25357ef01726861b30b0b83e51482db417", OptionType.Call, utils.formatBytes32String("B_S"), 14, [
      oddzDefaultPool.address,
    ]);
  await oddzLiquidityPoolManager
    .connect(admin)
    .mapPool("0xfcb06d25357ef01726861b30b0b83e51482db417", OptionType.Call, utils.formatBytes32String("B_S"), 30, [
      oddzDefaultPool.address,
    ]);

  return {
    oddzDefaultPool: oddzDefaultPool,
    oddzEthUsdCallBS1Pool: oddzEthUsdCallBS1Pool,
  };
};

const getPoolTransferStruct = (source: any[], destination: any[], sAmount: BigNumber[], dAmount: BigNumber[]) => {
  const poolTransfer: PoolTransfer = {
    _source: source,
    _destination: destination,
    _sAmount: sAmount,
    _dAmount: dAmount,
  };

  return poolTransfer;
};

export function shouldBehaveLikeOddzStrategyManager(): void {
  it("should revert create strategy for no input pools provided", async function () {
    const oddzStrategyManager = await this.oddzStrategyManager.connect(this.signers.admin);
    await expect(
      oddzStrategyManager.createStrategy([], [], BigNumber.from(utils.parseEther("1000"))),
    ).to.be.revertedWith("SM Error: no pool selected for strategy");
  });

  it("should create strategy", async function () {
    const oddzStrategyManager = await this.oddzStrategyManager.connect(this.signers.admin);
    const liquidity = BigNumber.from(utils.parseEther("1000"));
    await this.usdcToken.approve(this.oddzLiquidityPoolManager.address, liquidity);
    const { oddzDefaultPool, oddzEthUsdCallBS1Pool } = await addPoolsWithLiquidity(
      this.signers.admin,
      this.oddzLiquidityPoolManager,
    );
    await expect(
      oddzStrategyManager.createStrategy([oddzDefaultPool.address, oddzEthUsdCallBS1Pool.address], [60, 40], liquidity),
    ).to.emit(oddzStrategyManager, "CreatedStrategy");

    expect(await this.usdcToken.balanceOf(this.oddzLiquidityPoolManager.address)).to.equal(liquidity);
    expect(await oddzDefaultPool.poolBalance()).to.equal(liquidity.mul(60).div(100));
    expect(await oddzEthUsdCallBS1Pool.poolBalance()).to.equal(liquidity.mul(40).div(100));
    const provider = await oddzDefaultPool.liquidityProvider(this.accounts.admin);
    expect(provider._amount).to.equal(liquidity.mul(60).div(100));
  });

  it("should revert create strategy for invalid pools", async function () {
    const oddzStrategyManager = await this.oddzStrategyManager.connect(this.signers.admin);
    const liquidity = BigNumber.from(utils.parseEther("1000"));

    await expect(
      oddzStrategyManager.createStrategy([this.accounts.admin, this.accounts.admin1], [60, 40], liquidity),
    ).to.be.revertedWith("Strategy Error: Invalid pool");
  });

  it("should add liquidity to the existing strategy", async function () {
    const oddzStrategyManager = await this.oddzStrategyManager.connect(this.signers.admin);
    const liquidity = BigNumber.from(utils.parseEther("1000"));
    await this.usdcToken.approve(this.oddzLiquidityPoolManager.address, liquidity);
    const { oddzDefaultPool, oddzEthUsdCallBS1Pool } = await addPoolsWithLiquidity(
      this.signers.admin,
      this.oddzLiquidityPoolManager,
    );
    await oddzStrategyManager.createStrategy(
      [oddzDefaultPool.address, oddzEthUsdCallBS1Pool.address],
      [60, 40],
      liquidity,
    );

    expect(await this.usdcToken.balanceOf(this.oddzLiquidityPoolManager.address)).to.equal(liquidity);
    const strategy = await oddzStrategyManager.latestStrategy();

    await this.usdcToken.approve(this.oddzLiquidityPoolManager.address, liquidity);
    await expect(oddzStrategyManager.addLiquidity(strategy, liquidity)).to.emit(oddzStrategyManager, "AddedLiquidity");
    expect(await this.usdcToken.balanceOf(this.oddzLiquidityPoolManager.address)).to.equal(liquidity.mul(2));

    const provider = await oddzDefaultPool.liquidityProvider(this.accounts.admin);
    expect(provider._amount).to.equal(liquidity.mul(60).div(100).mul(2));
  });

  it("should remove liquidity from the existing strategy", async function () {
    const oddzStrategyManager = await this.oddzStrategyManager.connect(this.signers.admin);
    const liquidity = BigNumber.from(utils.parseEther("1000"));
    await this.usdcToken.approve(this.oddzLiquidityPoolManager.address, liquidity);
    const { oddzDefaultPool, oddzEthUsdCallBS1Pool } = await addPoolsWithLiquidity(
      this.signers.admin,
      this.oddzLiquidityPoolManager,
    );
    await oddzStrategyManager.createStrategy(
      [oddzDefaultPool.address, oddzEthUsdCallBS1Pool.address],
      [60, 40],
      liquidity,
    );

    expect(await this.usdcToken.balanceOf(this.oddzLiquidityPoolManager.address)).to.equal(liquidity);
    await this.usdcToken.connect(this.signers.admin1).approve(this.oddzLiquidityPoolManager.address, liquidity);
    const strategy = await oddzStrategyManager.latestStrategy();
    await this.usdcToken.transfer(this.accounts.admin1, liquidity);
    await expect(oddzStrategyManager.connect(this.signers.admin1).addLiquidity(strategy, liquidity)).to.emit(
      oddzStrategyManager,
      "AddedLiquidity",
    );
    await expect(oddzStrategyManager.removeLiquidity(strategy)).to.emit(oddzStrategyManager, "RemovedLiquidity");
    expect(await this.usdcToken.balanceOf(this.oddzLiquidityPoolManager.address)).to.equal(liquidity);
  });

  it("should revert remove liquidity from the existing strategy to maintain the pool balance", async function () {
    const oddzStrategyManager = await this.oddzStrategyManager.connect(this.signers.admin);
    const liquidity = BigNumber.from(utils.parseEther("1000"));
    await this.usdcToken.approve(this.oddzLiquidityPoolManager.address, liquidity);
    const { oddzDefaultPool, oddzEthUsdCallBS1Pool } = await addPoolsWithLiquidity(
      this.signers.admin,
      this.oddzLiquidityPoolManager,
    );
    await oddzStrategyManager.createStrategy(
      [oddzDefaultPool.address, oddzEthUsdCallBS1Pool.address],
      [60, 40],
      liquidity,
    );

    expect(await this.usdcToken.balanceOf(this.oddzLiquidityPoolManager.address)).to.equal(liquidity);
    const strategy = await oddzStrategyManager.latestStrategy();

    await expect(oddzStrategyManager.removeLiquidity(strategy)).to.be.revertedWith(
      "LP Error: Not enough funds in the pool. Please lower the amount",
    );
  });

  it("should revert remove liquidity for less liquidity in pools", async function () {
    const oddzStrategyManager = await this.oddzStrategyManager.connect(this.signers.admin);
    const liquidity = BigNumber.from(utils.parseEther("1000"));
    await this.usdcToken.approve(this.oddzLiquidityPoolManager.address, liquidity);
    const { oddzDefaultPool, oddzEthUsdCallBS1Pool } = await addPoolsWithLiquidity(
      this.signers.admin,
      this.oddzLiquidityPoolManager,
    );
    await oddzStrategyManager.createStrategy(
      [oddzDefaultPool.address, oddzEthUsdCallBS1Pool.address],
      [60, 40],
      liquidity,
    );

    expect(await this.usdcToken.balanceOf(this.oddzLiquidityPoolManager.address)).to.equal(liquidity);
    const strategy = await oddzStrategyManager.latestStrategy();
    await this.usdcToken.transfer(this.accounts.admin1, liquidity);

    await this.usdcToken.connect(this.signers.admin1).approve(this.oddzLiquidityPoolManager.address, liquidity);

    await expect(oddzStrategyManager.connect(this.signers.admin1).addLiquidity(strategy, liquidity)).to.emit(
      oddzStrategyManager,
      "AddedLiquidity",
    );

    await expect(
      this.oddzLiquidityPoolManager.removeLiquidity(
        this.accounts.admin,
        oddzDefaultPool.address,
        BigNumber.from(utils.parseEther("400")),
      ),
    ).to.emit(oddzDefaultPool, "RemoveLiquidity");

    await expect(oddzStrategyManager.removeLiquidity(strategy)).to.be.revertedWith(
      "SM Error: one or more pools have less liquidity",
    );
  });

  it("should change strategy", async function () {
    const oddzStrategyManager = await this.oddzStrategyManager.connect(this.signers.admin);
    const liquidity = BigNumber.from(utils.parseEther("1000"));
    await this.usdcToken.approve(this.oddzLiquidityPoolManager.address, liquidity);
    const { oddzDefaultPool, oddzEthUsdCallBS1Pool } = await addPoolsWithLiquidity(
      this.signers.admin,
      this.oddzLiquidityPoolManager,
    );
    await oddzStrategyManager.createStrategy([oddzDefaultPool.address], [100], liquidity);
    expect(await this.usdcToken.balanceOf(this.oddzLiquidityPoolManager.address)).to.equal(liquidity);
    const oldStrategy = await oddzStrategyManager.latestStrategy();

    await provider.send("evm_snapshot", []);
    // execution day + 7
    await provider.send("evm_increaseTime", [getExpiry(7)]);
    const liquidity1 = BigNumber.from(utils.parseEther("10000"));
    await this.usdcToken.approve(this.oddzLiquidityPoolManager.address, liquidity1);

    await oddzStrategyManager.createStrategy([oddzEthUsdCallBS1Pool.address], [100], liquidity1);
    expect(await this.usdcToken.balanceOf(this.oddzLiquidityPoolManager.address)).to.equal(liquidity.add(liquidity1));
    const newStrategy = await oddzStrategyManager.latestStrategy();

    await this.usdcToken.connect(this.signers.admin1).approve(this.oddzLiquidityPoolManager.address, liquidity);
    await this.usdcToken.transfer(this.accounts.admin1, liquidity);
    await expect(oddzStrategyManager.connect(this.signers.admin1).addLiquidity(oldStrategy, liquidity)).to.emit(
      oddzStrategyManager,
      "AddedLiquidity",
    );

    await oddzStrategyManager.changeStrategy(oldStrategy, newStrategy);
    const lprovider = await oddzEthUsdCallBS1Pool.liquidityProvider(this.accounts.admin);
    expect(lprovider._amount).to.equal(liquidity.add(liquidity1));

    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);
  });

  it("should revert change strategy with in lpool move lockup", async function () {
    const oddzStrategyManager = await this.oddzStrategyManager.connect(this.signers.admin);
    const liquidity = BigNumber.from(utils.parseEther("1000"));

    await this.usdcToken.approve(this.oddzLiquidityPoolManager.address, liquidity);
    const { oddzDefaultPool, oddzEthUsdCallBS1Pool } = await addPoolsWithLiquidity(
      this.signers.admin,
      this.oddzLiquidityPoolManager,
    );
    await oddzStrategyManager.createStrategy([oddzDefaultPool.address], [100], liquidity);
    expect(await this.usdcToken.balanceOf(this.oddzLiquidityPoolManager.address)).to.equal(liquidity);
    const oldStrategy = await oddzStrategyManager.latestStrategy();

    const liquidity1 = BigNumber.from(utils.parseEther("10000"));
    await this.usdcToken.approve(this.oddzLiquidityPoolManager.address, liquidity1);

    await oddzStrategyManager.createStrategy([oddzEthUsdCallBS1Pool.address], [100], liquidity1);
    expect(await this.usdcToken.balanceOf(this.oddzLiquidityPoolManager.address)).to.equal(liquidity.add(liquidity1));
    const newStrategy = await oddzStrategyManager.latestStrategy();

    await this.usdcToken.approve(this.oddzLiquidityPoolManager.address, liquidity);

    await expect(
      this.oddzLiquidityPoolManager.addLiquidity(this.accounts.admin, oddzDefaultPool.address, liquidity),
    ).to.emit(oddzDefaultPool, "AddLiquidity");

    const poolTransfer = await getPoolTransferStruct(
      [oddzDefaultPool.address],
      [oddzEthUsdCallBS1Pool.address],
      [BigNumber.from(utils.parseEther("500"))],
      [BigNumber.from(utils.parseEther("500"))],
    );
    await this.oddzLiquidityPoolManager.move(this.accounts.admin, poolTransfer);

    await expect(oddzStrategyManager.changeStrategy(oldStrategy, newStrategy)).to.be.revertedWith(
      "LP Error: Pool transfer not allowed",
    );
  });

  it("should revert change strategy for less liquidity in pools", async function () {
    const oddzStrategyManager = await this.oddzStrategyManager.connect(this.signers.admin);
    const liquidity = BigNumber.from(utils.parseEther("1000"));

    await this.usdcToken.approve(this.oddzLiquidityPoolManager.address, liquidity);
    const { oddzDefaultPool, oddzEthUsdCallBS1Pool } = await addPoolsWithLiquidity(
      this.signers.admin,
      this.oddzLiquidityPoolManager,
    );
    await oddzStrategyManager.createStrategy([oddzDefaultPool.address], [100], liquidity);
    expect(await this.usdcToken.balanceOf(this.oddzLiquidityPoolManager.address)).to.equal(liquidity);
    const oldStrategy = await oddzStrategyManager.latestStrategy();

    const liquidity1 = BigNumber.from(utils.parseEther("10000"));
    await this.usdcToken.approve(this.oddzLiquidityPoolManager.address, liquidity1);

    await oddzStrategyManager.createStrategy([oddzEthUsdCallBS1Pool.address], [100], liquidity1);
    expect(await this.usdcToken.balanceOf(this.oddzLiquidityPoolManager.address)).to.equal(liquidity.add(liquidity1));
    const newStrategy = await oddzStrategyManager.latestStrategy();

    await this.usdcToken.transfer(this.accounts.admin1, liquidity);
    await this.usdcToken.connect(this.signers.admin1).approve(this.oddzLiquidityPoolManager.address, liquidity);

    await expect(
      this.oddzLiquidityPoolManager
        .connect(this.signers.admin1)
        .addLiquidity(this.accounts.admin1, oddzDefaultPool.address, liquidity),
    ).to.emit(oddzDefaultPool, "AddLiquidity");
    await expect(
      this.oddzLiquidityPoolManager.removeLiquidity(
        this.accounts.admin,
        oddzDefaultPool.address,
        BigNumber.from(utils.parseEther("1000")),
      ),
    ).to.emit(oddzDefaultPool, "RemoveLiquidity");

    await expect(oddzStrategyManager.changeStrategy(oldStrategy, newStrategy)).to.be.revertedWith(
      "SM Error: one or more pools have less liquidity",
    );
  });
  it("should revert remove liquidity from the invalid contract", async function () {
    const oddzStrategyManager = await this.oddzStrategyManager.connect(this.signers.admin);
    await expect(oddzStrategyManager.removeLiquidity(this.accounts.admin)).to.be.revertedWith(
      "SM Error: strategy is not contract address",
    );
  });
  it("should change strategy for multiple pools", async function () {
    const oddzStrategyManager = await this.oddzStrategyManager.connect(this.signers.admin);
    const liquidity = BigNumber.from(utils.parseEther("1000"));

    await this.usdcToken.approve(this.oddzLiquidityPoolManager.address, liquidity);
    const { oddzDefaultPool, oddzEthUsdCallBS1Pool } = await addPoolsWithLiquidity(
      this.signers.admin,
      this.oddzLiquidityPoolManager,
    );

    await oddzStrategyManager.createStrategy(
      [oddzDefaultPool.address, oddzEthUsdCallBS1Pool.address],
      [60, 40],
      liquidity,
    );
    expect(await this.usdcToken.balanceOf(this.oddzLiquidityPoolManager.address)).to.equal(liquidity);
    const oldStrategy = await oddzStrategyManager.latestStrategy();

    const liquidity1 = BigNumber.from(utils.parseEther("10000"));
    await this.usdcToken.approve(this.oddzLiquidityPoolManager.address, liquidity1);

    await oddzStrategyManager.createStrategy(
      [oddzDefaultPool.address, oddzEthUsdCallBS1Pool.address],
      [60, 40],
      liquidity1,
    );
    expect(await this.usdcToken.balanceOf(this.oddzLiquidityPoolManager.address)).to.equal(liquidity.add(liquidity1));
    const newStrategy = await oddzStrategyManager.latestStrategy();

    await this.usdcToken.transfer(this.accounts.admin1, liquidity);
    await this.usdcToken.connect(this.signers.admin1).approve(this.oddzLiquidityPoolManager.address, liquidity);

    await expect(
      this.oddzLiquidityPoolManager
        .connect(this.signers.admin1)
        .addLiquidity(this.accounts.admin1, oddzDefaultPool.address, liquidity),
    ).to.emit(oddzDefaultPool, "AddLiquidity");
    await expect(
      this.oddzLiquidityPoolManager.removeLiquidity(
        this.accounts.admin,
        oddzDefaultPool.address,
        BigNumber.from(utils.parseEther("1000")),
      ),
    ).to.emit(oddzDefaultPool, "RemoveLiquidity");

    await expect(oddzStrategyManager.changeStrategy(oldStrategy, newStrategy)).to.emit(
      oddzStrategyManager,
      "ChangedStrategy",
    );
  });
}
