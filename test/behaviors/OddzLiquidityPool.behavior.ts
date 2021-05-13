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
    await expect(
      liquidityManager.addLiquidity(this.oddzDefaultPool.address, depositAmount, this.accounts.admin),
    ).to.emit(defaultPool, "AddLiquidity");
    const availableBalance = await defaultPool.availableBalance();
    expect(availableBalance.toNumber()).to.equal(depositAmount);

    await expect(
      liquidityManager.addLiquidity(this.oddzDefaultPool.address, depositAmount, this.accounts.admin),
    ).to.emit(defaultPool, "AddLiquidity");

    const newavailableBalance = await defaultPool.availableBalance();
    expect(newavailableBalance.toNumber()).to.equal(depositAmount + depositAmount);
    expect(await defaultPool.daysActiveLiquidity(BigNumber.from(date))).to.equal(2000);
    expect((await defaultPool.lpBalanceMap(this.accounts.admin, 0)).currentBalance.toNumber()).to.equal(
      depositAmount * 2,
    );
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
    await expect(
      liquidityManager.addLiquidity(this.oddzDefaultPool.address, depositAmount, this.accounts.admin),
    ).to.emit(this.oddzDefaultPool, "AddLiquidity");
    const withdrawalAmount = 1001;
    await expect(
      liquidityManager.removeLiquidity(this.oddzDefaultPool.address, BigNumber.from(withdrawalAmount)),
    ).to.be.revertedWith("LP Error: Not enough funds in the pool. Please lower the amount.");
  });

  it("should allow withdraw when the pool has sufficient balance", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    const depositAmount = 1000;
    await expect(
      liquidityManager.addLiquidity(this.oddzDefaultPool.address, depositAmount, this.accounts.admin),
    ).to.emit(this.oddzDefaultPool, "AddLiquidity");
    const withdrawalAmount = 800;
    await expect(
      liquidityManager.removeLiquidity(this.oddzDefaultPool.address, BigNumber.from(withdrawalAmount)),
    ).to.emit(this.oddzDefaultPool, "RemoveLiquidity");
    expect(await this.oddzDefaultPool.connect(this.signers.admin).daysActiveLiquidity(BigNumber.from(date))).to.equal(
      200,
    );
  });

  it("should not update premium eligibility if the date is less than the current date", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    const depositAmount = 1000;
    await expect(
      liquidityManager.addLiquidity(this.oddzDefaultPool.address, depositAmount, this.accounts.admin),
    ).to.emit(this.oddzDefaultPool, "AddLiquidity");
    await expect(
      this.oddzDefaultPool.connect(this.signers.admin).enablePremiumDistribution(Math.round(Date.now() / 1000)),
    ).to.be.revertedWith("LP Error: Invalid Date");
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
      this.accounts.admin,
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
      this.accounts.admin,
    );
    await expect(mockOptionManager.lock(0)).to.be.revertedWith("LP Error: caller has no access to the method");
  });

  it("should be able to successfully unlock pool", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    const mockOptionManager = await this.mockOptionManager.connect(this.signers.admin);
    await liquidityManager.addLiquidity(
      this.oddzDefaultPool.address,
      BigNumber.from(utils.parseEther(this.transferTokenAmout)),
      this.accounts.admin,
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
      this.accounts.admin,
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
      this.accounts.admin,
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
      this.accounts.admin,
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
      this.accounts.admin,
    );
    await liquidityManager.setManager(this.mockOptionManager.address);
    await mockOptionManager.lock(0);
    await expect(mockOptionManager.unlock(0)).to.be.ok;
    await expect(mockOptionManager.unlock(0)).to.be.revertedWith("revert");
  });

  it("should use msg.sender instead of account sent for add liquidity", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    const depositAmount = 1000;
    await expect(liquidityManager.addLiquidity(this.oddzDefaultPool.address, depositAmount, this.accounts.admin1))
      .to.emit(this.oddzDefaultPool, "AddLiquidity")
      .withArgs(this.accounts.admin, depositAmount);
  });

  it("should revert set sdk for non owner", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin1);
    await expect(liquidityManager.setSdk(this.mockOptionManager.address)).to.be.revertedWith(
      "LP Error: caller has no access to the method",
    );
  });

  it("should revert set sdk for non contract address", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    await expect(liquidityManager.setSdk(this.accounts.admin)).to.be.revertedWith("invalid SDK contract address");
  });

  it("should set sdk for contract address", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    await expect(liquidityManager.setSdk(this.mockOptionManager.address)).to.be.ok;
    expect(await liquidityManager.sdk()).to.equal(this.mockOptionManager.address);
  });

  it("should revert add liquidity for zero amount", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    const depositAmount = 0;
    await expect(
      liquidityManager.addLiquidity(this.oddzDefaultPool.address, depositAmount, this.accounts.admin1),
    ).to.be.revertedWith("LP Error: Amount is too small");
  });

  it("should revert remove liquidity for more than deposited", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    let depositAmount = 1000;
    await liquidityManager.addLiquidity(this.oddzDefaultPool.address, depositAmount, this.accounts.admin);
    depositAmount = 10000;
    await liquidityManager
      .connect(this.signers.admin1)
      .addLiquidity(this.oddzDefaultPool.address, depositAmount, this.accounts.admin1);
    const withdrawalAmount = 1001;
    await expect(
      liquidityManager.removeLiquidity(this.oddzDefaultPool.address, BigNumber.from(withdrawalAmount)),
    ).to.be.revertedWith("LP Error: Amount is too large");
  });

  it("should revert remove liquidity for invalid amount", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    let depositAmount = 1000;
    await liquidityManager.addLiquidity(this.oddzDefaultPool.address, depositAmount, this.accounts.admin);
    depositAmount = 10000;
    await liquidityManager
      .connect(this.signers.admin1)
      .addLiquidity(this.oddzDefaultPool.address, depositAmount, this.accounts.admin1);
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
      this.accounts.admin,
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
    await liquidityManager.addLiquidity(this.oddzDefaultPool.address, depositAmount, this.accounts.admin);
    expect(await liquidityManager.usdBalanceOf(this.accounts.admin)).to.be.equal(depositAmount);
  });
  it("should revert send for invalid address", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    const mockOptionManager = await this.mockOptionManager.connect(this.signers.admin);
    await liquidityManager.addLiquidity(
      this.oddzDefaultPool.address,
      BigNumber.from(utils.parseEther(this.transferTokenAmout)),
      this.accounts.admin,
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
      this.accounts.admin,
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
        this.accounts.admin,
      ),
    ).to.emit(this.oddzDefaultPool, "AddLiquidity");
    await liquidityManager.distributePremium(
      addDaysAndGetSeconds(2),
      [this.accounts.admin],
      this.oddzDefaultPool.address,
    );
    expect(await this.oddzDefaultPool.connect(this.signers.admin).lpPremium(this.accounts.admin)).to.equal(
      "10000000000",
    );
    const removeAmount = BigNumber.from(utils.parseEther(this.transferTokenAmout)).div(1000);
    await expect(liquidityManager.removeLiquidity(this.oddzDefaultPool.address, removeAmount))
      .to.emit(this.oddzDefaultPool, "PremiumForfeited")
      .withArgs(this.accounts.admin, "5000000")
      .to.emit(this.oddzDefaultPool, "RemoveLiquidity")
      .withArgs(this.accounts.admin, "9999999999999994999659", "10000000000000000000000");
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);

    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);
  });

  it("should successfully get premium, remove liquidity after lockup", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    await liquidityManager.addLiquidity(
      this.oddzDefaultPool.address,
      BigNumber.from(utils.parseEther(this.transferTokenAmout)),
      this.accounts.admin,
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
    await expect(
      liquidityManager
        .connect(this.signers.admin1)
        .addLiquidity(
          this.oddzDefaultPool.address,
          BigNumber.from(utils.parseEther(this.transferTokenAmout)),
          this.accounts.admin1,
        ),
    ).to.emit(this.oddzDefaultPool, "AddLiquidity");

    await expect(
      liquidityManager.distributePremium(addDaysAndGetSeconds(2), [this.accounts.admin], this.oddzDefaultPool.address),
    )
      .to.emit(this.oddzDefaultPool, "PremiumCollected")
      .withArgs(this.accounts.admin, "10000000000");

    expect(await this.oddzDefaultPool.connect(this.signers.admin).lpPremium(this.accounts.admin)).to.equal("0");
    expect(await liquidityManager.balanceOf(this.accounts.admin)).to.equal(
      BigNumber.from(utils.parseEther(this.transferTokenAmout).add(BigNumber.from("10000000000"))),
    );
    const removeAmount = BigNumber.from(utils.parseEther(this.transferTokenAmout));
    await expect(liquidityManager.removeLiquidity(this.oddzDefaultPool.address, removeAmount))
      .to.emit(this.oddzDefaultPool, "RemoveLiquidity")
      .withArgs(this.accounts.admin, "9999999999999994999659580", "10000000000000000000000000");
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
      this.accounts.admin,
    );
    await liquidityManager.addLiquidity(
      this.oddzEthUsdCallBS1Pool.address,
      BigNumber.from(utils.parseEther(this.transferTokenAmout)),
      this.accounts.admin,
    );
    await liquidityManager.addLiquidity(
      this.oddzEthUsdCallBS14Pool.address,
      BigNumber.from(utils.parseEther(this.transferTokenAmout)),
      this.accounts.admin,
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

    await expect(
      liquidityManager.distributePremium(addDaysAndGetSeconds(2), [this.accounts.admin], this.oddzDefaultPool.address),
    )
      .to.emit(this.oddzDefaultPool, "PremiumCollected")
      .withArgs(this.accounts.admin, "3333333333");

    await expect(
      liquidityManager.distributePremium(
        addDaysAndGetSeconds(2),
        [this.accounts.admin],
        this.oddzEthUsdCallBS1Pool.address,
      ),
    )
      .to.emit(this.oddzEthUsdCallBS1Pool, "PremiumCollected")
      .withArgs(this.accounts.admin, "3333333333");

    await expect(
      liquidityManager.distributePremium(
        addDaysAndGetSeconds(2),
        [this.accounts.admin],
        this.oddzEthUsdCallBS14Pool.address,
      ),
    )
      .to.emit(this.oddzEthUsdCallBS14Pool, "PremiumCollected")
      .withArgs(this.accounts.admin, "3333333333");

    expect(await this.oddzDefaultPool.connect(this.signers.admin).lpPremium(this.accounts.admin)).to.equal("0");
    expect(await this.oddzEthUsdCallBS1Pool.connect(this.signers.admin).lpPremium(this.accounts.admin)).to.equal("0");
    expect(await this.oddzEthUsdCallBS14Pool.connect(this.signers.admin).lpPremium(this.accounts.admin)).to.equal("0");
    expect(await liquidityManager.balanceOf(this.accounts.admin)).to.equal(
      BigNumber.from(utils.parseEther("30000000").add(BigNumber.from("9999999999"))),
    );

    await liquidityManager.setReqBalance(10);

    const removeAmount = BigNumber.from(utils.parseEther(this.transferTokenAmout));
    await expect(liquidityManager.removeLiquidity(this.oddzDefaultPool.address, removeAmount))
      .to.emit(this.oddzDefaultPool, "RemoveLiquidity")
      .withArgs(this.accounts.admin, "9999999999999996666620420", "10000000000000000000000000");

    await expect(liquidityManager.removeLiquidity(this.oddzEthUsdCallBS1Pool.address, removeAmount))
      .to.emit(this.oddzEthUsdCallBS1Pool, "RemoveLiquidity")
      .withArgs(this.accounts.admin, "9999999999999996666620420", "10000000000000000000000000");

    await expect(liquidityManager.removeLiquidity(this.oddzEthUsdCallBS14Pool.address, removeAmount))
      .to.emit(this.oddzEthUsdCallBS14Pool, "RemoveLiquidity")
      .withArgs(this.accounts.admin, "9999999999999996666620420", "10000000000000000000000000");

    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);

    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);
  });

  it("should successfully move liquidity between pools", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    await liquidityManager.addLiquidity(
      this.oddzDefaultPool.address,
      BigNumber.from(utils.parseEther(this.transferTokenAmout)),
      this.accounts.admin,
    );

    await liquidityManager.addLiquidity(
      this.oddzEthUsdCallBS14Pool.address,
      BigNumber.from(utils.parseEther(this.transferTokenAmout)),
      this.accounts.admin,
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

  it("should revert with not enough funds while move liquidity between pools", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    await liquidityManager.addLiquidity(
      this.oddzDefaultPool.address,
      BigNumber.from(utils.parseEther(this.transferTokenAmout)),
      this.accounts.admin,
    );

    const poolTransfer = await getPoolTransferStruct(
      [this.oddzDefaultPool.address],
      [this.oddzEthUsdCallBS1Pool.address],
      [BigNumber.from(utils.parseEther(this.transferTokenAmout))],
      [BigNumber.from(utils.parseEther(this.transferTokenAmout))],
    );

    await expect(liquidityManager.move(poolTransfer)).to.be.revertedWith(
      "LP Error: Not enough funds in the pool. Please lower the transfer amount.",
    );
  });

  it("should distribute negative premium to LPs", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    const mockOptionManager = await this.mockOptionManager.connect(this.signers.admin);
    await liquidityManager.addLiquidity(
      this.oddzDefaultPool.address,
      BigNumber.from(utils.parseEther(this.transferTokenAmout)),
      this.accounts.admin,
    );
    await liquidityManager.setManager(this.mockOptionManager.address);
    await expect(mockOptionManager.send(this.accounts.admin, 10000000000000, 0)).to.emit(this.oddzDefaultPool, "Loss");

    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(1)]);

    await liquidityManager.distributePremium(
      addDaysAndGetSeconds(0),
      [this.accounts.admin],
      this.oddzDefaultPool.address,
    );

    expect(await this.oddzDefaultPool.connect(this.signers.admin).negativeLpBalance(this.accounts.admin)).to.be.equal(
      990000000000,
    );

    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);
  });
}
