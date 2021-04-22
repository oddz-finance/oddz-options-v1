import { expect } from "chai";
import { BigNumber, utils, constants } from "ethers";
import { getExpiry, addDaysAndGetSeconds, addSnapshotCount } from "../../test-utils";
import { waffle } from "hardhat";
const provider = waffle.provider;

const date = Date.parse(new Date().toISOString().slice(0, 10)) / 1000;

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
    await expect(liquidityManager.addLiquidity(depositAmount, this.accounts.admin)).to.emit(
      liquidityManager,
      "AddLiquidity",
    );
    expect((await liquidityManager.lpBalanceMap(this.accounts.admin, 0)).transactionValue.toNumber()).to.equal(
      depositAmount,
    );
    const availableBalance = await liquidityManager.availableBalance();
    expect(availableBalance.toNumber()).to.equal(depositAmount);

    await expect(liquidityManager.addLiquidity(depositAmount, this.accounts.admin)).to.emit(
      liquidityManager,
      "AddLiquidity",
    );
    expect((await liquidityManager.lpBalanceMap(this.accounts.admin, 1)).transactionValue.toNumber()).to.equal(
      depositAmount,
    );

    const newavailableBalance = await liquidityManager.availableBalance();
    expect(newavailableBalance.toNumber()).to.equal(depositAmount + depositAmount);
    expect(await liquidityManager.daysActiveLiquidity(BigNumber.from(date))).to.equal(2000);

    expect((await liquidityManager.lpBalanceMap(this.accounts.admin, 1)).currentBalance.toNumber()).to.equal(
      depositAmount * 2,
    );
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
    await expect(liquidityManager.addLiquidity(depositAmount, this.accounts.admin)).to.emit(
      liquidityManager,
      "AddLiquidity",
    );
    const withdrawalAmount = 1001;
    await expect(liquidityManager.removeLiquidity(BigNumber.from(withdrawalAmount))).to.be.revertedWith(
      "Not enough funds on the pool contract. Please lower the amount",
    );
  });

  it("should allow withdraw when the pool has sufficient balance", async function () {
    const liquidityManager = await this.oddzLiquidityPool.connect(this.signers.admin);
    const depositAmount = 1000;
    await expect(liquidityManager.addLiquidity(depositAmount, this.accounts.admin)).to.emit(
      liquidityManager,
      "AddLiquidity",
    );
    const withdrawalAmount = 800;
    await expect(liquidityManager.removeLiquidity(BigNumber.from(withdrawalAmount))).to.emit(
      liquidityManager,
      "RemoveLiquidity",
    );
    expect(await liquidityManager.daysActiveLiquidity(BigNumber.from(date))).to.equal(200);
  });

  it("Should not update premium eligibility if the date is less than the current date", async function () {
    const liquidityManager = await this.oddzLiquidityPool.connect(this.signers.admin);
    const depositAmount = 1000;
    await expect(liquidityManager.addLiquidity(depositAmount, this.accounts.admin)).to.emit(
      liquidityManager,
      "AddLiquidity",
    );
    await expect(liquidityManager.updatePremiumEligibility(Math.round(Date.now() / 1000))).to.be.revertedWith(
      "LP Error: Invalid Date",
    );
  });

  it("Should be able to successfully set Manager", async function () {
    const liquidityManager = await this.oddzLiquidityPool.connect(this.signers.admin);
    await expect(liquidityManager.setManager(this.mockOptionManager.address)).to.emit(liquidityManager, "RoleGranted");
  });

  it("Should throw Invalid manager address while set Manager", async function () {
    const liquidityManager = await this.oddzLiquidityPool.connect(this.signers.admin);
    await expect(liquidityManager.setManager(this.accounts.admin)).to.be.revertedWith("Invalid manager address");
  });

  it("Should throw sender must be an admin to grant while set Manager", async function () {
    const liquidityManager = await this.oddzLiquidityPool.connect(this.signers.admin1);
    await expect(liquidityManager.setManager(this.mockOptionManager.address)).to.be.revertedWith(
      "sender must be an admin to grant",
    );
  });

  it("Should be able to successfully remove Manager", async function () {
    const liquidityManager = await this.oddzLiquidityPool.connect(this.signers.admin);
    await liquidityManager.setManager(this.mockOptionManager.address);
    await expect(liquidityManager.removeManager(this.mockOptionManager.address)).to.emit(
      liquidityManager,
      "RoleRevoked",
    );
  });

  it("Should throw sender must be an admin to grant while remove Manager", async function () {
    const liquidityManager = await this.oddzLiquidityPool.connect(this.signers.admin1);
    await expect(liquidityManager.removeManager(this.mockOptionManager.address)).to.be.revertedWith(
      "sender must be an admin to revoke",
    );
  });

  it("Should be able to successfully lock pool", async function () {
    const liquidityManager = await this.oddzLiquidityPool.connect(this.signers.admin);
    const mockOptionManager = await this.mockOptionManager.connect(this.signers.admin);
    await liquidityManager.addLiquidity(BigNumber.from(utils.parseEther(this.transderTokenAmout)), this.accounts.admin);
    await liquidityManager.setManager(this.mockOptionManager.address);
    await expect(mockOptionManager.lock(0)).to.be.ok;
  });

  it("Should throw caller has no access to the method while lock pool", async function () {
    const liquidityManager = await this.oddzLiquidityPool.connect(this.signers.admin);
    const mockOptionManager = await this.mockOptionManager.connect(this.signers.admin);
    await liquidityManager.addLiquidity(BigNumber.from(utils.parseEther(this.transderTokenAmout)), this.accounts.admin);
    await expect(mockOptionManager.lock(0)).to.be.revertedWith("LP Error: caller has no access to the method");
  });

  it("Should be able to successfully unlock pool", async function () {
    const liquidityManager = await this.oddzLiquidityPool.connect(this.signers.admin);
    const mockOptionManager = await this.mockOptionManager.connect(this.signers.admin);
    await liquidityManager.addLiquidity(BigNumber.from(utils.parseEther(this.transderTokenAmout)), this.accounts.admin);
    await liquidityManager.setManager(this.mockOptionManager.address);
    await mockOptionManager.lock(0);
    await expect(mockOptionManager.unlock()).to.be.ok;
  });

  it("Should throw caller has no access to the method while unlock pool", async function () {
    const mockOptionManager = await this.mockOptionManager.connect(this.signers.admin);
    await expect(mockOptionManager.unlock()).to.be.revertedWith("LP Error: caller has no access to the method");
  });

  it("Should be able to successfully send token to user", async function () {
    const liquidityManager = await this.oddzLiquidityPool.connect(this.signers.admin);
    const mockOptionManager = await this.mockOptionManager.connect(this.signers.admin);
    await liquidityManager.addLiquidity(BigNumber.from(utils.parseEther(this.transderTokenAmout)), this.accounts.admin);
    await liquidityManager.setManager(this.mockOptionManager.address);
    await expect(mockOptionManager.send(this.accounts.admin, 10000000000)).to.emit(liquidityManager, "Profit");
  });
  it("Should be able to successfully send and emit loss event", async function () {
    const liquidityManager = await this.oddzLiquidityPool.connect(this.signers.admin);
    const mockOptionManager = await this.mockOptionManager.connect(this.signers.admin);
    await liquidityManager.addLiquidity(BigNumber.from(utils.parseEther(this.transderTokenAmout)), this.accounts.admin);
    await liquidityManager.setManager(this.mockOptionManager.address);
    await expect(mockOptionManager.send(this.accounts.admin, 10000000000000)).to.emit(liquidityManager, "Loss");
  });

  it("Should throw caller has no access to the method while send token to user", async function () {
    const mockOptionManager = await this.mockOptionManager.connect(this.signers.admin);
    await expect(mockOptionManager.send(this.accounts.admin, 10000000000)).to.be.revertedWith(
      "LP Error: caller has no access to the method",
    );
  });

  it("Should be able to successfully send UA token to user", async function () {
    const liquidityManager = await this.oddzLiquidityPool.connect(this.signers.admin);
    const mockOptionManager = await this.mockOptionManager.connect(this.signers.admin);
    await liquidityManager.addLiquidity(BigNumber.from(utils.parseEther(this.transderTokenAmout)), this.accounts.admin);
    await liquidityManager.setManager(this.mockOptionManager.address);
    await expect(mockOptionManager.sendUA(this.accounts.admin, 10000000000)).to.emit(liquidityManager, "Profit");
  });

  it("Should throw caller has no access to the method while send UA token to user", async function () {
    const mockOptionManager = await this.mockOptionManager.connect(this.signers.admin);
    await expect(mockOptionManager.sendUA(this.accounts.admin, 10000000000)).to.be.revertedWith(
      "LP Error: caller has no access to the method",
    );
  });

  it("Should revert for underflow operation while locking without add liquidty", async function () {
    const liquidityManager = await this.oddzLiquidityPool.connect(this.signers.admin);
    const mockOptionManager = await this.mockOptionManager.connect(this.signers.admin);
    await liquidityManager.setManager(this.mockOptionManager.address);
    await expect(mockOptionManager.lock(0)).to.be.revertedWith("revert");
  });

  it("Should revert for underflow operation while unlocking again", async function () {
    const liquidityManager = await this.oddzLiquidityPool.connect(this.signers.admin);
    const mockOptionManager = await this.mockOptionManager.connect(this.signers.admin);
    await liquidityManager.addLiquidity(BigNumber.from(utils.parseEther(this.transderTokenAmout)), this.accounts.admin);
    await liquidityManager.setManager(this.mockOptionManager.address);
    await mockOptionManager.lock(0);
    await expect(mockOptionManager.unlock()).to.be.ok;
    await expect(mockOptionManager.unlock()).to.be.revertedWith("revert");
  });

  it("Should use msg.sender instead of account sent for add liquidity", async function () {
    const liquidityManager = await this.oddzLiquidityPool.connect(this.signers.admin);
    const depositAmount = 1000;
    await expect(liquidityManager.addLiquidity(depositAmount, this.accounts.admin1))
      .to.emit(liquidityManager, "AddLiquidity")
      .withArgs(this.accounts.admin, depositAmount, depositAmount);
  });

  it("Should revert set sdk for non owner", async function () {
    const liquidityManager = await this.oddzLiquidityPool.connect(this.signers.admin1);
    await expect(liquidityManager.setSdk(this.mockOptionManager.address)).to.be.revertedWith(
      "LP Error: caller has no access to the method",
    );
  });

  it("Should revert set sdk for non contract address", async function () {
    const liquidityManager = await this.oddzLiquidityPool.connect(this.signers.admin);
    await expect(liquidityManager.setSdk(this.accounts.admin)).to.be.revertedWith("invalid SDK contract address");
  });

  it("Should set sdk for contract address", async function () {
    const liquidityManager = await this.oddzLiquidityPool.connect(this.signers.admin);
    await expect(liquidityManager.setSdk(this.mockOptionManager.address)).to.be.ok;
  });

  it("Should revert add liquidity for zero amount", async function () {
    const liquidityManager = await this.oddzLiquidityPool.connect(this.signers.admin);
    const depositAmount = 0;
    await expect(liquidityManager.addLiquidity(depositAmount, this.accounts.admin1)).to.be.revertedWith(
      "LP Error: Amount is too small",
    );
  });

  it("should revert remove liquidity for more than deposited", async function () {
    const liquidityManager = await this.oddzLiquidityPool.connect(this.signers.admin);
    let depositAmount = 1000;
    await liquidityManager.addLiquidity(depositAmount, this.accounts.admin);
    depositAmount = 10000;
    await liquidityManager.connect(this.signers.admin1).addLiquidity(depositAmount, this.accounts.admin1);
    const withdrawalAmount = 1001;
    await expect(liquidityManager.removeLiquidity(BigNumber.from(withdrawalAmount))).to.be.revertedWith(
      "LP Error: Amount is too large",
    );
  });

  it("should revert remove liquidity for invalid amount", async function () {
    const liquidityManager = await this.oddzLiquidityPool.connect(this.signers.admin);
    let depositAmount = 1000;
    await liquidityManager.addLiquidity(depositAmount, this.accounts.admin);
    depositAmount = 10000;
    await liquidityManager.connect(this.signers.admin1).addLiquidity(depositAmount, this.accounts.admin1);
    const withdrawalAmount = 0;
    await expect(liquidityManager.removeLiquidity(BigNumber.from(withdrawalAmount))).to.be.revertedWith(
      "LP Error: Amount is too small",
    );
  });

  it("Should revert lock liquidity with invalid id", async function () {
    const liquidityManager = await this.oddzLiquidityPool.connect(this.signers.admin);
    const mockOptionManager = await this.mockOptionManager.connect(this.signers.admin);
    await liquidityManager.addLiquidity(BigNumber.from(utils.parseEther(this.transderTokenAmout)), this.accounts.admin);
    await liquidityManager.setManager(this.mockOptionManager.address);
    await expect(mockOptionManager.lock(1)).to.be.revertedWith("LP Error: Invalid id");
  });
  it("Should return usd balance zero", async function () {
    const liquidityManager = await this.oddzLiquidityPool.connect(this.signers.admin);
    expect(await liquidityManager.usdBalanceOf(this.accounts.admin)).to.be.equal(0);
  });
  it("Should return usd balance of user", async function () {
    const liquidityManager = await this.oddzLiquidityPool.connect(this.signers.admin);
    const depositAmount = 1000;
    await liquidityManager.addLiquidity(depositAmount, this.accounts.admin);
    expect(await liquidityManager.usdBalanceOf(this.accounts.admin)).to.be.equal(depositAmount);
  });
  it("Should revert send for invalid address", async function () {
    const liquidityManager = await this.oddzLiquidityPool.connect(this.signers.admin);
    const mockOptionManager = await this.mockOptionManager.connect(this.signers.admin);
    await liquidityManager.addLiquidity(BigNumber.from(utils.parseEther(this.transderTokenAmout)), this.accounts.admin);
    await liquidityManager.setManager(this.mockOptionManager.address);
    await expect(mockOptionManager.send(constants.AddressZero, 10000000000)).to.be.revertedWith(
      "LP Error: Invalid address",
    );
  });

  it("Should revert setReqBalance for non owner", async function () {
    const liquidityManager = await this.oddzLiquidityPool.connect(this.signers.admin1);
    await expect(liquidityManager.setReqBalance(5)).to.be.revertedWith("caller has no access to the method");
  });

  it("Should revert setReqBalance for invalid value", async function () {
    const liquidityManager = await this.oddzLiquidityPool.connect(this.signers.admin);
    await expect(liquidityManager.setReqBalance(5)).to.be.revertedWith("LP Error: required balance valid range");
  });

  it("Should set setReqBalance", async function () {
    const liquidityManager = await this.oddzLiquidityPool.connect(this.signers.admin);
    await liquidityManager.setReqBalance(6);
    expect(await liquidityManager.reqBalance()).to.equal(6);
  });

  it("Should be able to remove liquidity, get premium ", async function () {
    const liquidityManager = await this.oddzLiquidityPool.connect(this.signers.admin);
    await liquidityManager.addLiquidity(BigNumber.from(utils.parseEther(this.transderTokenAmout)), this.accounts.admin);
    await liquidityManager.setManager(this.mockOptionManager.address);
    await this.mockOptionManager.lock(0);
    await provider.send("evm_snapshot", []);
    //execution day +2
    await provider.send("evm_increaseTime", [getExpiry(2)]);
    await this.mockOptionManager.unlock();
    await provider.send("evm_snapshot", []);
    //execution day +(2 +1)
    await provider.send("evm_increaseTime", [getExpiry(1)]);
    await expect(
      liquidityManager.addLiquidity(BigNumber.from(utils.parseEther(this.transderTokenAmout)), this.accounts.admin),
    ).to.emit(liquidityManager, "AddLiquidity");
    await liquidityManager.distributePremium(addDaysAndGetSeconds(2), [this.accounts.admin]);
    const removeAmount = BigNumber.from(utils.parseEther(this.transderTokenAmout)).div(1000);
    await expect(liquidityManager.removeLiquidity(removeAmount)).to.emit(liquidityManager, "RemoveLiquidity");
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);

    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);
  });
}
