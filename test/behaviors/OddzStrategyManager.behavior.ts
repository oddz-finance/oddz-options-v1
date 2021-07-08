import { expect } from "chai";
import { BigNumber, Contract, utils } from "ethers";
import { getExpiry, OptionType, TransactionType, PoolTransfer, addSnapshotCount } from "../../test-utils";
import { ethers, waffle } from "hardhat";
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

  it("should revert create strategy for no input pools provided", async function () {
    const oddzStrategyManager = await this.oddzStrategyManager.connect(this.signers.admin);
    await expect(
      oddzStrategyManager.createStrategy([], [], [], BigNumber.from(utils.parseEther("1000"))),
    ).to.be.revertedWith("SM Error: no pool selected for strategy");
  });

  it("should create strategy", async function () {
    const oddzStrategyManager = await this.oddzStrategyManager.connect(this.signers.admin);
    const liquidity = BigNumber.from(utils.parseEther("1000"));
    await this.usdcToken.approve(this.oddzStrategyManager.address, liquidity);
    const { oddzDefaultPool, oddzEthUsdCallBS1Pool } = await addPoolsWithLiquidity(
      this.signers.admin,
      this.oddzLiquidityPoolManager,
    );
    await expect(
      oddzStrategyManager.createStrategy(
        [oddzDefaultPool.address, oddzEthUsdCallBS1Pool.address],
        [60, 40],
        [liquidity.mul(60).div(100), liquidity.mul(40).div(100)],
        liquidity,
      ),
    )
      .to.emit(oddzStrategyManager, "CreatedStrategy")
      .to.emit(oddzStrategyManager, "AddedLiquidity");
    expect(await this.usdcToken.balanceOf(this.oddzLiquidityPoolManager.address)).to.equal(liquidity);
    expect(await oddzDefaultPool.poolBalance()).to.equal(liquidity.mul(60).div(100));
    expect(await oddzEthUsdCallBS1Pool.poolBalance()).to.equal(liquidity.mul(40).div(100));
  });

  it("should revert create strategy again within create lockup duration", async function () {
    const oddzStrategyManager = await this.oddzStrategyManager.connect(this.signers.admin);
    const liquidity = BigNumber.from(utils.parseEther("1000"));
    await this.usdcToken.approve(this.oddzStrategyManager.address, liquidity);
    const { oddzDefaultPool, oddzEthUsdCallBS1Pool } = await addPoolsWithLiquidity(
      this.signers.admin,
      this.oddzLiquidityPoolManager,
    );

    await expect(
      oddzStrategyManager.createStrategy(
        [oddzDefaultPool.address, oddzEthUsdCallBS1Pool.address],
        [60, 40],
        [liquidity.mul(60).div(100), liquidity.mul(40).div(100)],
        liquidity,
      ),
    )
      .to.emit(oddzStrategyManager, "CreatedStrategy")
      .to.emit(oddzStrategyManager, "AddedLiquidity");
    expect(await this.usdcToken.balanceOf(this.oddzLiquidityPoolManager.address)).to.equal(liquidity);
    await expect(
      oddzStrategyManager.createStrategy(
        [oddzDefaultPool.address, oddzEthUsdCallBS1Pool.address],
        [60, 40],
        [liquidity.mul(60).div(100), liquidity.mul(40).div(100)],
        liquidity,
      ),
    ).to.be.revertedWith("SM Error: Strategy creation not allowed within lockup duration");
  });

  it("should add liquidity to the existing strategy", async function () {
    const oddzStrategyManager = await this.oddzStrategyManager.connect(this.signers.admin);
    const liquidity = BigNumber.from(utils.parseEther("1000"));
    await this.usdcToken.approve(this.oddzStrategyManager.address, liquidity);
    const { oddzDefaultPool, oddzEthUsdCallBS1Pool } = await addPoolsWithLiquidity(
      this.signers.admin,
      this.oddzLiquidityPoolManager,
    );
    await oddzStrategyManager.createStrategy(
      [oddzDefaultPool.address, oddzEthUsdCallBS1Pool.address],
      [60, 40],
      [liquidity.mul(60).div(100), liquidity.mul(40).div(100)],
      liquidity,
    );

    expect(await this.usdcToken.balanceOf(this.oddzLiquidityPoolManager.address)).to.equal(liquidity);
    const strategy = await oddzStrategyManager.latestStrategy();

    await this.usdcToken.approve(this.oddzStrategyManager.address, liquidity);
    await expect(
      oddzStrategyManager.manageLiquidity(
        strategy,
        liquidity,
        [liquidity.mul(60).div(100), liquidity.mul(40).div(100)],
        TransactionType.ADD,
      ),
    ).to.emit(oddzStrategyManager, "AddedLiquidity");
    expect(await this.usdcToken.balanceOf(this.oddzLiquidityPoolManager.address)).to.equal(liquidity.mul(2));
  });

  it("should remove liquidity from the existing strategy", async function () {
    const oddzStrategyManager = await this.oddzStrategyManager.connect(this.signers.admin);
    const liquidity = BigNumber.from(utils.parseEther("1000"));
    await this.usdcToken.approve(this.oddzStrategyManager.address, liquidity);
    const { oddzDefaultPool, oddzEthUsdCallBS1Pool } = await addPoolsWithLiquidity(
      this.signers.admin,
      this.oddzLiquidityPoolManager,
    );
    await oddzStrategyManager.createStrategy(
      [oddzDefaultPool.address, oddzEthUsdCallBS1Pool.address],
      [60, 40],
      [liquidity.mul(60).div(100), liquidity.mul(40).div(100)],
      liquidity,
    );

    expect(await this.usdcToken.balanceOf(this.oddzLiquidityPoolManager.address)).to.equal(liquidity);
    const strategy = await oddzStrategyManager.latestStrategy();
    const removeLiquidity = BigNumber.from(utils.parseEther("800"));
    await expect(
      oddzStrategyManager.manageLiquidity(
        strategy,
        removeLiquidity,
        [removeLiquidity.mul(60).div(100), removeLiquidity.mul(40).div(100)],
        TransactionType.REMOVE,
      ),
    ).to.emit(oddzStrategyManager, "RemovedLiquidity");
    expect(await this.usdcToken.balanceOf(this.oddzLiquidityPoolManager.address)).to.equal(
      BigNumber.from(utils.parseEther("200")),
    );
  });

  it("should revert remove liquidity from the existing strategy to maintain the pool balance", async function () {
    const oddzStrategyManager = await this.oddzStrategyManager.connect(this.signers.admin);
    const liquidity = BigNumber.from(utils.parseEther("1000"));
    await this.usdcToken.approve(this.oddzStrategyManager.address, liquidity);
    const { oddzDefaultPool, oddzEthUsdCallBS1Pool } = await addPoolsWithLiquidity(
      this.signers.admin,
      this.oddzLiquidityPoolManager,
    );
    await oddzStrategyManager.createStrategy(
      [oddzDefaultPool.address, oddzEthUsdCallBS1Pool.address],
      [60, 40],
      [liquidity.mul(60).div(100), liquidity.mul(40).div(100)],
      liquidity,
    );

    expect(await this.usdcToken.balanceOf(this.oddzLiquidityPoolManager.address)).to.equal(liquidity);
    const strategy = await oddzStrategyManager.latestStrategy();
    const removeLiquidity1 = BigNumber.from(utils.parseEther("900"));

    await expect(
      oddzStrategyManager.manageLiquidity(
        strategy,
        removeLiquidity1,
        [removeLiquidity1.mul(60).div(100), removeLiquidity1.mul(40).div(100)],
        TransactionType.REMOVE,
      ),
    ).to.be.revertedWith("LP Error: Not enough funds in the pool. Please lower the amount");
    const removeLiquidity2 = BigNumber.from(utils.parseEther("800"));

    await expect(
      oddzStrategyManager.manageLiquidity(
        strategy,
        removeLiquidity2,
        [removeLiquidity2.mul(60).div(100), removeLiquidity2.mul(40).div(100)],
        TransactionType.REMOVE,
      ),
    ).to.emit(oddzStrategyManager, "RemovedLiquidity");
    expect(await this.usdcToken.balanceOf(this.oddzLiquidityPoolManager.address)).to.equal(
      BigNumber.from(utils.parseEther("200")),
    );
  });

  it("should change strategy", async function () {
    const oddzStrategyManager = await this.oddzStrategyManager.connect(this.signers.admin);
    const liquidity = BigNumber.from(utils.parseEther("1000"));
    await this.usdcToken.approve(this.oddzStrategyManager.address, liquidity);
    const { oddzDefaultPool, oddzEthUsdCallBS1Pool } = await addPoolsWithLiquidity(
      this.signers.admin,
      this.oddzLiquidityPoolManager,
    );
    await oddzStrategyManager.createStrategy(
      [oddzDefaultPool.address, oddzEthUsdCallBS1Pool.address],
      [60, 40],
      [liquidity.mul(60).div(100), liquidity.mul(40).div(100)],
      liquidity,
    );
    expect(await this.usdcToken.balanceOf(this.oddzLiquidityPoolManager.address)).to.equal(liquidity);
    const oldStrategy = await oddzStrategyManager.latestStrategy();

    await provider.send("evm_snapshot", []);
    // execution day + 7
    await provider.send("evm_increaseTime", [getExpiry(7)]);
    const liquidity1 = BigNumber.from(utils.parseEther("10000"));
    await this.usdcToken.approve(this.oddzStrategyManager.address, liquidity1);

    await oddzStrategyManager.createStrategy(
      [oddzDefaultPool.address, oddzEthUsdCallBS1Pool.address],
      [50, 50],
      [liquidity1.mul(60).div(100), liquidity1.mul(40).div(100)],
      liquidity1,
    );
    expect(await this.usdcToken.balanceOf(this.oddzLiquidityPoolManager.address)).to.equal(liquidity.add(liquidity1));
    const newStrategy = await oddzStrategyManager.latestStrategy();
    const strategyContract1: Contract = await ethers.getContractAt(this.oddzWriteStrategyAbi, oldStrategy);
    const strategyContract2: Contract = await ethers.getContractAt(this.oddzWriteStrategyAbi, newStrategy);
    const userLiquidity = await strategyContract1.userLiquidity(this.accounts.admin);
    const oldStrategyShare = [userLiquidity.mul(60).div(100), userLiquidity.mul(40).div(100)];
    const newStrategyShare = [userLiquidity.mul(50).div(100), userLiquidity.mul(50).div(100)];

    await oddzStrategyManager.changeStrategy(
      oldStrategy,
      newStrategy,
      userLiquidity,
      oldStrategyShare,
      newStrategyShare,
    );

    expect(await strategyContract1.userLiquidity(this.accounts.admin)).to.equal(BigNumber.from(utils.parseEther("0")));
    expect(await strategyContract2.userLiquidity(this.accounts.admin)).to.equal(
      BigNumber.from(utils.parseEther("11000")),
    );
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);
  });

  it("should revert change strategy for invalid shares", async function () {
    const oddzStrategyManager = await this.oddzStrategyManager.connect(this.signers.admin);
    const userLiquidity = BigNumber.from(utils.parseEther("1000"));
    const oldStrategyShare = [userLiquidity.mul(60).div(100), userLiquidity.mul(40).div(100)];
    // mock share < 100%
    const newStrategyShare = [userLiquidity.mul(50).div(100), userLiquidity.mul(40).div(100)];

    await provider.send("evm_snapshot", []);
    // execution day + 7
    await provider.send("evm_increaseTime", [getExpiry(7)]);

    // build mock method
    await expect(
      oddzStrategyManager.changeStrategy(
        oddzStrategyManager.address,
        oddzStrategyManager.address,
        userLiquidity,
        oldStrategyShare,
        newStrategyShare,
      ),
    ).to.be.revertedWith("SM Error: invalid strategy share to migrate");

    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);
  });

  it("should revert change strategy with in lpool move lockup", async function () {
    const oddzStrategyManager = await this.oddzStrategyManager.connect(this.signers.admin);
    const userLiquidity = BigNumber.from(utils.parseEther("1000"));
    // build mock shares
    const oldStrategyShare = [userLiquidity.mul(60).div(100), userLiquidity.mul(40).div(100)];
    const newStrategyShare = [userLiquidity.mul(50).div(100), userLiquidity.mul(50).div(100)];
    const { oddzDefaultPool, oddzEthUsdCallBS1Pool } = await addPoolsWithLiquidity(
      this.signers.admin,
      this.oddzLiquidityPoolManager,
    );

    await this.usdcToken.approve(this.oddzLiquidityPoolManager.address, userLiquidity);

    await expect(this.oddzLiquidityPoolManager.addLiquidity(oddzDefaultPool.address, userLiquidity)).to.emit(
      oddzDefaultPool,
      "AddLiquidity",
    );

    const poolTransfer = await getPoolTransferStruct(
      [oddzDefaultPool.address],
      [oddzEthUsdCallBS1Pool.address],
      [BigNumber.from(utils.parseEther("500"))],
      [BigNumber.from(utils.parseEther("500"))],
    );
    await this.oddzLiquidityPoolManager.move(poolTransfer);

    // build mock method
    await expect(
      oddzStrategyManager.changeStrategy(
        oddzStrategyManager.address,
        oddzStrategyManager.address,
        userLiquidity,
        oldStrategyShare,
        newStrategyShare,
      ),
    ).to.be.revertedWith("SM Error: Strategy changes not allowed within lockup duration");
  });
}
