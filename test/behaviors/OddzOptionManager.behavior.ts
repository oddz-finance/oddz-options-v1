import { expect } from "chai";
import { BigNumber, utils } from "ethers";
import { OptionType, ExcerciseType, addDaysAndGetSeconds, getExpiry } from "../../test-utils";
import { waffle } from "hardhat";
const provider = waffle.provider;
let snapshotCount = 0;

export function shouldBehaveLikeOddzOptionManager(): void {
  it("should fail with message invalid asset", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);

    await expect(
      oddzOptionManager.getPremium(1, getExpiry(1), BigNumber.from(100), BigNumber.from(1234), OptionType.Call),
    ).to.be.revertedWith("Invalid Asset");
  });

  it("should fail with message Asset already present", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    // call should be optionType.call
    await oddzOptionManager.addAsset(utils.formatBytes32String("ETH"), BigNumber.from(1e8));
    await expect(oddzOptionManager.addAsset(utils.formatBytes32String("ETH"), BigNumber.from(1e8))).to.be.revertedWith(
      "Asset already present",
    );
  });
  it("should add new asset", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    await expect(oddzOptionManager.addAsset(utils.formatBytes32String("ETH"), BigNumber.from(1e8))).to.emit(
      oddzOptionManager,
      "NewAsset",
    );
  });
  it("should emit new asset event", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    await oddzOptionManager.addAsset(utils.formatBytes32String("ETH"), BigNumber.from(1e8));
    const asset = await oddzOptionManager.assets(0);
    expect(asset.id).to.be.equal(0);
  });

  it("should return premium price only if the asset is active", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    await oddzOptionManager.addAsset(utils.formatBytes32String("ETH"), BigNumber.from(1e8));
    const asset = await oddzOptionManager.assets(0);
    await expect(oddzOptionManager.deactivateAsset(asset.id))
      .to.emit(oddzOptionManager, "AssetDeactivate")
      .withArgs(0, "0x4554480000000000000000000000000000000000000000000000000000000000");
    await expect(
      oddzOptionManager.getPremium(
        asset.id,
        getExpiry(1),
        BigNumber.from(utils.parseEther("1")), // number of options
        BigNumber.from(160000000000),
        OptionType.Call,
      ),
    ).to.be.revertedWith("revert Invalid Asset");
    await expect(oddzOptionManager.activateAsset(asset.id))
      .to.emit(oddzOptionManager, "AssetActivate")
      .withArgs(0, "0x4554480000000000000000000000000000000000000000000000000000000000");
    const option = await oddzOptionManager.getPremium(
      asset.id,
      getExpiry(1),
      BigNumber.from(utils.parseEther("1")), // number of options
      BigNumber.from(160000000000),
      OptionType.Call,
    );
    const { optionPremium, txnFee } = option;
    await expect(optionPremium.toNumber()).to.equal(6653168625);
    await expect(txnFee.toNumber()).to.equal(332658431);
  });

  it("should return newly added asset ids for multiple assets", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    await oddzOptionManager.addAsset(utils.formatBytes32String("ETH"), BigNumber.from(1e8));
    const asset0 = await oddzOptionManager.assets(0);
    expect(asset0.id).to.be.equal(0);
    await oddzOptionManager.addAsset(utils.formatBytes32String("BTC"), BigNumber.from(1e8));
    const asset1 = await oddzOptionManager.assets(1);
    expect(asset1.id).to.be.equal(1);
  });

  it("should return the premium price 1 day", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    // call should be optionType.call
    await oddzOptionManager.addAsset(utils.formatBytes32String("ETH"), BigNumber.from(1e8));
    const asset = await oddzOptionManager.assets(0);
    const option = await oddzOptionManager.getPremium(
      asset.id,
      getExpiry(1),
      BigNumber.from(utils.parseEther("1")), // number of options
      BigNumber.from(160000000000),
      OptionType.Call,
    );
    const { optionPremium, txnFee, cp, iv } = option;
    expect(iv.toNumber()).to.equal(180000);
    expect(optionPremium.toNumber()).to.equal(6653168625);
    expect(txnFee.toNumber()).to.equal(332658431);
    expect(cp.toNumber()).to.equal(161200000000);
  });

  it("should return the premium price for 7 days", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    // call should be optionType.call
    await oddzOptionManager.addAsset(utils.formatBytes32String("ETH"), BigNumber.from(1e8));
    const asset = await oddzOptionManager.assets(0);
    const option = await oddzOptionManager.getPremium(
      asset.id,
      getExpiry(7),
      BigNumber.from(utils.parseEther("1")), // number of options
      BigNumber.from(160000000000),
      OptionType.Call,
    );
    const { optionPremium, txnFee, cp, iv } = option;
    expect(iv.toNumber()).to.equal(180000);
    expect(optionPremium.toNumber()).to.equal(16536825618);
    expect(txnFee.toNumber()).to.equal(826841280);
    expect(cp.toNumber()).to.equal(161200000000);
  });

  it("should throw Expiration cannot be less than 1 days error when the expiry is less than a day", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    await expect(
      oddzOptionManager.buy(
        1,
        getExpiry(0),
        BigNumber.from(utils.parseEther("1")), // number of options
        BigNumber.from(123400000000),
        OptionType.Call,
      ),
    ).to.be.revertedWith("Expiration cannot be less than 1 days");
  });

  it("should throw Expiration cannot be more than 30 days error when the expiry is more than a 30 days", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    await expect(
      oddzOptionManager.buy(
        1,
        getExpiry(31),
        BigNumber.from(utils.parseEther("1")), // number of options
        BigNumber.from(123400000000),
        OptionType.Call,
      ),
    ).to.be.revertedWith("Expiration cannot be more than 30 days");
  });

  it("should prevent buying options for unsupported asset type", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    await expect(
      oddzOptionManager.buy(
        1,
        getExpiry(1),
        BigNumber.from(utils.parseEther("1")), // number of options
        BigNumber.from(123400000000),
        OptionType.Call,
      ),
    ).to.be.revertedWith("Invalid Asset");
  });

  it("should buy option if the asset is supported and emit buy event", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    const oddzLiquidityPool = await this.oddzLiquidityPool.connect(this.signers.admin);
    await oddzLiquidityPool.addLiquidity({ value: 100000000000000 });
    await oddzOptionManager.addAsset(utils.formatBytes32String("ETH"), BigNumber.from(1e8));
    const asset = await oddzOptionManager.assets(0);
    const overrides = {
      value: utils.parseEther("1"), // ether in this case MUST be a string
    };
    await expect(
      oddzOptionManager.buy(
        asset.id,
        getExpiry(10),
        BigNumber.from(utils.parseEther("1")), // number of options
        BigNumber.from(160000000000),
        OptionType.Call,
        overrides,
      ),
    ).to.emit(oddzOptionManager, "Buy");
  });

  it("should throw low premium exception", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    const oddzLiquidityPool = await this.oddzLiquidityPool.connect(this.signers.admin);
    await oddzLiquidityPool.addLiquidity({ value: 100000000000000 });
    await oddzOptionManager.addAsset(utils.formatBytes32String("ETH"), BigNumber.from(1e8));
    const asset = await oddzOptionManager.assets(0);
    const overrides = {
      value: utils.parseEther("0.01"), // ether in this case MUST be a string
    };
    await expect(
      oddzOptionManager.buy(
        asset.id,
        getExpiry(10),
        BigNumber.from(utils.parseEther("1")), // number of options
        BigNumber.from(122000000000),
        OptionType.Call,
        overrides,
      ),
    ).to.be.revertedWith("Premium is low");
  });

  it("Call option - excercise flow", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    await oddzOptionManager.addAsset(utils.formatBytes32String("ETH"), BigNumber.from(1e8));
    const asset = await oddzOptionManager.assets(0);
    const oddzLiquidityPool = await this.oddzLiquidityPool.connect(this.signers.admin);
    const oddzPriceOracle = await this.oddzPriceOracle.connect(this.signers.admin);
    await oddzLiquidityPool.addLiquidity({ value: 100000000000000 });
    const overrides = {
      value: utils.parseEther("1"), // ether in this case MUST be a string
    };
    await oddzOptionManager.buy(
      asset.id,
      getExpiry(2),
      BigNumber.from(utils.parseEther("5")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
      overrides,
    );
    await expect(oddzOptionManager.exercise(0)).to.be.revertedWith("Call option: Current price is too low");
    await oddzPriceOracle.setUnderlyingPrice(175000000000);
    await expect(oddzOptionManager.exercise(0))
      .to.emit(oddzOptionManager, "Exercise")
      .withArgs(0, 24000000000, 1000000000, ExcerciseType.Cash)
      .to.emit(oddzLiquidityPool, "Profit")
      .withArgs(0, 1428186620);
    expect((await oddzOptionManager.settlementFeeAggregate()).toNumber()).to.equal(1000000000);
  });

  it("Put option - excercise flow", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    await oddzOptionManager.addAsset(utils.formatBytes32String("ETH"), BigNumber.from(1e8));
    const asset = await oddzOptionManager.assets(0);
    const oddzLiquidityPool = await this.oddzLiquidityPool.connect(this.signers.admin);
    const oddzPriceOracle = await this.oddzPriceOracle.connect(this.signers.admin);
    await oddzLiquidityPool.addLiquidity({ value: 100000000000000 });
    const overrides = {
      value: utils.parseEther("1"), // ether in this case MUST be a string
    };
    await oddzOptionManager.buy(
      asset.id,
      getExpiry(2),
      BigNumber.from(utils.parseEther("5")), // number of options
      BigNumber.from(150000000000),
      OptionType.Put,
      overrides,
    );
    await expect(oddzOptionManager.exercise(0)).to.be.revertedWith("Put option: Current price is too high");
    await oddzPriceOracle.setUnderlyingPrice(145000000000);
    await expect(oddzOptionManager.exercise(0))
      .to.emit(oddzOptionManager, "Exercise")
      .withArgs(0, 24000000000, 1000000000, ExcerciseType.Cash)
      .to.emit(oddzLiquidityPool, "Loss")
      .withArgs(0, 4794690220);
    expect((await oddzOptionManager.settlementFeeAggregate()).toNumber()).to.equal(1000000000);
  });

  it("should throw an error when trying to excercise an option that is owned by other wallet", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    await oddzOptionManager.addAsset(utils.formatBytes32String("ETH"), BigNumber.from(1e8));
    const asset = await oddzOptionManager.assets(0);
    const oddzOptionManager1 = await this.oddzOptionManager.connect(this.signers.admin1);
    const oddzLiquidityPool = await this.oddzLiquidityPool.connect(this.signers.admin);
    await oddzLiquidityPool.addLiquidity({ value: 100000000000000 });
    const overrides = {
      value: utils.parseEther("1"), // ether in this case MUST be a string
    };
    await oddzOptionManager.buy(
      asset.id,
      getExpiry(2),
      BigNumber.from(utils.parseEther("5")), // number of options
      BigNumber.from(160000000000),
      OptionType.Call,
      overrides,
    );
    await expect(oddzOptionManager1.exercise(0)).to.be.revertedWith("Wrong msg.sender");
  });

  it("should throw an error when trying excercise an option if the option is not active", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    await oddzOptionManager.addAsset(utils.formatBytes32String("ETH"), BigNumber.from(1e8));
    const asset = await oddzOptionManager.assets(0);
    const oddzLiquidityPool = await this.oddzLiquidityPool.connect(this.signers.admin);
    await oddzLiquidityPool.addLiquidity({ value: 100000000000000 });
    const overrides = {
      value: utils.parseEther("1"), // ether in this case MUST be a string
    };
    await oddzOptionManager.buy(
      asset.id,
      getExpiry(1),
      BigNumber.from(utils.parseEther("5")), // number of options
      BigNumber.from(160000000000),
      OptionType.Call,
      overrides,
    );
    await expect(oddzOptionManager.exercise(0)).to.emit(oddzOptionManager, "Exercise");
    await expect(oddzOptionManager.exercise(0)).to.be.revertedWith("Wrong state");
  });

  it("should unlock the collateral locked if the option is expired", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    await oddzOptionManager.addAsset(utils.formatBytes32String("ETH"), BigNumber.from(1e8));
    const asset = await oddzOptionManager.assets(0);
    const oddzLiquidityPool = await this.oddzLiquidityPool.connect(this.signers.admin);
    await oddzLiquidityPool.addLiquidity({ value: 100000000000000 });
    const overrides = {
      value: utils.parseEther("1"), // ether in this case MUST be a string
    };
    await oddzOptionManager.buy(
      asset.id,
      getExpiry(1),
      BigNumber.from(utils.parseEther("10")), // number of options
      BigNumber.from(160000000000),
      OptionType.Call,
      overrides,
    );
    const op0 = await oddzOptionManager.options(0);
    await oddzOptionManager.buy(
      asset.id,
      getExpiry(1),
      BigNumber.from(utils.parseEther("10")), // number of options
      BigNumber.from(160000000000),
      OptionType.Call,
      overrides,
    );
    const op1 = await oddzOptionManager.options(1);
    await oddzOptionManager.buy(
      asset.id,
      getExpiry(1),
      BigNumber.from(utils.parseEther("10")), // number of options
      BigNumber.from(160000000000),
      OptionType.Call,
      overrides,
    );
    const op2 = await oddzOptionManager.options(2);
    const premiums = op0.premium.toNumber() + op1.premium.toNumber() + op2.premium.toNumber();
    // const surplusBeforeUpdate = (await oddzLiquidityPool.surplus()).toNumber();
    //console.log(surplusBeforeUpdate);
    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(2)]);
    await expect(oddzOptionManager.unlockAll([0, 1, 2])).to.emit(oddzOptionManager, "Expire");
    const collected = (await oddzLiquidityPool.premiumDayPool(addDaysAndGetSeconds(2))).collected.toNumber();
    expect(premiums).to.equal(collected);
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(++snapshotCount))]);
  });

  it("should distribute premium", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    await oddzOptionManager.addAsset(utils.formatBytes32String("ETH"), BigNumber.from(1e8));
    const asset = await oddzOptionManager.assets(0);
    const oddzLiquidityPool = await this.oddzLiquidityPool.connect(this.signers.admin);
    await oddzLiquidityPool.addLiquidity({ value: 100000000000000 });
    const overrides = {
      value: utils.parseEther("1"), // ether in this case MUST be a string
    };
    await oddzOptionManager.buy(
      asset.id,
      getExpiry(1),
      BigNumber.from(utils.parseEther("1")), // number of options
      BigNumber.from(145000000000),
      OptionType.Call,
      overrides,
    );

    await oddzOptionManager.buy(
      asset.id,
      getExpiry(10),
      BigNumber.from(utils.parseEther("1")), // number of options
      BigNumber.from(145000000000),
      OptionType.Call,
      overrides,
    );
    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(2)]);
    await expect(oddzOptionManager.unlock(0)).to.emit(oddzOptionManager, "Expire");
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(++snapshotCount))]);
    //console.log(await oddzLiquidityPool.premiumDayPool(addDaysAndGetSeconds(2)));
    // await provider.send("evm_increaseTime", [getExpiry(1)]);
    // // increment evm time by one more day at this point
    // await oddzLiquidityPool.distributePremium( addDaysAndGetSeconds(2), [this.signers.admin.getAddress()] );
    // check for lpPremium of admin address should be same as premium
    // also check premiumDayPool distributed increased same as premium
  });

  it("should throw an error when transaction fee updated", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    await expect(oddzOptionManager.setTransactionFeePerc(0)).to.be.revertedWith("Invalid transaction fee");
    await expect(oddzOptionManager.setTransactionFeePerc(11)).to.be.revertedWith("Invalid transaction fee");
  });

  it("should update transaction percentage and option transaction fee", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    await oddzOptionManager.addAsset(utils.formatBytes32String("ETH"), BigNumber.from(1e8));
    const asset = await oddzOptionManager.assets(0);
    const oddzLiquidityPool = await this.oddzLiquidityPool.connect(this.signers.admin);
    await oddzLiquidityPool.addLiquidity({ value: 100000000000000 });
    await oddzOptionManager.setTransactionFeePerc(2);
    expect(await oddzOptionManager.txnFeePerc()).to.equal(2);
    const option = await oddzOptionManager.getPremium(
      asset.id,
      getExpiry(1),
      BigNumber.from(utils.parseEther("1")), // number of options
      BigNumber.from(134100000000),
      OptionType.Call,
    );
    expect(option.txnFee.toNumber()).to.equal(544659190);
  });

  it("should update premium eligibilty correctly", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    await oddzOptionManager.addAsset(utils.formatBytes32String("ETH"), BigNumber.from(1e8));
    const asset = await oddzOptionManager.assets(0);
    const oddzLiquidityPool = await this.oddzLiquidityPool.connect(this.signers.admin);
    await oddzLiquidityPool.addLiquidity({ value: 100000000000000 });
    const overrides = {
      value: utils.parseEther("1"), // ether in this case MUST be a string
    };
    await oddzOptionManager.buy(
      asset.id,
      getExpiry(1),
      BigNumber.from(utils.parseEther("5")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
      overrides,
    );
    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(2)]);
    await oddzOptionManager.unlock(0);

    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(3)]);
    await oddzLiquidityPool.distributePremium(addDaysAndGetSeconds(2), [this.accounts.admin]);
    await expect((await oddzLiquidityPool.lpPremium(this.accounts.admin)).toNumber()).to.equal(13929002010);
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(++snapshotCount))]);
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(++snapshotCount))]);
  });

  // TODO: This case should be part of liquidity pool
  it("should withdraw premium successfully", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    await oddzOptionManager.addAsset(utils.formatBytes32String("ETH"), BigNumber.from(1e8));
    const asset = await oddzOptionManager.assets(0);
    const oddzLiquidityPool = await this.oddzLiquidityPool.connect(this.signers.admin);
    await oddzLiquidityPool.addLiquidity({ value: 100000000000000 });
    const overrides = {
      value: utils.parseEther("1"), // ether in this case MUST be a string
    };
    await oddzOptionManager.buy(
      asset.id,
      getExpiry(1),
      BigNumber.from(utils.parseEther("5")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
      overrides,
    );
    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(2)]);
    await expect(oddzOptionManager.unlock(0)).to.emit(oddzOptionManager, "Expire");

    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(3)]);
    await oddzLiquidityPool.distributePremium(addDaysAndGetSeconds(2), [this.accounts.admin]);
    await expect((await oddzLiquidityPool.lpPremium(this.accounts.admin)).toNumber()).to.equal(13929002010);

    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(15)]);
    await expect(oddzLiquidityPool.transferPremium()).to.emit(oddzLiquidityPool, "PremiumCollected");
    await expect((await oddzLiquidityPool.lpPremium(this.accounts.admin)).toNumber()).to.equal(0);
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(++snapshotCount))]);
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(++snapshotCount))]);
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(++snapshotCount))]);
  });

  // TODO: This case should be part of liquidity pool
  it("should update surplus and emit premium forfeited event", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    await oddzOptionManager.addAsset(utils.formatBytes32String("ETH"), BigNumber.from(1e8));
    const asset = await oddzOptionManager.assets(0);
    const oddzLiquidityPool = await this.oddzLiquidityPool.connect(this.signers.admin);
    await oddzLiquidityPool.addLiquidity({ value: 100000000000000 });
    const overrides = {
      value: utils.parseEther("1"), // ether in this case MUST be a string
    };
    await oddzOptionManager.buy(
      asset.id,
      getExpiry(1),
      BigNumber.from(utils.parseEther("5")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
      overrides,
    );
    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(2)]);
    await expect(oddzOptionManager.unlock(0)).to.emit(oddzOptionManager, "Expire");

    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(3)]);
    await oddzLiquidityPool.distributePremium(addDaysAndGetSeconds(2), [this.accounts.admin]);
    // Remove 10% of the liquidity
    await expect(oddzLiquidityPool.removeLiquidity(10000000000000)).to.emit(oddzLiquidityPool, "PremiumForfeited");
    await expect((await oddzLiquidityPool.surplus()).toNumber()).to.equal(1392900201);
    await expect((await oddzLiquidityPool.lpPremium(this.accounts.admin)).toNumber()).to.equal(12536101809);
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(++snapshotCount))]);
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(++snapshotCount))]);
  });

  // TODO: This case should be part of liquidity pool
  it("should throw error while withdraw liquidity", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    await oddzOptionManager.addAsset(utils.formatBytes32String("ETH"), BigNumber.from(1e8));
    const asset = await oddzOptionManager.assets(0);
    const oddzLiquidityPool = await this.oddzLiquidityPool.connect(this.signers.admin);
    await oddzLiquidityPool.addLiquidity({ value: 100000000000000 });
    const overrides = {
      value: utils.parseEther("1"), // ether in this case MUST be a string
    };
    await oddzOptionManager.buy(
      asset.id,
      getExpiry(1),
      BigNumber.from(utils.parseEther("5")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
      overrides,
    );
    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(2)]);
    await oddzOptionManager.unlock(0);

    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(3)]);
    await oddzLiquidityPool.distributePremium(addDaysAndGetSeconds(2), [this.accounts.admin]);
    await expect(oddzLiquidityPool.transferPremium()).to.be.revertedWith(
      "LP: Address not eligible for premium collection",
    );
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(++snapshotCount))]);
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(++snapshotCount))]);
  });

  // TODO: This case should be part of liquidity pool
  it("should send premium to the LP automatically for second liquidity after 14 days", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    await oddzOptionManager.addAsset(utils.formatBytes32String("ETH"), BigNumber.from(1e8));
    const asset = await oddzOptionManager.assets(0);
    const oddzLiquidityPool = await this.oddzLiquidityPool.connect(this.signers.admin);
    await oddzLiquidityPool.addLiquidity({ value: 100000000000000 });
    const overrides = {
      value: utils.parseEther("1"), // ether in this case MUST be a string
    };
    await oddzOptionManager.buy(
      asset.id,
      getExpiry(1),
      BigNumber.from(utils.parseEther("5")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
      overrides,
    );
    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(2)]);
    await oddzOptionManager.unlock(0);

    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(3)]);
    await oddzLiquidityPool.distributePremium(addDaysAndGetSeconds(2), [this.accounts.admin]);

    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(15)]);
    await expect(oddzLiquidityPool.addLiquidity({ value: 100000000000000 })).to.emit(
      oddzLiquidityPool,
      "PremiumCollected",
    );
    await expect((await oddzLiquidityPool.lpPremium(this.accounts.admin)).toNumber()).to.equal(0);
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(++snapshotCount))]);
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(++snapshotCount))]);
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(++snapshotCount))]);
  });

  // TODO: This case should be part of liquidity pool
  it("should not alter user premium eligibility", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    await oddzOptionManager.addAsset(utils.formatBytes32String("ETH"), BigNumber.from(1e8));
    const asset = await oddzOptionManager.assets(0);
    const oddzLiquidityPool = await this.oddzLiquidityPool.connect(this.signers.admin);
    await oddzLiquidityPool.addLiquidity({ value: 100000000000000 });
    const overrides = {
      value: utils.parseEther("1"), // ether in this case MUST be a string
    };
    await oddzOptionManager.buy(
      asset.id,
      getExpiry(1),
      BigNumber.from(utils.parseEther("5")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
      overrides,
    );
    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(2)]);
    await oddzOptionManager.unlock(0);

    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(3)]);
    await oddzLiquidityPool.distributePremium(addDaysAndGetSeconds(2), [this.accounts.admin]);
    // Maximum withdrawal 80% of (available balance - user premium) - 0.8 * (100000000000000 - 13929002010)
    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(15)]);
    await expect((await oddzLiquidityPool.lpPremium(this.accounts.admin)).toNumber()).to.equal(13929002010);
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(++snapshotCount))]);
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(++snapshotCount))]);
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(++snapshotCount))]);
  });

  it("should throw an error when trying to excercise an option that is expired", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    await oddzOptionManager.addAsset(utils.formatBytes32String("ETH"), BigNumber.from(1e8));
    const asset = await oddzOptionManager.assets(0);
    const oddzLiquidityPool = await this.oddzLiquidityPool.connect(this.signers.admin);
    await oddzLiquidityPool.addLiquidity({ value: 100000000000000 });
    const overrides = {
      value: utils.parseEther("1"), // ether in this case MUST be a string
    };
    await oddzOptionManager.buy(
      asset.id,
      getExpiry(1),
      BigNumber.from(utils.parseEther("1")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
      overrides,
    );

    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(2)]);
    await expect(oddzOptionManager.exercise(0)).to.be.revertedWith("Option has expired");
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(++snapshotCount))]);
  });

  it("should update settlement percentage and option excercise fee", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    await oddzOptionManager.addAsset(utils.formatBytes32String("ETH"), BigNumber.from(1e8));
    const asset = await oddzOptionManager.assets(0);
    const oddzLiquidityPool = await this.oddzLiquidityPool.connect(this.signers.admin);
    const oddzPriceOracle = await this.oddzPriceOracle.connect(this.signers.admin);
    await oddzOptionManager.setSettlementFeePerc(5);
    expect((await oddzOptionManager.settlementFeePerc()).toNumber()).to.equal(5);
    await oddzLiquidityPool.addLiquidity({ value: 100000000000000 });
    const overrides = {
      value: utils.parseEther("1"), // ether in this case MUST be a string
    };
    await oddzOptionManager.buy(
      asset.id,
      getExpiry(2),
      BigNumber.from(utils.parseEther("5")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
      overrides,
    );
    await expect(oddzOptionManager.exercise(0)).to.be.revertedWith("Call option: Current price is too low");
    await oddzPriceOracle.setUnderlyingPrice(175000000000);
    await expect(oddzOptionManager.exercise(0))
      .to.emit(oddzOptionManager, "Exercise")
      .withArgs(0, 23750000000, 1250000000, ExcerciseType.Cash)
      .to.emit(oddzLiquidityPool, "Profit")
      .withArgs(0, 1678186620);
    expect((await oddzOptionManager.settlementFeeAggregate()).toNumber()).to.equal(1250000000);
  });

  // TODO: This case should be part of liquidity pool
  it("should enable premium eligibility successfully", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    await oddzOptionManager.addAsset(utils.formatBytes32String("ETH"), BigNumber.from(1e8));
    const asset = await oddzOptionManager.assets(0);
    const oddzLiquidityPool = await this.oddzLiquidityPool.connect(this.signers.admin);
    await oddzLiquidityPool.addLiquidity({ value: 100000000000000 });
    const overrides = {
      value: utils.parseEther("1"), // ether in this case MUST be a string
    };
    await oddzOptionManager.buy(
      asset.id,
      getExpiry(1),
      BigNumber.from(utils.parseEther("1")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
      overrides,
    );
    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(2)]);
    await expect(oddzOptionManager.unlock(0)).to.emit(oddzOptionManager, "Expire");

    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(3)]);
    await oddzLiquidityPool.updatePremiumEligibility(addDaysAndGetSeconds(2));
    expect((await oddzLiquidityPool.premiumDayPool(addDaysAndGetSeconds(2))).enabled).to.equal(true);

    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(++snapshotCount))]);
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(++snapshotCount))]);
  });

  // TODO: This case should be part of liquidity pool
  it("should throw an error while enabling premium eligibility for a invalid date", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    await oddzOptionManager.addAsset(utils.formatBytes32String("ETH"), BigNumber.from(1e8));
    const asset = await oddzOptionManager.assets(0);
    const oddzLiquidityPool = await this.oddzLiquidityPool.connect(this.signers.admin);
    await oddzLiquidityPool.addLiquidity({ value: 100000000000000 });
    const overrides = {
      value: utils.parseEther("1"), // ether in this case MUST be a string
    };
    await oddzOptionManager.buy(
      asset.id,
      getExpiry(1),
      BigNumber.from(utils.parseEther("1")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
      overrides,
    );
    await expect(oddzLiquidityPool.updatePremiumEligibility(addDaysAndGetSeconds(1))).to.be.revertedWith(
      "LP: Invalid Date",
    );
  });

  // TODO: This case should be part of liquidity pool
  it("should throw an error while enableling premium eligibility for already enabled date", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    await oddzOptionManager.addAsset(utils.formatBytes32String("ETH"), BigNumber.from(1e8));
    const asset = await oddzOptionManager.assets(0);
    const oddzLiquidityPool = await this.oddzLiquidityPool.connect(this.signers.admin);
    await oddzLiquidityPool.addLiquidity({ value: 100000000000000 });
    const overrides = {
      value: utils.parseEther("1"), // ether in this case MUST be a string
    };
    await oddzOptionManager.buy(
      asset.id,
      getExpiry(1),
      BigNumber.from(utils.parseEther("1")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
      overrides,
    );
    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(2)]);
    await expect(oddzOptionManager.unlock(0)).to.emit(oddzOptionManager, "Expire");

    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(3)]);
    await oddzLiquidityPool.updatePremiumEligibility(addDaysAndGetSeconds(2));
    await expect(oddzLiquidityPool.updatePremiumEligibility(addDaysAndGetSeconds(2))).to.be.revertedWith(
      "LP: Premium eligibilty already updated for the date",
    );

    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(++snapshotCount))]);
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(++snapshotCount))]);
  });

  it("should send settlement fee aggragrate staking contract successfully", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    await oddzOptionManager.addAsset(utils.formatBytes32String("ETH"), BigNumber.from(1e8));
    const asset = await oddzOptionManager.assets(0);
    const oddzLiquidityPool = await this.oddzLiquidityPool.connect(this.signers.admin);
    const oddzPriceOracle = await this.oddzPriceOracle.connect(this.signers.admin);
    await oddzLiquidityPool.addLiquidity({ value: 100000000000000 });
    const overrides = {
      value: utils.parseEther("1"), // ether in this case MUST be a string
    };
    await oddzOptionManager.buy(
      asset.id,
      getExpiry(2),
      BigNumber.from(utils.parseEther("5")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
      overrides,
    );
    await expect(oddzOptionManager.exercise(0)).to.be.revertedWith("Call option: Current price is too low");
    await oddzPriceOracle.setUnderlyingPrice(175000000000);
    await oddzOptionManager.exercise(0);
    expect((await oddzOptionManager.settlementFeeAggregate()).toNumber()).to.equal(1000000000);
    await oddzOptionManager.transferSettlementFeeToBeneficiary();
    expect((await oddzOptionManager.settlementFeeAggregate()).toNumber()).to.equal(0);
  });

  it("should send transaction fee aggragrate staking contract successfully", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    await oddzOptionManager.addAsset(utils.formatBytes32String("ETH"), BigNumber.from(1e8));
    const asset = await oddzOptionManager.assets(0);
    const oddzLiquidityPool = await this.oddzLiquidityPool.connect(this.signers.admin);
    await oddzLiquidityPool.addLiquidity({ value: 100000000000000 });
    const overrides = {
      value: utils.parseEther("1"), // ether in this case MUST be a string
    };
    await oddzOptionManager.buy(
      asset.id,
      getExpiry(2),
      BigNumber.from(utils.parseEther("5")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
      overrides,
    );
    expect((await oddzOptionManager.txnFeeAggregate()).toNumber()).to.equal(1271409331);
    await oddzOptionManager.transferTxnFeeToBeneficiary();
    expect((await oddzOptionManager.txnFeeAggregate()).toNumber()).to.equal(0);
  });
}
