import { expect } from "chai";
import { BigNumber, utils, constants } from "ethers";
import { getExpiry, DepositType, addSnapshotCount, addDaysAndGetSeconds } from "../../test-utils";
import { waffle } from "hardhat";
const provider = waffle.provider;

export function shouldBehaveLikeOddzStakingManager(): void {
  it("Should revert activating the token which is already active", async function () {
    const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin);
    await expect(oddzStakingManager.activateToken(this.oddzToken.address)).to.be.revertedWith(
      "token is already active",
    );
  });

  it("Should revert deactivate for non owner", async function () {
    const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin1);
    await expect(oddzStakingManager.deactivateToken(this.oddzToken.address)).to.be.revertedWith(
      "Ownable: caller is not the owner",
    );
  });

  it("Should successfully deactivate the token", async function () {
    const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin);
    await expect(oddzStakingManager.deactivateToken(this.oddzToken.address)).to.emit(
      oddzStakingManager,
      "TokenDeactivate",
    );
  });

  it("Should revert deactivate which is already deactivated", async function () {
    const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin);
    await oddzStakingManager.deactivateToken(this.oddzToken.address);
    await expect(oddzStakingManager.deactivateToken(this.oddzToken.address)).to.be.revertedWith("token is not active");
  });

  it("Should revert activate for non owner", async function () {
    const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin1);
    await expect(oddzStakingManager.activateToken(this.oddzToken.address)).to.be.revertedWith(
      "Ownable: caller is not the owner",
    );
  });

  it("Should successfully activate token", async function () {
    const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin);
    await oddzStakingManager.deactivateToken(this.oddzToken.address);
    await expect(oddzStakingManager.activateToken(this.oddzToken.address)).to.emit(oddzStakingManager, "TokenActivate");
  });

  it("Should revert setting lockup duration for the token by non owner", async function () {
    const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin1);
    await expect(oddzStakingManager.setLockupDuration(this.oddzToken.address, getExpiry(1))).to.be.revertedWith(
      "Ownable: caller is not the owner",
    );
  });

  it("Should revert setting lockup duration for invalid token", async function () {
    const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin);
    await expect(oddzStakingManager.setLockupDuration(constants.AddressZero, getExpiry(1))).to.be.revertedWith(
      "token not added",
    );
  });

  it("Should successfully set lockup duration for the token", async function () {
    const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin);
    await oddzStakingManager.setLockupDuration(this.oddzToken.address, getExpiry(1));
    const token = await oddzStakingManager.tokens(this.oddzToken.address);
    expect(token._lockupDuration).to.equal(getExpiry(1));
  });

  it("Should revert staking for zero token address", async function () {
    const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin);
    await expect(
      oddzStakingManager.stake(constants.AddressZero, BigNumber.from(utils.parseEther("10"))),
    ).to.be.revertedWith("token not added");
  });

  it("Should revert staking for invalid token address", async function () {
    const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin);
    await oddzStakingManager.deactivateToken(this.oddzToken.address);
    await expect(
      oddzStakingManager.stake(this.oddzToken.address, BigNumber.from(utils.parseEther("10"))),
    ).to.be.revertedWith("token is not active");
  });

  it("Should revert staking for invalid amount", async function () {
    const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin);
    await expect(oddzStakingManager.stake(this.oddzToken.address, 0)).to.be.revertedWith("invalid amount");
  });

  it("Should revert staking without any approved allowance", async function () {
    const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin);
    await expect(
      oddzStakingManager.stake(this.oddzToken.address, BigNumber.from(utils.parseEther("10"))),
    ).to.be.revertedWith("ERC20: transfer amount exceeds allowance");
  });

  it("Should be able to successfully stake oddz token", async function () {
    const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin);
    const oddzToken = await this.oddzToken.connect(this.signers.admin);
    await oddzToken.approve(this.oddzTokenStaking.address, BigNumber.from(utils.parseEther("10")));
    await expect(oddzStakingManager.stake(this.oddzToken.address, BigNumber.from(utils.parseEther("10")))).to.emit(
      oddzStakingManager,
      "Stake",
    );
    expect(await this.oddzTokenStaking.balance(this.accounts.admin)).to.equal(BigNumber.from(utils.parseEther("10")));
  });

  it("Should revert deposit without any approved allowance", async function () {
    const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin);
    await expect(
      oddzStakingManager.deposit(BigNumber.from(utils.parseEther("10")), DepositType.Transaction),
    ).to.be.revertedWith("ERC20: transfer amount exceeds allowance");
  });

  it("Should successfully deposit amount of transaction fee type", async function () {
    const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin);
    const oddzToken = await this.oddzToken.connect(this.signers.admin);
    await oddzToken.approve(this.oddzStakingManager.address, BigNumber.from(utils.parseEther("10")));
    await expect(oddzStakingManager.deposit(BigNumber.from(utils.parseEther("10")), DepositType.Transaction)).to.emit(
      oddzStakingManager,
      "Deposit",
    );
    expect(await oddzToken.balanceOf(this.oddzStakingManager.address)).to.equal(BigNumber.from(utils.parseEther("10")));
  });

  it("Should successfully deposit amount of settlement fee type", async function () {
    const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin);
    const oddzToken = await this.oddzToken.connect(this.signers.admin);
    await oddzToken.approve(this.oddzStakingManager.address, BigNumber.from(utils.parseEther("10")));
    await expect(oddzStakingManager.deposit(BigNumber.from(utils.parseEther("10")), DepositType.Settlement)).to.emit(
      oddzStakingManager,
      "Deposit",
    );
    expect(await oddzToken.balanceOf(this.oddzStakingManager.address)).to.equal(BigNumber.from(utils.parseEther("10")));
  });

  it("Should revert claim rewards for invalid token", async function () {
    const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin);
    await expect(oddzStakingManager.claimRewards(constants.AddressZero)).to.be.revertedWith("token not added");
  });

  it("Should revert claim rewards for invalid staker", async function () {
    const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin);
    await expect(oddzStakingManager.claimRewards(this.oddzToken.address)).to.be.revertedWith("invalid staker");
  });

  it("Should successfully claim rewards", async function () {
    const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin);
    const oddzToken = await this.oddzToken.connect(this.signers.admin);
    await oddzToken.approve(this.oddzStakingManager.address, BigNumber.from(utils.parseEther("100000")));
    await expect(oddzStakingManager.deposit(BigNumber.from(utils.parseEther("100000")), DepositType.Transaction))
      .to.emit(oddzStakingManager, "Deposit")
      .withArgs(this.accounts.admin, DepositType.Transaction, BigNumber.from(utils.parseEther("100000")));
    await oddzToken.approve(this.oddzTokenStaking.address, BigNumber.from(utils.parseEther("100")));
    await expect(oddzStakingManager.stake(this.oddzToken.address, BigNumber.from(utils.parseEther("100"))))
      .to.emit(oddzStakingManager, "Stake")
      .withArgs(this.accounts.admin, this.oddzToken.address, BigNumber.from(utils.parseEther("100")));
    await provider.send("evm_snapshot", []);
    // execution day + 2
    await provider.send("evm_increaseTime", [getExpiry(2)]);
    await this.oddzTokenStaking.connect(this.signers.admin).getAndUpdateDaysActiveStake(addDaysAndGetSeconds(2));
    await expect(oddzStakingManager.claimRewards(this.oddzToken.address))
      .to.emit(oddzStakingManager, "TransferReward")
      .withArgs(this.accounts.admin, this.oddzToken.address, BigNumber.from(utils.parseEther("50000")));
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);
  });

  it("Should successfully claim rewards", async function () {
    const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin);
    const oddzToken = await this.oddzToken.connect(this.signers.admin);
    await oddzToken.approve(this.oddzStakingManager.address, BigNumber.from(utils.parseEther("100000")));
    await expect(oddzStakingManager.deposit(BigNumber.from(utils.parseEther("100000")), DepositType.Transaction))
      .to.emit(oddzStakingManager, "Deposit")
      .withArgs(this.accounts.admin, DepositType.Transaction, BigNumber.from(utils.parseEther("100000")));
    await oddzToken.approve(this.oddzTokenStaking.address, BigNumber.from(utils.parseEther("100")));
    await expect(oddzStakingManager.stake(this.oddzToken.address, BigNumber.from(utils.parseEther("100"))))
      .to.emit(oddzStakingManager, "Stake")
      .withArgs(this.accounts.admin, this.oddzToken.address, BigNumber.from(utils.parseEther("100")));
    await provider.send("evm_snapshot", []);
    // execution day + 2
    await provider.send("evm_increaseTime", [getExpiry(2)]);
    await this.oddzTokenStaking.connect(this.signers.admin).getAndUpdateDaysActiveStake(addDaysAndGetSeconds(2));
    expect(await oddzStakingManager.getProfitInfo(this.oddzToken.address)).to.equal(
      BigNumber.from(utils.parseEther("50000")),
    );
    const usdcBalanceBefore = await oddzToken.balanceOf(this.accounts.admin);
    await expect(oddzStakingManager.claimRewards(this.oddzToken.address))
      .to.emit(oddzStakingManager, "TransferReward")
      .withArgs(this.accounts.admin, this.oddzToken.address, BigNumber.from(utils.parseEther("50000")));

    expect(await oddzToken.balanceOf(this.accounts.admin)).to.equal(
      usdcBalanceBefore.add(BigNumber.from(utils.parseEther("50000"))),
    );
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);
  });

  it("Should revert claiming rewards within lockup duration ", async function () {
    const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin);
    const oddzToken = await this.oddzToken.connect(this.signers.admin);
    await oddzToken.approve(this.oddzStakingManager.address, BigNumber.from(utils.parseEther("100000")));
    await expect(oddzStakingManager.deposit(BigNumber.from(utils.parseEther("100000")), DepositType.Transaction))
      .to.emit(oddzStakingManager, "Deposit")
      .withArgs(this.accounts.admin, DepositType.Transaction, BigNumber.from(utils.parseEther("100000")));
    await oddzToken.approve(this.oddzTokenStaking.address, BigNumber.from(utils.parseEther("100")));
    await expect(oddzStakingManager.stake(this.oddzToken.address, BigNumber.from(utils.parseEther("100"))))
      .to.emit(oddzStakingManager, "Stake")
      .withArgs(this.accounts.admin, this.oddzToken.address, BigNumber.from(utils.parseEther("100")));

    await expect(oddzStakingManager.claimRewards(this.oddzToken.address)).to.be.revertedWith(
      "cannot claim rewards within lockup period",
    );
  });

  it("Should revert withdrawing stake with in lockup duration", async function () {
    const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin);
    const oddzToken = await this.oddzToken.connect(this.signers.admin);
    await oddzToken.approve(this.oddzStakingManager.address, BigNumber.from(utils.parseEther("100000")));
    await expect(oddzStakingManager.deposit(BigNumber.from(utils.parseEther("100000")), DepositType.Transaction))
      .to.emit(oddzStakingManager, "Deposit")
      .withArgs(this.accounts.admin, DepositType.Transaction, BigNumber.from(utils.parseEther("100000")));
    await oddzToken.approve(this.oddzTokenStaking.address, BigNumber.from(utils.parseEther("100")));
    await expect(oddzStakingManager.stake(this.oddzToken.address, BigNumber.from(utils.parseEther("100"))))
      .to.emit(oddzStakingManager, "Stake")
      .withArgs(this.accounts.admin, this.oddzToken.address, BigNumber.from(utils.parseEther("100")));

    await expect(
      oddzStakingManager.withdraw(this.oddzToken.address, BigNumber.from(utils.parseEther("100"))),
    ).to.be.revertedWith("cannot withdraw within lockup period");
  });

  it("Should revert withdrawing oddz stake after lockup duration and stake again", async function () {
    const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin);
    const oddzToken = await this.oddzToken.connect(this.signers.admin);
    await oddzToken.approve(this.oddzStakingManager.address, BigNumber.from(utils.parseEther("100000")));
    await expect(oddzStakingManager.deposit(BigNumber.from(utils.parseEther("100000")), DepositType.Transaction))
      .to.emit(oddzStakingManager, "Deposit")
      .withArgs(this.accounts.admin, DepositType.Transaction, BigNumber.from(utils.parseEther("100000")));
    await oddzToken.approve(this.oddzTokenStaking.address, BigNumber.from(utils.parseEther("100")));
    await expect(oddzStakingManager.stake(this.oddzToken.address, BigNumber.from(utils.parseEther("100"))))
      .to.emit(oddzStakingManager, "Stake")
      .withArgs(this.accounts.admin, this.oddzToken.address, BigNumber.from(utils.parseEther("100")));
    await provider.send("evm_snapshot", []);
    // execution day + 2
    await provider.send("evm_increaseTime", [getExpiry(2)]);
    await oddzToken.approve(this.oddzTokenStaking.address, BigNumber.from(utils.parseEther("100")));
    await expect(oddzStakingManager.stake(this.oddzToken.address, BigNumber.from(utils.parseEther("100"))))
      .to.emit(oddzStakingManager, "Stake")
      .withArgs(this.accounts.admin, this.oddzToken.address, BigNumber.from(utils.parseEther("100")));
    await expect(
      oddzStakingManager.withdraw(this.oddzToken.address, BigNumber.from(utils.parseEther("100"))),
    ).to.be.revertedWith("cannot withdraw within lockup period");
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);
  });

  it("Should revert withdrawing oUsd stake after lockup duration and stake again", async function () {
    const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin);
    const oddzToken = await this.oddzToken.connect(this.signers.admin);
    await oddzToken.approve(this.oddzStakingManager.address, BigNumber.from(utils.parseEther("100000")));
    await expect(oddzStakingManager.deposit(BigNumber.from(utils.parseEther("100000")), DepositType.Transaction))
      .to.emit(oddzStakingManager, "Deposit")
      .withArgs(this.accounts.admin, DepositType.Transaction, BigNumber.from(utils.parseEther("100000")));
    const oUsdToken = await this.oUsdToken.connect(this.signers.admin);
    await oUsdToken.approve(this.oUsdTokenStaking.address, BigNumber.from(utils.parseEther("100")));
    await expect(oddzStakingManager.stake(this.oUsdToken.address, BigNumber.from(utils.parseEther("100"))))
      .to.emit(oddzStakingManager, "Stake")
      .withArgs(this.accounts.admin, this.oUsdToken.address, BigNumber.from(utils.parseEther("100")));
    await provider.send("evm_snapshot", []);
    // execution day + 2
    await provider.send("evm_increaseTime", [getExpiry(2)]);
    await oUsdToken.approve(this.oUsdTokenStaking.address, BigNumber.from(utils.parseEther("100")));
    await expect(oddzStakingManager.stake(this.oUsdToken.address, BigNumber.from(utils.parseEther("100"))))
      .to.emit(oddzStakingManager, "Stake")
      .withArgs(this.accounts.admin, this.oUsdToken.address, BigNumber.from(utils.parseEther("100")));
    await expect(
      oddzStakingManager.withdraw(this.oUsdToken.address, BigNumber.from(utils.parseEther("100"))),
    ).to.be.revertedWith("cannot withdraw within lockup period");
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);
  });

  it("Should revert withdrawing stake for invalid token address", async function () {
    const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin);

    await expect(
      oddzStakingManager.withdraw(constants.AddressZero, BigNumber.from(utils.parseEther("100"))),
    ).to.be.revertedWith("token not added");
  });

  it("Should revert withdrawing stake more than the deposited", async function () {
    const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin);
    const oddzToken = await this.oddzToken.connect(this.signers.admin);
    await oddzToken.approve(this.oddzTokenStaking.address, BigNumber.from(utils.parseEther("100")));
    await expect(oddzStakingManager.stake(this.oddzToken.address, BigNumber.from(utils.parseEther("100"))))
      .to.emit(oddzStakingManager, "Stake")
      .withArgs(this.accounts.admin, this.oddzToken.address, BigNumber.from(utils.parseEther("100")));
    await expect(
      oddzStakingManager.withdraw(this.oddzToken.address, BigNumber.from(utils.parseEther("101"))),
    ).to.be.revertedWith("Amount is too large");
  });

  it("Should successfully stake, claim rewards, withdraw stake for oddz token", async function () {
    const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin);
    const oddzToken = await this.oddzToken.connect(this.signers.admin);
    await oddzToken.approve(this.oddzStakingManager.address, BigNumber.from(utils.parseEther("100000")));
    await expect(oddzStakingManager.deposit(BigNumber.from(utils.parseEther("100000")), DepositType.Transaction))
      .to.emit(oddzStakingManager, "Deposit")
      .withArgs(this.accounts.admin, DepositType.Transaction, BigNumber.from(utils.parseEther("100000")));
    await oddzToken.approve(this.oddzTokenStaking.address, BigNumber.from(utils.parseEther("100")));
    await expect(oddzStakingManager.stake(this.oddzToken.address, BigNumber.from(utils.parseEther("100"))))
      .to.emit(oddzStakingManager, "Stake")
      .withArgs(this.accounts.admin, this.oddzToken.address, BigNumber.from(utils.parseEther("100")));
    await provider.send("evm_snapshot", []);
    // execution day + 2
    await provider.send("evm_increaseTime", [getExpiry(2)]);
    await this.oddzTokenStaking.connect(this.signers.admin).getAndUpdateDaysActiveStake(addDaysAndGetSeconds(2));
    expect(await oddzStakingManager.getProfitInfo(this.oddzToken.address)).to.equal(
      BigNumber.from(utils.parseEther("50000")),
    );
    await expect(oddzStakingManager.claimRewards(this.oddzToken.address))
      .to.emit(oddzStakingManager, "TransferReward")
      .withArgs(this.accounts.admin, this.oddzToken.address, BigNumber.from(utils.parseEther("50000")));
    await expect(oddzStakingManager.withdraw(this.oddzToken.address, BigNumber.from(utils.parseEther("100"))))
      .to.emit(oddzStakingManager, "Withdraw")
      .withArgs(this.accounts.admin, this.oddzToken.address, BigNumber.from(utils.parseEther("100")));
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);
  });

  it("Should successfully stake and claim rewards, withdraw stake for oUSD token", async function () {
    const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin);
    const oddzToken = await this.oddzToken.connect(this.signers.admin);
    await oddzToken.approve(this.oddzStakingManager.address, BigNumber.from(utils.parseEther("100000")));
    await expect(oddzStakingManager.deposit(BigNumber.from(utils.parseEther("100000")), DepositType.Transaction))
      .to.emit(oddzStakingManager, "Deposit")
      .withArgs(this.accounts.admin, DepositType.Transaction, BigNumber.from(utils.parseEther("100000")));
    await oddzToken.approve(this.oddzStakingManager.address, BigNumber.from(utils.parseEther("100000")));
    await expect(oddzStakingManager.deposit(BigNumber.from(utils.parseEther("100000")), DepositType.Settlement))
      .to.emit(oddzStakingManager, "Deposit")
      .withArgs(this.accounts.admin, DepositType.Settlement, BigNumber.from(utils.parseEther("100000")));
    const oUsdToken = await this.oUsdToken.connect(this.signers.admin);
    await oUsdToken.approve(this.oUsdTokenStaking.address, BigNumber.from(utils.parseEther("100")));
    await expect(oddzStakingManager.stake(this.oUsdToken.address, BigNumber.from(utils.parseEther("100"))))
      .to.emit(oddzStakingManager, "Stake")
      .withArgs(this.accounts.admin, this.oUsdToken.address, BigNumber.from(utils.parseEther("100")));
    await provider.send("evm_snapshot", []);
    // execution day + 2
    await provider.send("evm_increaseTime", [getExpiry(2)]);
    await this.oUsdTokenStaking.connect(this.signers.admin).getAndUpdateDaysActiveStake(addDaysAndGetSeconds(2));
    expect(await oddzStakingManager.getProfitInfo(this.oUsdToken.address)).to.equal(
      BigNumber.from(utils.parseEther("80000")),
    );
    await expect(oddzStakingManager.claimRewards(this.oUsdToken.address))
      .to.emit(oddzStakingManager, "TransferReward")
      .withArgs(this.accounts.admin, this.oUsdToken.address, BigNumber.from(utils.parseEther("80000")));
    await expect(oddzStakingManager.withdraw(this.oUsdToken.address, BigNumber.from(utils.parseEther("100"))))
      .to.emit(oddzStakingManager, "Withdraw")
      .withArgs(this.accounts.admin, this.oUsdToken.address, BigNumber.from(utils.parseEther("100")));
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);
  });

  it("Should transfer rewards while withdrawing if the rewards are not claimed yet", async function () {
    const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin);
    const oddzToken = await this.oddzToken.connect(this.signers.admin);
    await oddzToken.approve(this.oddzStakingManager.address, BigNumber.from(utils.parseEther("100000")));
    await expect(oddzStakingManager.deposit(BigNumber.from(utils.parseEther("100000")), DepositType.Transaction))
      .to.emit(oddzStakingManager, "Deposit")
      .withArgs(this.accounts.admin, DepositType.Transaction, BigNumber.from(utils.parseEther("100000")));
    await oddzToken.approve(this.oddzTokenStaking.address, BigNumber.from(utils.parseEther("100")));
    await expect(oddzStakingManager.stake(this.oddzToken.address, BigNumber.from(utils.parseEther("100"))))
      .to.emit(oddzStakingManager, "Stake")
      .withArgs(this.accounts.admin, this.oddzToken.address, BigNumber.from(utils.parseEther("100")));
    await provider.send("evm_snapshot", []);
    // execution day + 2
    await provider.send("evm_increaseTime", [getExpiry(2)]);
    await this.oddzTokenStaking.connect(this.signers.admin).getAndUpdateDaysActiveStake(addDaysAndGetSeconds(2));
    expect(await oddzStakingManager.getProfitInfo(this.oddzToken.address)).to.equal(
      BigNumber.from(utils.parseEther("50000")),
    );
    await expect(oddzStakingManager.withdraw(this.oddzToken.address, BigNumber.from(utils.parseEther("100"))))
      .to.emit(oddzStakingManager, "TransferReward")
      .withArgs(this.accounts.admin, this.oddzToken.address, BigNumber.from(utils.parseEther("50000")))
      .to.emit(oddzStakingManager, "Withdraw")
      .withArgs(this.accounts.admin, this.oddzToken.address, BigNumber.from(utils.parseEther("100")));
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);
  });

  it("Should revert burn for non owner", async function () {
    const mockTokenStaking = await this.mockTokenStaking.connect(this.signers.admin);
    await expect(mockTokenStaking.burn()).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("Should burn for owner", async function () {
    const oddzTokenStaking = await this.oddzTokenStaking1.connect(this.signers.admin);
    const mockTokenStaking = await this.mockTokenStaking.connect(this.signers.admin);
    const oddzToken = await this.oddzToken.connect(this.signers.admin);
    await oddzToken.approve(this.oddzTokenStaking1.address, BigNumber.from(utils.parseEther("100")));

    await oddzTokenStaking.transferOwnership(this.mockTokenStaking.address);
    await mockTokenStaking.setToken(this.oddzToken.address);
    await mockTokenStaking.stake();
    expect(await oddzTokenStaking.balanceOf(this.accounts.admin)).to.equal(1000);
    await expect(mockTokenStaking.burn()).to.be.ok;

    expect(await oddzTokenStaking.balanceOf(this.accounts.admin)).to.equal(0);
  });

  it("Should revert set token for non owner", async function () {
    const mockTokenStaking = await this.mockTokenStaking.connect(this.signers.admin);
    await expect(mockTokenStaking.setToken(this.oddzToken.address)).to.be.revertedWith(
      "Ownable: caller is not the owner",
    );
  });

  it("Should set token", async function () {
    const oddzTokenStaking = await this.oddzTokenStaking1.connect(this.signers.admin);
    const mockTokenStaking = await this.mockTokenStaking.connect(this.signers.admin);
    await oddzTokenStaking.transferOwnership(this.mockTokenStaking.address);

    await mockTokenStaking.setToken(this.oddzToken.address);

    expect(await oddzTokenStaking.token()).to.equal(this.oddzToken.address);
  });
}