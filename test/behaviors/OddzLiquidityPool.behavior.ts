import { expect } from "chai";
import { BigNumber, utils } from "ethers";

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
    await expect(liquidityManager.addLiquidity(depositAmount)).to.emit(liquidityManager, "AddLiquidity");
    expect((await liquidityManager.lpBalanceMap(this.accounts.admin, 0)).transactionValue.toNumber()).to.equal(
      depositAmount,
    );
    const availableBalance = await liquidityManager.availableBalance();
    expect(availableBalance.toNumber()).to.equal(depositAmount);

    await expect(liquidityManager.addLiquidity(depositAmount)).to.emit(liquidityManager, "AddLiquidity");
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
    await expect(liquidityManager.addLiquidity(depositAmount)).to.emit(liquidityManager, "AddLiquidity");
    const liquidityManager1 = await this.oddzLiquidityPool.connect(this.signers.admin1);
    await expect(liquidityManager1.addLiquidity(depositAmount)).to.emit(liquidityManager, "AddLiquidity");
    const withdrawalAmount = 1001;
    await expect(liquidityManager.removeLiquidity(BigNumber.from(withdrawalAmount))).to.be.revertedWith(
      "LP Error: Amount is too large",
    );
  });

  it("should allow withdraw when the pool has sufficient balance", async function () {
    const liquidityManager = await this.oddzLiquidityPool.connect(this.signers.admin);
    const depositAmount = 1000;
    await expect(liquidityManager.addLiquidity(depositAmount)).to.emit(liquidityManager, "AddLiquidity");
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
    await expect(liquidityManager.addLiquidity(depositAmount)).to.emit(liquidityManager, "AddLiquidity");
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
    await liquidityManager.addLiquidity(BigNumber.from(utils.parseEther(this.transderTokenAmout)));
    await liquidityManager.setManager(this.mockOptionManager.address);
    await expect(mockOptionManager.lock()).to.be.ok;
  });

  it("Should throw caller has no access to the method while lock pool", async function () {
    const liquidityManager = await this.oddzLiquidityPool.connect(this.signers.admin);
    const mockOptionManager = await this.mockOptionManager.connect(this.signers.admin);
    await liquidityManager.addLiquidity(BigNumber.from(utils.parseEther(this.transderTokenAmout)));
    await expect(mockOptionManager.lock()).to.be.revertedWith("LP Error: caller has no access to the method");
  });

  it("Should be able to successfully unlock pool", async function () {
    const liquidityManager = await this.oddzLiquidityPool.connect(this.signers.admin);
    const mockOptionManager = await this.mockOptionManager.connect(this.signers.admin);
    await liquidityManager.addLiquidity(BigNumber.from(utils.parseEther(this.transderTokenAmout)));
    await liquidityManager.setManager(this.mockOptionManager.address);
    await mockOptionManager.lock();
    await expect(mockOptionManager.unlock()).to.be.ok;
  });

  it("Should throw caller has no access to the method while unlock pool", async function () {
    const mockOptionManager = await this.mockOptionManager.connect(this.signers.admin);
    await expect(mockOptionManager.unlock()).to.be.revertedWith("LP Error: caller has no access to the method");
  });

  it("Should be able to successfully send token to user", async function () {
    const liquidityManager = await this.oddzLiquidityPool.connect(this.signers.admin);
    const mockOptionManager = await this.mockOptionManager.connect(this.signers.admin);
    await liquidityManager.addLiquidity(BigNumber.from(utils.parseEther(this.transderTokenAmout)));
    await liquidityManager.setManager(this.mockOptionManager.address);
    await expect(mockOptionManager.send(this.accounts.admin)).to.emit(liquidityManager, "Profit");
  });

  it("Should throw caller has no access to the method while send token to user", async function () {
    const mockOptionManager = await this.mockOptionManager.connect(this.signers.admin);
    await expect(mockOptionManager.send(this.accounts.admin)).to.be.revertedWith(
      "LP Error: caller has no access to the method",
    );
  });

  it("Should be able to successfully send UA token to user", async function () {
    const liquidityManager = await this.oddzLiquidityPool.connect(this.signers.admin);
    const mockOptionManager = await this.mockOptionManager.connect(this.signers.admin);
    await liquidityManager.addLiquidity(BigNumber.from(utils.parseEther(this.transderTokenAmout)));
    await liquidityManager.setManager(this.mockOptionManager.address);
    await expect(mockOptionManager.sendUA(this.accounts.admin)).to.emit(liquidityManager, "Profit");
  });

  it("Should throw caller has no access to the method while send UA token to user", async function () {
    const mockOptionManager = await this.mockOptionManager.connect(this.signers.admin);
    await expect(mockOptionManager.sendUA(this.accounts.admin)).to.be.revertedWith(
      "LP Error: caller has no access to the method",
    );
  });

  it("Should revert for underflow operation while locking without add liquidty", async function () {
    const liquidityManager = await this.oddzLiquidityPool.connect(this.signers.admin);
    const mockOptionManager = await this.mockOptionManager.connect(this.signers.admin);
    await liquidityManager.setManager(this.mockOptionManager.address);
    await expect(mockOptionManager.lock()).to.be.revertedWith("revert");
  });

  it("Should revert for underflow operation while unlocking again", async function () {
    const liquidityManager = await this.oddzLiquidityPool.connect(this.signers.admin);
    const mockOptionManager = await this.mockOptionManager.connect(this.signers.admin);
    await liquidityManager.addLiquidity(BigNumber.from(utils.parseEther(this.transderTokenAmout)));
    await liquidityManager.setManager(this.mockOptionManager.address);
    await mockOptionManager.lock();
    await expect(mockOptionManager.unlock()).to.be.ok;
    await expect(mockOptionManager.unlock()).to.be.revertedWith("revert");
  });
  
}
