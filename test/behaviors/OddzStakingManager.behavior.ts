import { expect } from "chai";
import { BigNumber, utils, constants } from "ethers";
import { getExpiry, DepositType, addSnapshotCount } from "../../test-utils";
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
      "invalid token address",
    );
  });

  it("Should successfully set lockup duration for the token", async function () {
    const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin);
    await oddzStakingManager.setLockupDuration(this.oddzToken.address, getExpiry(1));
    const token = await oddzStakingManager.tokens(this.oddzToken.address);
    expect(token._lockupDuration).to.equal(getExpiry(1));
  });

  it("Should revert setting reward frequency for the token by non owner", async function () {
    const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin1);
    await expect(oddzStakingManager.setRewardFrequency(this.oddzToken.address, getExpiry(1))).to.be.revertedWith(
      "Ownable: caller is not the owner",
    );
  });

  it("Should revert setting reward frequency for invalid token", async function () {
    const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin);
    await expect(oddzStakingManager.setRewardFrequency(constants.AddressZero, getExpiry(1))).to.be.revertedWith(
      "invalid token address",
    );
  });

  it("Should successfully set reward frequency for the token", async function () {
    const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin);
    await oddzStakingManager.setRewardFrequency(this.oddzToken.address, getExpiry(1));
    const token = await oddzStakingManager.tokens(this.oddzToken.address);
    expect(token._rewardFrequency).to.equal(getExpiry(1));
  });

  it("Should revert staking for zero token address", async function () {
    const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin);
    await expect(
      oddzStakingManager.stake(constants.AddressZero, BigNumber.from(utils.parseEther("10"))),
    ).to.be.revertedWith("invalid token address");
  });

  it("Should revert staking for invalid token address", async function () {
    const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin);
    await expect(
      oddzStakingManager.stake(this.oddzTokenStaking.address, BigNumber.from(utils.parseEther("10"))),
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

  it("Should revert deposit for invalid deposit type", async function () {
    const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin);
    await expect(
      oddzStakingManager.deposit(BigNumber.from(utils.parseEther("10")), DepositType.Invalid),
    ).to.be.revertedWith("invalid deposit type");
  });

  it("Should revert deposit without any approved allowance", async function () {
    const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin);
    await expect(
      oddzStakingManager.deposit(BigNumber.from(utils.parseEther("10")), DepositType.Transaction),
    ).to.be.revertedWith("ERC20: transfer amount exceeds allowance");
  });

  it("Should successfully deposit amount of transaction fee type", async function () {
    const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin);
    const usdcToken = await this.usdcToken.connect(this.signers.admin);
    await usdcToken.approve(this.oddzStakingManager.address, BigNumber.from(utils.parseEther("10")));
    await expect(oddzStakingManager.deposit(BigNumber.from(utils.parseEther("10")), DepositType.Transaction)).to.emit(
      oddzStakingManager,
      "Deposit",
    );
    expect(await usdcToken.balanceOf(this.oddzStakingManager.address)).to.equal(BigNumber.from(utils.parseEther("10")));
  });

  it("Should successfully deposit amount of settlement fee type", async function () {
    const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin);
    const usdcToken = await this.usdcToken.connect(this.signers.admin);
    await usdcToken.approve(this.oddzStakingManager.address, BigNumber.from(utils.parseEther("10")));
    await expect(oddzStakingManager.deposit(BigNumber.from(utils.parseEther("10")), DepositType.Settlement)).to.emit(
      oddzStakingManager,
      "Deposit",
    );
    expect(await usdcToken.balanceOf(this.oddzStakingManager.address)).to.equal(BigNumber.from(utils.parseEther("10")));
  });

  it("Should successfully distribute, claim rewards", async function () {
    const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin);
    const usdcToken = await this.usdcToken.connect(this.signers.admin);
    await usdcToken.approve(this.oddzStakingManager.address, BigNumber.from(utils.parseEther("100000")));
    await expect(oddzStakingManager.deposit(BigNumber.from(utils.parseEther("100000")), DepositType.Transaction))
      .to.emit(oddzStakingManager, "Deposit")
      .withArgs(this.accounts.admin, DepositType.Transaction, BigNumber.from(utils.parseEther("100000")));
    const oddzToken = await this.oddzToken.connect(this.signers.admin);
    await oddzToken.approve(this.oddzTokenStaking.address, BigNumber.from(utils.parseEther("100")));
    await expect(oddzStakingManager.stake(this.oddzToken.address, BigNumber.from(utils.parseEther("100"))))
      .to.emit(oddzStakingManager, "Stake")
      .withArgs(this.accounts.admin, this.oddzToken.address, BigNumber.from(utils.parseEther("100")));
    await provider.send("evm_snapshot", []);
    // execution day + 2
    await provider.send("evm_increaseTime", [getExpiry(2)]);
    await expect(oddzStakingManager.distributeRewards(this.oddzToken.address, [this.accounts.admin]))
      .to.emit(oddzStakingManager, "DistributeReward")
      .withArgs(this.accounts.admin, this.oddzToken.address, BigNumber.from(utils.parseEther("50000")));
    expect(await oddzStakingManager.getProfitInfo(this.oddzToken.address)).to.equal(
      BigNumber.from(utils.parseEther("50000")),
    );
    await expect(oddzStakingManager.claimRewards(this.oddzToken.address))
      .to.emit(oddzStakingManager, "TransferReward")
      .withArgs(this.accounts.admin, this.oddzToken.address, BigNumber.from(utils.parseEther("50000")));
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);
  });

  it("Should successfully distribute, claim rewards", async function () {
    const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin);
    const usdcToken = await this.usdcToken.connect(this.signers.admin);
    await usdcToken.approve(this.oddzStakingManager.address, BigNumber.from(utils.parseEther("100000")));
    await expect(oddzStakingManager.deposit(BigNumber.from(utils.parseEther("100000")), DepositType.Transaction))
      .to.emit(oddzStakingManager, "Deposit")
      .withArgs(this.accounts.admin, DepositType.Transaction, BigNumber.from(utils.parseEther("100000")));
    const oddzToken = await this.oddzToken.connect(this.signers.admin);
    await oddzToken.approve(this.oddzTokenStaking.address, BigNumber.from(utils.parseEther("100")));
    await expect(oddzStakingManager.stake(this.oddzToken.address, BigNumber.from(utils.parseEther("100"))))
      .to.emit(oddzStakingManager, "Stake")
      .withArgs(this.accounts.admin, this.oddzToken.address, BigNumber.from(utils.parseEther("100")));
    await provider.send("evm_snapshot", []);
    // execution day + 2
    await provider.send("evm_increaseTime", [getExpiry(2)]);
    await expect(oddzStakingManager.distributeRewards(this.oddzToken.address, [this.accounts.admin]))
      .to.emit(oddzStakingManager, "DistributeReward")
      .withArgs(this.accounts.admin, this.oddzToken.address, BigNumber.from(utils.parseEther("50000")));
    expect(await oddzStakingManager.getProfitInfo(this.oddzToken.address)).to.equal(
      BigNumber.from(utils.parseEther("50000")),
    );
    const usdcBalanceBefore = await usdcToken.balanceOf(this.accounts.admin);
    await expect(oddzStakingManager.claimRewards(this.oddzToken.address))
      .to.emit(oddzStakingManager, "TransferReward")
      .withArgs(this.accounts.admin, this.oddzToken.address, BigNumber.from(utils.parseEther("50000")));

    expect(await usdcToken.balanceOf(this.accounts.admin)).to.equal(
      usdcBalanceBefore.add(BigNumber.from(utils.parseEther("50000"))),
    );
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);
  });

  it("Should revert claiming rewards within lockup duration ", async function () {
    const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin);
    const usdcToken = await this.usdcToken.connect(this.signers.admin);
    await usdcToken.approve(this.oddzStakingManager.address, BigNumber.from(utils.parseEther("100000")));
    await expect(oddzStakingManager.deposit(BigNumber.from(utils.parseEther("100000")), DepositType.Transaction))
      .to.emit(oddzStakingManager, "Deposit")
      .withArgs(this.accounts.admin, DepositType.Transaction, BigNumber.from(utils.parseEther("100000")));
    const oddzToken = await this.oddzToken.connect(this.signers.admin);
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
    const usdcToken = await this.usdcToken.connect(this.signers.admin);
    await usdcToken.approve(this.oddzStakingManager.address, BigNumber.from(utils.parseEther("100000")));
    await expect(oddzStakingManager.deposit(BigNumber.from(utils.parseEther("100000")), DepositType.Transaction))
      .to.emit(oddzStakingManager, "Deposit")
      .withArgs(this.accounts.admin, DepositType.Transaction, BigNumber.from(utils.parseEther("100000")));
    const oddzToken = await this.oddzToken.connect(this.signers.admin);
    await oddzToken.approve(this.oddzTokenStaking.address, BigNumber.from(utils.parseEther("100")));
    await expect(oddzStakingManager.stake(this.oddzToken.address, BigNumber.from(utils.parseEther("100"))))
      .to.emit(oddzStakingManager, "Stake")
      .withArgs(this.accounts.admin, this.oddzToken.address, BigNumber.from(utils.parseEther("100")));

    await expect(
      oddzStakingManager.withdraw(this.oddzToken.address, BigNumber.from(utils.parseEther("100"))),
    ).to.be.revertedWith("cannot withdraw within lockup period");
  });

  it("Should revert withdrawing stake for invalid token address", async function () {
    const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin);

    await expect(
      oddzStakingManager.withdraw(constants.AddressZero, BigNumber.from(utils.parseEther("100"))),
    ).to.be.revertedWith("invalid token address");
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

  it("Should successfully stake, distribute and claim rewards, withdraw stake for oddz token", async function () {
    const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin);
    const usdcToken = await this.usdcToken.connect(this.signers.admin);
    await usdcToken.approve(this.oddzStakingManager.address, BigNumber.from(utils.parseEther("100000")));
    await expect(oddzStakingManager.deposit(BigNumber.from(utils.parseEther("100000")), DepositType.Transaction))
      .to.emit(oddzStakingManager, "Deposit")
      .withArgs(this.accounts.admin, DepositType.Transaction, BigNumber.from(utils.parseEther("100000")));
    const oddzToken = await this.oddzToken.connect(this.signers.admin);
    await oddzToken.approve(this.oddzTokenStaking.address, BigNumber.from(utils.parseEther("100")));
    await expect(oddzStakingManager.stake(this.oddzToken.address, BigNumber.from(utils.parseEther("100"))))
      .to.emit(oddzStakingManager, "Stake")
      .withArgs(this.accounts.admin, this.oddzToken.address, BigNumber.from(utils.parseEther("100")));
    await provider.send("evm_snapshot", []);
    // execution day + 2
    await provider.send("evm_increaseTime", [getExpiry(2)]);
    await expect(oddzStakingManager.distributeRewards(this.oddzToken.address, [this.accounts.admin]))
      .to.emit(oddzStakingManager, "DistributeReward")
      .withArgs(this.accounts.admin, this.oddzToken.address, BigNumber.from(utils.parseEther("50000")));
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

  it("Should successfully stake, distribute and claim rewards, withdraw stake for oUSD token", async function () {
    const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin);
    const usdcToken = await this.usdcToken.connect(this.signers.admin);
    await usdcToken.approve(this.oddzStakingManager.address, BigNumber.from(utils.parseEther("100000")));
    await expect(oddzStakingManager.deposit(BigNumber.from(utils.parseEther("100000")), DepositType.Transaction))
      .to.emit(oddzStakingManager, "Deposit")
      .withArgs(this.accounts.admin, DepositType.Transaction, BigNumber.from(utils.parseEther("100000")));
    await usdcToken.approve(this.oddzStakingManager.address, BigNumber.from(utils.parseEther("100000")));
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
    await expect(oddzStakingManager.distributeRewards(this.oUsdToken.address, [this.accounts.admin]))
      .to.emit(oddzStakingManager, "DistributeReward")
      .withArgs(this.accounts.admin, this.oUsdToken.address, BigNumber.from(utils.parseEther("60000")));
    expect(await oddzStakingManager.getProfitInfo(this.oUsdToken.address)).to.equal(
      BigNumber.from(utils.parseEther("60000")),
    );
    await expect(oddzStakingManager.claimRewards(this.oUsdToken.address))
      .to.emit(oddzStakingManager, "TransferReward")
      .withArgs(this.accounts.admin, this.oUsdToken.address, BigNumber.from(utils.parseEther("60000")));
    await expect(oddzStakingManager.withdraw(this.oUsdToken.address, BigNumber.from(utils.parseEther("100"))))
      .to.emit(oddzStakingManager, "Withdraw")
      .withArgs(this.accounts.admin, this.oUsdToken.address, BigNumber.from(utils.parseEther("100")));
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);
  });

  it("Should successfully stake, distribute and claim rewards, withdraw stake for oDEV token", async function () {
    const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin);
    const usdcToken = await this.usdcToken.connect(this.signers.admin);
    await usdcToken.approve(this.oddzStakingManager.address, BigNumber.from(utils.parseEther("100000")));
    await expect(oddzStakingManager.deposit(BigNumber.from(utils.parseEther("100000")), DepositType.Transaction))
      .to.emit(oddzStakingManager, "Deposit")
      .withArgs(this.accounts.admin, DepositType.Transaction, BigNumber.from(utils.parseEther("100000")));
    await usdcToken.approve(this.oddzStakingManager.address, BigNumber.from(utils.parseEther("100000")));
      await expect(oddzStakingManager.deposit(BigNumber.from(utils.parseEther("100000")), DepositType.Settlement))
      .to.emit(oddzStakingManager, "Deposit")
      .withArgs(this.accounts.admin, DepositType.Settlement, BigNumber.from(utils.parseEther("100000")));
      const oDevToken = await this.oDevToken.connect(this.signers.admin);
    await oDevToken.approve(this.oDevTokenStaking.address, BigNumber.from(utils.parseEther("100")));
    await expect(oddzStakingManager.stake(this.oDevToken.address, BigNumber.from(utils.parseEther("100"))))
      .to.emit(oddzStakingManager, "Stake")
      .withArgs(this.accounts.admin, this.oDevToken.address, BigNumber.from(utils.parseEther("100")));
    await provider.send("evm_snapshot", []);
    // execution day + 2
    await provider.send("evm_increaseTime", [getExpiry(2)]);
    await expect(oddzStakingManager.distributeRewards(this.oDevToken.address, [this.accounts.admin]))
      .to.emit(oddzStakingManager, "DistributeReward")
      .withArgs(this.accounts.admin, this.oDevToken.address, BigNumber.from(utils.parseEther("20000")));
    expect(await oddzStakingManager.getProfitInfo(this.oDevToken.address)).to.equal(
      BigNumber.from(utils.parseEther("20000")),
    );
    await expect(oddzStakingManager.claimRewards(this.oDevToken.address))
      .to.emit(oddzStakingManager, "TransferReward")
      .withArgs(this.accounts.admin, this.oDevToken.address, BigNumber.from(utils.parseEther("20000")));
    await expect(oddzStakingManager.withdraw(this.oDevToken.address, BigNumber.from(utils.parseEther("100"))))
      .to.emit(oddzStakingManager, "Withdraw")
      .withArgs(this.accounts.admin, this.oDevToken.address, BigNumber.from(utils.parseEther("100")));
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);
  });

  it("Should transfer rewards while withdrawing if the rewards are not claimed yet", async function () {
    const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin);
    const usdcToken = await this.usdcToken.connect(this.signers.admin);
    await usdcToken.approve(this.oddzStakingManager.address, BigNumber.from(utils.parseEther("100000")));
    await expect(oddzStakingManager.deposit(BigNumber.from(utils.parseEther("100000")), DepositType.Transaction))
      .to.emit(oddzStakingManager, "Deposit")
      .withArgs(this.accounts.admin, DepositType.Transaction, BigNumber.from(utils.parseEther("100000")));
    const oddzToken = await this.oddzToken.connect(this.signers.admin);
    await oddzToken.approve(this.oddzTokenStaking.address, BigNumber.from(utils.parseEther("100")));
    await expect(oddzStakingManager.stake(this.oddzToken.address, BigNumber.from(utils.parseEther("100"))))
      .to.emit(oddzStakingManager, "Stake")
      .withArgs(this.accounts.admin, this.oddzToken.address, BigNumber.from(utils.parseEther("100")));
    await provider.send("evm_snapshot", []);
    // execution day + 2
    await provider.send("evm_increaseTime", [getExpiry(2)]);
    await expect(oddzStakingManager.distributeRewards(this.oddzToken.address, [this.accounts.admin]))
      .to.emit(oddzStakingManager, "DistributeReward")
      .withArgs(this.accounts.admin, this.oddzToken.address, BigNumber.from(utils.parseEther("50000")));
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
  it("Should distribute rewards for token only as per reward frequency", async function () {
    const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin);
    const usdcToken = await this.usdcToken.connect(this.signers.admin);
    await usdcToken.approve(this.oddzStakingManager.address, BigNumber.from(utils.parseEther("100000")));
    await expect(oddzStakingManager.deposit(BigNumber.from(utils.parseEther("100000")), DepositType.Transaction))
      .to.emit(oddzStakingManager, "Deposit")
      .withArgs(this.accounts.admin, DepositType.Transaction, BigNumber.from(utils.parseEther("100000")));
    const oddzToken = await this.oddzToken.connect(this.signers.admin);
    await oddzToken.approve(this.oddzTokenStaking.address, BigNumber.from(utils.parseEther("100")));
    await expect(oddzStakingManager.stake(this.oddzToken.address, BigNumber.from(utils.parseEther("100"))))
      .to.emit(oddzStakingManager, "Stake")
      .withArgs(this.accounts.admin, this.oddzToken.address, BigNumber.from(utils.parseEther("100")));
    await provider.send("evm_snapshot", []);
    // execution day + 2
    await provider.send("evm_increaseTime", [getExpiry(2)]);
    await expect(oddzStakingManager.distributeRewards(this.oddzToken.address, [this.accounts.admin]))
      .to.emit(oddzStakingManager, "DistributeReward")
      .withArgs(this.accounts.admin, this.oddzToken.address, BigNumber.from(utils.parseEther("50000")));
    const profit = await oddzStakingManager.getProfitInfo(this.oddzToken.address);
    await expect(oddzStakingManager.distributeRewards(this.oddzToken.address, [this.accounts.admin])).to.be.ok;
    // profit should not be changed
    expect(await oddzStakingManager.getProfitInfo(this.oddzToken.address)).to.equal(profit);
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);
  });

  it("Should revert distribute rewards for invalid token", async function () {
    const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin);
    await expect(oddzStakingManager.distributeRewards(constants.AddressZero, [this.accounts.admin])).to.be.revertedWith(
      "invalid token address",
    );
  });

  it("Should not distribute when there is zero txn fee balance and settlement fee balance", async function () {
    const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin);
    const oddzToken = await this.oddzToken.connect(this.signers.admin);
    await oddzToken.approve(this.oddzTokenStaking.address, BigNumber.from(utils.parseEther("100")));
    await expect(oddzStakingManager.stake(this.oddzToken.address, BigNumber.from(utils.parseEther("100"))))
      .to.emit(oddzStakingManager, "Stake")
      .withArgs(this.accounts.admin, this.oddzToken.address, BigNumber.from(utils.parseEther("100")));
    await provider.send("evm_snapshot", []);
    // execution day + 2
    await provider.send("evm_increaseTime", [getExpiry(2)]);
    const profit = await oddzStakingManager.getProfitInfo(this.oddzToken.address);
    await oddzStakingManager.distributeRewards(this.oddzToken.address, [this.accounts.admin]);
    expect(await oddzStakingManager.getProfitInfo(this.oddzToken.address)).to.equal(profit);
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);
  });
}
