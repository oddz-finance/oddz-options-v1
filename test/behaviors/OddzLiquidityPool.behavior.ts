import { expect } from "chai";
import { BigNumber, utils, constants } from "ethers";
import { OptionType, getExpiry, addDaysAndGetSeconds, addSnapshotCount, PoolTransfer } from "../../test-utils";
import { waffle } from "hardhat";
const provider = waffle.provider;

const date = Date.parse(new Date().toISOString().slice(0, 10)) / 1000;

const getPoolTransferStruct = (source: any[], destination: any[], sAmount: BigNumber[], dAmount: BigNumber[]) => {
  const poolTransfer: PoolTransfer = {
    _source: source,
    _destination: destination,
    _sAmount: sAmount,
    _dAmount: dAmount,
  };

  return poolTransfer;
};

export function shouldBehaveLikeOddzLiquidityPool(): void {
  it("should return available balance and total balance. Both of them should be set to 0", async function () {
    const defaultPool = await this.oddzDefaultPool.connect(this.signers.admin);
    const totalBalance = await defaultPool.totalBalance();
    const availableBalance = await defaultPool.availableBalance();
    expect(availableBalance.toNumber()).to.equal(totalBalance.toNumber());
  });

  it("should allow deposit, emit AddLiquidity event and should update available balance", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    const defaultPool = await this.oddzDefaultPool.connect(this.signers.admin);
    const depositAmount = 1000;
    await expect(liquidityManager.addLiquidity(this.oddzDefaultPool.address, depositAmount)).to.emit(
      defaultPool,
      "AddLiquidity",
    );
    const availableBalance = await defaultPool.availableBalance();
    expect(availableBalance.toNumber()).to.equal(depositAmount);

    await expect(liquidityManager.addLiquidity(this.oddzDefaultPool.address, depositAmount)).to.emit(
      defaultPool,
      "AddLiquidity",
    );

    const newavailableBalance = await defaultPool.availableBalance();
    expect(newavailableBalance.toNumber()).to.equal(depositAmount + depositAmount);
    expect(await defaultPool.daysActiveLiquidity(BigNumber.from(date))).to.equal(2000);
    expect((await defaultPool.liquidityProvider(this.accounts.admin))._amount.toNumber()).to.equal(depositAmount * 2);
  });

  it("should not allow withdraw when the pool does not have sufficient balance", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    const withdrawalAmount = 1000;
    await expect(
      liquidityManager.removeLiquidity(this.oddzDefaultPool.address, BigNumber.from(withdrawalAmount)),
    ).to.be.revertedWith("LP Error: Not enough funds in the pool. Please lower the amount.");
  });

  it("should not allow withdrawal when the the user is trying to withdraw more amount than deposited", async function () {
    const depositAmount = 1000;
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    await expect(liquidityManager.addLiquidity(this.oddzDefaultPool.address, depositAmount)).to.emit(
      this.oddzDefaultPool,
      "AddLiquidity",
    );
    const withdrawalAmount = 1001;
    await expect(
      liquidityManager.removeLiquidity(this.oddzDefaultPool.address, BigNumber.from(withdrawalAmount)),
    ).to.be.revertedWith("LP Error: Not enough funds in the pool. Please lower the amount.");
  });

  it("should allow withdraw when the pool has sufficient balance", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    const depositAmount = 1000;
    await expect(liquidityManager.addLiquidity(this.oddzDefaultPool.address, depositAmount)).to.emit(
      this.oddzDefaultPool,
      "AddLiquidity",
    );
    const withdrawalAmount = 800;
    await expect(
      liquidityManager.removeLiquidity(this.oddzDefaultPool.address, BigNumber.from(withdrawalAmount)),
    ).to.emit(this.oddzDefaultPool, "RemoveLiquidity");
    expect(await this.oddzDefaultPool.connect(this.signers.admin).daysActiveLiquidity(BigNumber.from(date))).to.equal(
      200,
    );
  });

  it("should be able to successfully set Manager", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    await expect(liquidityManager.setManager(this.mockOptionManager.address)).to.emit(liquidityManager, "RoleGranted");
  });

  it("should throw Invalid manager address while set Manager", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    await expect(liquidityManager.setManager(this.accounts.admin)).to.be.revertedWith("Invalid manager address");
  });

  it("should throw sender must be an admin to grant while set Manager", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin1);
    await expect(liquidityManager.setManager(this.mockOptionManager.address)).to.be.revertedWith(
      "sender must be an admin to grant",
    );
  });

  it("should be able to successfully remove Manager", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    await liquidityManager.setManager(this.mockOptionManager.address);
    await expect(liquidityManager.removeManager(this.mockOptionManager.address)).to.emit(
      liquidityManager,
      "RoleRevoked",
    );
  });

  it("should throw sender must be an admin to grant while remove Manager", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin1);
    await expect(liquidityManager.removeManager(this.mockOptionManager.address)).to.be.revertedWith(
      "sender must be an admin to revoke",
    );
  });

  it("should be able to successfully lock pool", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    const mockOptionManager = await this.mockOptionManager.connect(this.signers.admin);
    await liquidityManager.addLiquidity(
      this.oddzDefaultPool.address,
      BigNumber.from(utils.parseEther(this.transferTokenAmout)),
    );
    await liquidityManager.setManager(this.mockOptionManager.address);
    await expect(mockOptionManager.lock(0)).to.be.ok;
  });

  it("should throw caller has no access to the method while lock pool", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    const mockOptionManager = await this.mockOptionManager.connect(this.signers.admin);
    await liquidityManager.addLiquidity(
      this.oddzDefaultPool.address,
      BigNumber.from(utils.parseEther(this.transferTokenAmout)),
    );
    await expect(mockOptionManager.lock(0)).to.be.revertedWith("LP Error: caller has no access to the method");
  });

  it("should be able to successfully unlock pool", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    const mockOptionManager = await this.mockOptionManager.connect(this.signers.admin);
    await liquidityManager.addLiquidity(
      this.oddzDefaultPool.address,
      BigNumber.from(utils.parseEther(this.transferTokenAmout)),
    );
    await liquidityManager.setManager(this.mockOptionManager.address);
    await mockOptionManager.lock(0);
    await expect(mockOptionManager.unlock(0)).to.be.ok;
  });

  it("should throw caller has no access to the method while unlock pool", async function () {
    const mockOptionManager = await this.mockOptionManager.connect(this.signers.admin);
    await expect(mockOptionManager.unlock(0)).to.be.revertedWith("LP Error: caller has no access to the method");
  });

  it("should be able to successfully send token to user", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    const mockOptionManager = await this.mockOptionManager.connect(this.signers.admin);
    await liquidityManager.addLiquidity(
      this.oddzDefaultPool.address,
      BigNumber.from(utils.parseEther(this.transferTokenAmout)),
    );
    await liquidityManager.setManager(this.mockOptionManager.address);
    await expect(mockOptionManager.send(this.accounts.admin, 10000000000, 0)).to.emit(this.oddzDefaultPool, "Profit");
  });

  it("should be able to successfully send and emit loss event", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    const mockOptionManager = await this.mockOptionManager.connect(this.signers.admin);
    await liquidityManager.addLiquidity(
      this.oddzDefaultPool.address,
      BigNumber.from(utils.parseEther(this.transferTokenAmout)),
    );
    await liquidityManager.setManager(this.mockOptionManager.address);
    await expect(mockOptionManager.send(this.accounts.admin, 10000000000000, 0)).to.emit(this.oddzDefaultPool, "Loss");
  });

  it("should throw caller has no access to the method while send token to user", async function () {
    const mockOptionManager = await this.mockOptionManager.connect(this.signers.admin);
    await expect(mockOptionManager.send(this.accounts.admin, 10000000000, 0)).to.be.revertedWith(
      "LP Error: caller has no access to the method",
    );
  });

  it("should be able to successfully send UA token to user", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    const mockOptionManager = await this.mockOptionManager.connect(this.signers.admin);
    await liquidityManager.addLiquidity(
      this.oddzDefaultPool.address,
      BigNumber.from(utils.parseEther(this.transferTokenAmout)),
    );
    await liquidityManager.setManager(this.mockOptionManager.address);
    await expect(mockOptionManager.sendUA(this.accounts.admin, 10000000000, 0)).to.emit(this.oddzDefaultPool, "Profit");
  });

  it("should throw caller has no access to the method while send UA token to user", async function () {
    const mockOptionManager = await this.mockOptionManager.connect(this.signers.admin);
    await expect(mockOptionManager.sendUA(this.accounts.admin, 10000000000, 0)).to.be.revertedWith(
      "LP Error: caller has no access to the method",
    );
  });

  it("should revert for underflow operation while locking without add liquidty", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    const mockOptionManager = await this.mockOptionManager.connect(this.signers.admin);
    await liquidityManager.setManager(this.mockOptionManager.address);
    await expect(mockOptionManager.lock(0)).to.be.revertedWith("revert");
  });

  it("should revert for underflow operation while unlocking again", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    const mockOptionManager = await this.mockOptionManager.connect(this.signers.admin);
    await liquidityManager.addLiquidity(
      this.oddzDefaultPool.address,
      BigNumber.from(utils.parseEther(this.transferTokenAmout)),
    );
    await liquidityManager.setManager(this.mockOptionManager.address);
    await mockOptionManager.lock(0);
    await expect(mockOptionManager.unlock(0)).to.be.ok;
    await expect(mockOptionManager.unlock(0)).to.be.revertedWith("revert");
  });

  it("should revert add liquidity for zero amount", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    const depositAmount = 0;
    await expect(liquidityManager.addLiquidity(this.oddzDefaultPool.address, depositAmount)).to.be.revertedWith(
      "LP Error: Amount is too small",
    );
  });

  it("should revert remove liquidity for more than deposited", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    let depositAmount = 1000;
    await liquidityManager.addLiquidity(this.oddzDefaultPool.address, depositAmount);
    depositAmount = 10000;
    await liquidityManager.connect(this.signers.admin1).addLiquidity(this.oddzDefaultPool.address, depositAmount);
    const withdrawalAmount = 1001;
    await expect(
      liquidityManager.removeLiquidity(this.oddzDefaultPool.address, BigNumber.from(withdrawalAmount)),
    ).to.be.revertedWith("LP Error: Amount is too large");
  });

  it("should revert remove liquidity for invalid amount", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    let depositAmount = 1000;
    await liquidityManager.addLiquidity(this.oddzDefaultPool.address, depositAmount);
    depositAmount = 10000;
    await liquidityManager.connect(this.signers.admin1).addLiquidity(this.oddzDefaultPool.address, depositAmount);
    const withdrawalAmount = 0;
    await expect(
      liquidityManager.removeLiquidity(this.oddzDefaultPool.address, BigNumber.from(withdrawalAmount)),
    ).to.be.revertedWith("LP Error: Amount is too small");
  });

  it("should revert lock liquidity with invalid id", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    const mockOptionManager = await this.mockOptionManager.connect(this.signers.admin);
    await liquidityManager.addLiquidity(
      this.oddzDefaultPool.address,
      BigNumber.from(utils.parseEther(this.transferTokenAmout)),
    );
    await liquidityManager.setManager(this.mockOptionManager.address);
    await expect(mockOptionManager.lock(1)).to.be.revertedWith("LP Error: Invalid id");
  });
  it("should return usd balance zero", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    expect(await liquidityManager.usdBalanceOf(this.accounts.admin)).to.be.equal(0);
  });
  it("should return usd balance of user", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    const depositAmount = 1000;
    await liquidityManager.addLiquidity(this.oddzDefaultPool.address, depositAmount);
    expect(await liquidityManager.usdBalanceOf(this.accounts.admin)).to.be.equal(depositAmount);
  });
  it("should revert send for invalid address", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    const mockOptionManager = await this.mockOptionManager.connect(this.signers.admin);
    await liquidityManager.addLiquidity(
      this.oddzDefaultPool.address,
      BigNumber.from(utils.parseEther(this.transferTokenAmout)),
    );
    await liquidityManager.setManager(this.mockOptionManager.address);
    await expect(mockOptionManager.send(constants.AddressZero, 10000000000, 0)).to.be.revertedWith(
      "LP Error: Invalid address",
    );
  });

  it("should revert setReqBalance for non owner", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin1);
    await expect(liquidityManager.setReqBalance(5)).to.be.revertedWith("caller has no access to the method");
  });

  it("should revert setReqBalance for invalid value", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    await expect(liquidityManager.setReqBalance(5)).to.be.revertedWith("LP Error: required balance valid range");
  });

  it("should set setReqBalance", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    await liquidityManager.setReqBalance(6);
    expect(await liquidityManager.reqBalance()).to.equal(6);
  });

  it("should successfully remove liquidity while some part of premium will be forfeited", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    await liquidityManager.addLiquidity(
      this.oddzDefaultPool.address,
      BigNumber.from(utils.parseEther(this.transferTokenAmout)),
    );
    await liquidityManager.setManager(this.mockOptionManager.address);
    await this.mockOptionManager.lock(0);
    await provider.send("evm_snapshot", []);
    //execution day +2
    await provider.send("evm_increaseTime", [getExpiry(2)]);
    await this.mockOptionManager.unlock(0);
    await provider.send("evm_snapshot", []);
    //execution day +(2 +1)
    await provider.send("evm_increaseTime", [getExpiry(1)]);
    await expect(
      liquidityManager.addLiquidity(
        this.oddzDefaultPool.address,
        BigNumber.from(utils.parseEther(this.transferTokenAmout)),
      ),
    ).to.emit(this.oddzDefaultPool, "AddLiquidity");
    expect(
      (await this.oddzDefaultPool.connect(this.signers.admin).liquidityProvider(this.accounts.admin))._premiumAllocated,
    ).to.equal("10000000000");
    await this.oddzDefaultPool.connect(this.signers.admin).getDaysActiveLiquidity(addDaysAndGetSeconds(3));
    const removeAmount = BigNumber.from(utils.parseEther(this.transferTokenAmout)).div(1000);
    await expect(liquidityManager.removeLiquidity(this.oddzDefaultPool.address, removeAmount))
      .to.emit(this.oddzDefaultPool, "PremiumForfeited")
      .withArgs(this.accounts.admin, "5000000")
      .to.emit(this.oddzDefaultPool, "RemoveLiquidity")
      .withArgs(this.accounts.admin, "10000000000000000000000", "10000000000000000000000");
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);

    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);
  });

  it("should successfully get premium, remove liquidity after lockup", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    const amount = BigNumber.from(utils.parseEther(this.transferTokenAmout));
    await liquidityManager.addLiquidity(this.oddzDefaultPool.address, amount);
    await liquidityManager.setManager(this.mockOptionManager.address);
    await this.mockOptionManager.connect(this.signers.admin1).lock(0);
    await provider.send("evm_snapshot", []);
    //execution day +2
    await provider.send("evm_increaseTime", [getExpiry(2)]);
    await this.mockOptionManager.connect(this.signers.admin1).unlock(0);
    await provider.send("evm_snapshot", []);
    //execution day +(2 +15)
    await provider.send("evm_increaseTime", [getExpiry(15)]);
    await expect(
      liquidityManager
        .connect(this.signers.admin1)
        .addLiquidity(this.oddzDefaultPool.address, BigNumber.from(utils.parseEther(this.transferTokenAmout))),
    ).to.emit(this.oddzDefaultPool, "AddLiquidity");
    expect((await this.oddzDefaultPool.connect(this.signers.admin).getPremium(this.accounts.admin)).rewards).to.equal(
      "10000000000",
    );
    await expect(liquidityManager.removeLiquidity(this.oddzDefaultPool.address, amount))
      .to.emit(this.oddzDefaultPool, "RemoveLiquidity")
      .withArgs(this.accounts.admin, "10000000000000000000000000", "10000000000000000000000000");
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);

    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);
  });

  it("should not add duplicate pool to pool mapper", async function () {
    const hash = utils.keccak256(
      utils.defaultAbiCoder.encode(
        ["address", "uint256", "bytes32", "uint256"],
        ["0xfcb06d25357ef01726861b30b0b83e51482db417", 0, utils.formatBytes32String("B_S"), 7],
      ),
    );
    const oddzLiquidityPoolManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    expect(await oddzLiquidityPoolManager.poolMapper(hash, 0)).to.equal(this.oddzDefaultPool.address);
    await oddzLiquidityPoolManager.mapPool(
      "0xfcb06d25357ef01726861b30b0b83e51482db417",
      OptionType.Call,
      utils.formatBytes32String("B_S"),
      7,
      [this.oddzDefaultPool.address, this.oddzEthUsdCallBS30Pool.address, this.oddzDefaultPool.address],
    );
    expect(await oddzLiquidityPoolManager.poolMapper(hash, 0)).to.equal(this.oddzDefaultPool.address);
    expect(await oddzLiquidityPoolManager.poolMapper(hash, 1)).to.equal(this.oddzEthUsdCallBS30Pool.address);
    await expect(oddzLiquidityPoolManager.poolMapper(hash, 2)).to.be.reverted;
  });

  it("should revert pools length should be <= 10 while map pools", async function () {
    await expect(
      this.oddzLiquidityPoolManager
        .connect(this.signers.admin)
        .mapPool("0xfcb06d25357ef01726861b30b0b83e51482db417", OptionType.Call, utils.formatBytes32String("B_S"), 30, [
          this.oddzDefaultPool.address,
          this.oddzEthUsdCallBS30Pool.address,
          this.oddzDefaultPool.address,
          this.oddzDefaultPool.address,
          this.oddzDefaultPool.address,
          this.oddzDefaultPool.address,
          this.oddzDefaultPool.address,
          this.oddzDefaultPool.address,
          this.oddzDefaultPool.address,
          this.oddzDefaultPool.address,
          this.oddzDefaultPool.address,
        ]),
    ).to.be.revertedWith("LP Error: pools length should be <= 10");
  });

  it("should successfully get premium, remove liquidity after lockup for multiple pools", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    await liquidityManager.addLiquidity(
      this.oddzDefaultPool.address,
      BigNumber.from(utils.parseEther(this.transferTokenAmout)),
    );
    await liquidityManager.addLiquidity(
      this.oddzEthUsdCallBS1Pool.address,
      BigNumber.from(utils.parseEther(this.transferTokenAmout)),
    );
    await liquidityManager.addLiquidity(
      this.oddzEthUsdCallBS14Pool.address,
      BigNumber.from(utils.parseEther(this.transferTokenAmout)),
    );
    await liquidityManager.setManager(this.mockOptionManager.address);
    await this.mockOptionManager.connect(this.signers.admin1).lock(0);
    await provider.send("evm_snapshot", []);
    //execution day +2
    await provider.send("evm_increaseTime", [getExpiry(2)]);
    await this.mockOptionManager.connect(this.signers.admin1).unlock(0);
    await provider.send("evm_snapshot", []);
    //execution day +(2 +15)
    await provider.send("evm_increaseTime", [getExpiry(15)]);
    await this.oddzDefaultPool.connect(this.signers.admin).getDaysActiveLiquidity(addDaysAndGetSeconds(17));
    await this.oddzEthUsdCallBS1Pool.connect(this.signers.admin).getDaysActiveLiquidity(addDaysAndGetSeconds(17));
    await this.oddzEthUsdCallBS14Pool.connect(this.signers.admin).getDaysActiveLiquidity(addDaysAndGetSeconds(17));

    expect((await this.oddzDefaultPool.connect(this.signers.admin).getPremium(this.accounts.admin)).rewards).to.equal(
      "3333333333",
    );
    expect(
      (await this.oddzEthUsdCallBS1Pool.connect(this.signers.admin).getPremium(this.accounts.admin)).rewards,
    ).to.equal("3333333333");
    expect(
      (await this.oddzEthUsdCallBS14Pool.connect(this.signers.admin).getPremium(this.accounts.admin)).rewards,
    ).to.equal("3333333333");

    await liquidityManager.setReqBalance(10);

    await this.oddzDefaultPool.connect(this.signers.admin).getDaysActiveLiquidity(addDaysAndGetSeconds(3));
    const removeAmount = BigNumber.from(utils.parseEther(this.transferTokenAmout));
    await expect(liquidityManager.removeLiquidity(this.oddzDefaultPool.address, removeAmount))
      .to.emit(this.oddzDefaultPool, "RemoveLiquidity")
      .withArgs(this.accounts.admin, "10000000000000000000000000", "10000000000000000000000000");

    await expect(liquidityManager.removeLiquidity(this.oddzEthUsdCallBS1Pool.address, removeAmount))
      .to.emit(this.oddzEthUsdCallBS1Pool, "RemoveLiquidity")
      .withArgs(this.accounts.admin, "10000000000000000000000000", "10000000000000000000000000");

    await expect(liquidityManager.removeLiquidity(this.oddzEthUsdCallBS14Pool.address, removeAmount))
      .to.emit(this.oddzEthUsdCallBS14Pool, "RemoveLiquidity")
      .withArgs(this.accounts.admin, "10000000000000000000000000", "10000000000000000000000000");

    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);

    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);
  });

  it("should successfully move liquidity between pools", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    await liquidityManager.addLiquidity(
      this.oddzDefaultPool.address,
      BigNumber.from(utils.parseEther(this.transferTokenAmout)),
    );

    await liquidityManager.addLiquidity(
      this.oddzEthUsdCallBS14Pool.address,
      BigNumber.from(utils.parseEther(this.transferTokenAmout)),
    );

    const poolTransfer = await getPoolTransferStruct(
      [this.oddzDefaultPool.address, this.oddzEthUsdCallBS14Pool.address],
      [this.oddzEthUsdCallBS1Pool.address, this.oddzEthUsdCallBS30Pool.address, this.oddzBtcUsdCallBS1Pool.address],
      [BigNumber.from(utils.parseEther("8000000")), BigNumber.from(utils.parseEther("5000000"))],
      [
        BigNumber.from(utils.parseEther("5000000")),
        BigNumber.from(utils.parseEther("6000000")),
        BigNumber.from(utils.parseEther("2000000")),
      ],
    );

    await liquidityManager.move(poolTransfer);

    expect(await this.oddzEthUsdCallBS1Pool.connect(this.signers.admin).totalBalance()).to.be.equal(
      BigNumber.from(utils.parseEther("5000000")),
    );
    expect(await this.oddzEthUsdCallBS30Pool.connect(this.signers.admin).totalBalance()).to.be.equal(
      BigNumber.from(utils.parseEther("6000000")),
    );
    expect(await this.oddzBtcUsdCallBS1Pool.connect(this.signers.admin).totalBalance()).to.be.equal(
      BigNumber.from(utils.parseEther("2000000")),
    );
    expect(await this.oddzDefaultPool.connect(this.signers.admin).totalBalance()).to.be.equal(
      BigNumber.from(utils.parseEther("2000000")),
    );
    expect(await this.oddzEthUsdCallBS14Pool.connect(this.signers.admin).totalBalance()).to.be.equal(
      BigNumber.from(utils.parseEther("5000000")),
    );
  });

  it("should throw exceptions while moving liquidity between pools", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    await liquidityManager.addLiquidity(
      this.oddzDefaultPool.address,
      BigNumber.from(utils.parseEther(this.transferTokenAmout)),
    );

    const poolTransfer = await getPoolTransferStruct(
      [this.oddzDefaultPool.address],
      [this.oddzEthUsdCallBS1Pool.address],
      [BigNumber.from(utils.parseEther("1000000"))],
      [BigNumber.from(utils.parseEther("1000000"))],
    );

    await liquidityManager.move(poolTransfer);

    await expect(liquidityManager.move(poolTransfer)).to.be.revertedWith(
      "LP Error: Pool transfer available only once in 7 days",
    );

    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(7)]);
    await expect(liquidityManager.move(poolTransfer)).to.be.revertedWith(
      "LP Error: Pool transfer available only once in 7 days",
    );

    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(1)]);
    expect(await liquidityManager.move(poolTransfer)).to.be.ok;

    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);
  });

  it("should revert with not enough funds while move liquidity between pools", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    await liquidityManager.addLiquidity(
      this.oddzDefaultPool.address,
      BigNumber.from(utils.parseEther(this.transferTokenAmout)),
    );

    const poolTransfer = await getPoolTransferStruct(
      [this.oddzDefaultPool.address],
      [this.oddzEthUsdCallBS1Pool.address],
      [BigNumber.from(utils.parseEther(this.transferTokenAmout))],
      [BigNumber.from(utils.parseEther(this.transferTokenAmout))],
    );

    await expect(liquidityManager.move(poolTransfer)).to.be.revertedWith(
      "LP Error: Not enough funds in the pool. Please lower the amount.",
    );
  });

  it("should distribute negative premium to LPs", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    const mockOptionManager = await this.mockOptionManager.connect(this.signers.admin);
    await liquidityManager.addLiquidity(
      this.oddzDefaultPool.address,
      BigNumber.from(utils.parseEther(this.transferTokenAmout)),
    );
    await liquidityManager.setManager(this.mockOptionManager.address);
    await expect(mockOptionManager.send(this.accounts.admin, 10000000000000, 0)).to.emit(this.oddzDefaultPool, "Loss");

    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(2)]);

    await expect(
      liquidityManager.removeLiquidity(
        this.oddzDefaultPool.address,
        BigNumber.from(utils.parseEther(this.transferTokenAmout)),
      ),
    ).to.be.revertedWith("LP Error: Not enough funds in the pool. Please lower the amount.");

    await this.oddzDefaultPool.connect(this.signers.admin).getDaysActiveLiquidity(addDaysAndGetSeconds(2));

    const { rewards, isNegative } = await this.oddzDefaultPool
      .connect(this.signers.admin)
      .getPremium(this.accounts.admin);

    expect(rewards).to.equal("990000000000");
    expect(isNegative).to.equal(true);

    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);
  });

  it("should distribute negative premium to LPs while user has less existing premiums", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    const mockOptionManager = await this.mockOptionManager.connect(this.signers.admin);
    await liquidityManager.addLiquidity(
      this.oddzDefaultPool.address,
      BigNumber.from(utils.parseEther(this.transferTokenAmout)),
    );
    await liquidityManager.setManager(this.mockOptionManager.address);
    await mockOptionManager.lock(0);
    await mockOptionManager.unlock(0);

    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(1)]);

    // loss
    await mockOptionManager.send(this.accounts.admin, 10000000000000, 1);

    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(2)]);

    await this.oddzDefaultPool.connect(this.signers.admin).getDaysActiveLiquidity(addDaysAndGetSeconds(3));
    const { rewards, isNegative } = await this.oddzDefaultPool
      .connect(this.signers.admin)
      .getPremium(this.accounts.admin);

    expect(rewards).to.equal("980000000000");
    expect(isNegative).to.equal(true);

    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);
  });

  it("should distribute negative premium to LPs while user has more existing premiums", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    const mockOptionManager = await this.mockOptionManager.connect(this.signers.admin);
    await liquidityManager.addLiquidity(
      this.oddzDefaultPool.address,
      BigNumber.from(utils.parseEther(this.transferTokenAmout)),
    );
    await liquidityManager.setManager(this.mockOptionManager.address);
    await mockOptionManager.lock(0);
    await mockOptionManager.unlock(0);

    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(2)]);
    // loss
    await mockOptionManager.send(this.accounts.admin, 1000000000, 1);

    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(1)]);

    await this.oddzDefaultPool.connect(this.signers.admin).getDaysActiveLiquidity(addDaysAndGetSeconds(3));
    const { rewards, isNegative } = await this.oddzDefaultPool
      .connect(this.signers.admin)
      .getPremium(this.accounts.admin);

    expect(rewards).to.equal("19000000000");
    expect(isNegative).to.equal(false);

    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);
  });

  it("should withdraw premium successfully", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    const amount = BigNumber.from(utils.parseEther(this.transferTokenAmout));
    await liquidityManager.addLiquidity(this.oddzDefaultPool.address, amount);
    await liquidityManager.setManager(this.mockOptionManager.address);
    await this.mockOptionManager.connect(this.signers.admin1).lock(0);
    await provider.send("evm_snapshot", []);
    //execution day +2
    await provider.send("evm_increaseTime", [getExpiry(2)]);
    await this.mockOptionManager.connect(this.signers.admin1).unlock(0);
    await provider.send("evm_snapshot", []);
    //execution day +(2 +15)
    await provider.send("evm_increaseTime", [getExpiry(15)]);
    await expect(
      liquidityManager
        .connect(this.signers.admin1)
        .addLiquidity(this.oddzDefaultPool.address, BigNumber.from(utils.parseEther(this.transferTokenAmout))),
    ).to.emit(this.oddzDefaultPool, "AddLiquidity");
    expect((await this.oddzDefaultPool.connect(this.signers.admin).getPremium(this.accounts.admin)).rewards).to.equal(
      "10000000000",
    );
    await expect(liquidityManager.withdrawProfits(this.oddzDefaultPool.address))
      .to.emit(this.oddzDefaultPool, "PremiumCollected")
      .withArgs(this.accounts.admin, "10000000000");

    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);

    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);
  });

  it("should withdraw premium successfully while add liquidity", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    const amount = BigNumber.from(utils.parseEther(this.transferTokenAmout));
    await liquidityManager.addLiquidity(this.oddzDefaultPool.address, amount);
    await liquidityManager.setManager(this.mockOptionManager.address);
    await this.mockOptionManager.connect(this.signers.admin1).lock(0);
    await provider.send("evm_snapshot", []);
    //execution day +2
    await provider.send("evm_increaseTime", [getExpiry(2)]);
    await this.mockOptionManager.connect(this.signers.admin1).unlock(0);
    await provider.send("evm_snapshot", []);
    //execution day +(2 +15)
    await provider.send("evm_increaseTime", [getExpiry(15)]);
    await expect(
      liquidityManager
        .connect(this.signers.admin1)
        .addLiquidity(this.oddzDefaultPool.address, BigNumber.from(utils.parseEther(this.transferTokenAmout))),
    ).to.emit(this.oddzDefaultPool, "AddLiquidity");
    expect((await this.oddzDefaultPool.connect(this.signers.admin).getPremium(this.accounts.admin)).rewards).to.equal(
      "10000000000",
    );
    await expect(liquidityManager.addLiquidity(this.oddzDefaultPool.address, utils.parseEther("1000000")))
      .to.emit(this.oddzDefaultPool, "PremiumCollected")
      .withArgs(this.accounts.admin, "10000000000");
    expect((await this.oddzDefaultPool.connect(this.signers.admin).getPremium(this.accounts.admin)).rewards).to.equal(
      "0",
    );

    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);

    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);
  });
}
