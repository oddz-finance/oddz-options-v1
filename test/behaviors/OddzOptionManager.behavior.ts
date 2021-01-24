import { expect } from "chai";
import { BigNumber, ethers, utils } from "ethers";
import { OptionType } from "../../test-utils";
import exp from "constants";
import { waffle } from "hardhat";

const provider = waffle.provider;

export function shouldBehaveLikeOddzOptionManager(): void {
  it("should fail with message invalid asset", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    await expect(
      oddzOptionManager.getPremium(1, Date.now(), BigNumber.from(100), BigNumber.from(1234), OptionType.Call),
    ).to.be.revertedWith("Invalid Asset");
  });
  it("should fail with message Asset already present", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    // call should be optionType.call
    await oddzOptionManager.addAsset(utils.formatBytes32String("ETH"), BigNumber.from(100000));
    await expect(
      oddzOptionManager.addAsset(utils.formatBytes32String("ETH"), BigNumber.from(100000)),
    ).to.be.revertedWith("Asset already present");
  });
  it("should add new asset", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    await expect(oddzOptionManager.addAsset(utils.formatBytes32String("ETH"), BigNumber.from(100000))).to.emit(
      oddzOptionManager,
      "NewAsset",
    );
  });
  it("should emit new asset event", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    const assetId = await oddzOptionManager.addAsset(utils.formatBytes32String("ETH"), BigNumber.from(100000));
    const asset = await oddzOptionManager.assets(0);
    expect(asset.id).to.be.equal(0);
  });
  it("should return newly added asset ids for multiple assets", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    await oddzOptionManager.addAsset(utils.formatBytes32String("ETH"), BigNumber.from(100000));
    const asset0 = await oddzOptionManager.assets(0);
    expect(asset0.id).to.be.equal(0);
    await oddzOptionManager.addAsset(utils.formatBytes32String("BTC"), BigNumber.from(100000));
    const asset1 = await oddzOptionManager.assets(1);
    expect(asset1.id).to.be.equal(1);
  });
  it("should return the premium price", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    // call should be optionType.call
    const assetId = await oddzOptionManager.addAsset(utils.formatBytes32String("ETH"), BigNumber.from(100000));
    const asset = await oddzOptionManager.assets(0);
    const option = await oddzOptionManager.getPremium(
      asset.id,
      Date.now(),
      BigNumber.from(1000), // number of options
      BigNumber.from(1234),
      OptionType.Call,
    );
    const { optionPremium, settlementFee, cp, iv } = option;
    expect(iv.toNumber()).to.equal(1);
    expect(optionPremium.toNumber()).to.equal(33);
    expect(settlementFee.toNumber()).to.equal(10); //shouldn't the settlement fee a % of optionPremium?
    expect(cp.toNumber()).to.equal(1200);
  });

  it("should throw Expiration cannot be less than 1 days error when the expiry is less than a day", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    await expect(
      oddzOptionManager.buy(
        1,
        BigNumber.from(24 * 3600 * 0),
        BigNumber.from(100),
        BigNumber.from(1234),
        OptionType.Call,
      ),
    ).to.be.revertedWith("Expiration cannot be less than 1 days");
  });

  it("should throw Expiration cannot be more than 30 days error when the expiry is more than a 30 days", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    await expect(
      oddzOptionManager.buy(
        1,
        BigNumber.from(24 * 3600 * 31),
        BigNumber.from(100),
        BigNumber.from(1234),
        OptionType.Call,
      ),
    ).to.be.revertedWith("Expiration cannot be more than 30 days");
  });

  it("should prevent buying options for unsupported asset type", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    await expect(
      oddzOptionManager.buy(
        1,
        BigNumber.from(24 * 3600 * 1),
        BigNumber.from(100),
        BigNumber.from(1234),
        OptionType.Call,
      ),
    ).to.be.revertedWith("Invalid Asset");
  });

  it("should buy option if the asset is supported and emit buy event", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    const assetId = await oddzOptionManager.addAsset(utils.formatBytes32String("WBTC"), BigNumber.from(100000));
    await expect(
      oddzOptionManager.buy(
        assetId.value.toNumber(),
        BigNumber.from(24 * 3600 * 1),
        BigNumber.from(1000),
        BigNumber.from(1200),
        OptionType.Call,
      ),
    ).to.emit(oddzOptionManager, "Buy");
  });

  it("should excercise option if the asset is supported and emit excercise event", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    const assetId = await oddzOptionManager.addAsset(utils.formatBytes32String("WBTC"), BigNumber.from(100000));

    const optionBought = await oddzOptionManager.buy(
      assetId.value.toNumber(),
      BigNumber.from(24 * 3600 * 1),
      BigNumber.from(1000),
      BigNumber.from(1200),
      OptionType.Call,
    );
    await expect(oddzOptionManager.exercise(optionBought.value.toNumber())).to.emit(oddzOptionManager, "Exercise");
  });

  it("should throw an error when trying to excercise an option that is expired", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    const assetId = await oddzOptionManager.addAsset(utils.formatBytes32String("WBTC"), BigNumber.from(100000));
    const optionBought = await oddzOptionManager.buy(
      assetId.value.toNumber(),
      BigNumber.from(24 * 3600 * 1),
      BigNumber.from(1000),
      BigNumber.from(1200),
      OptionType.Call,
    );
    await provider.send("evm_increaseTime", [24 * 3600 * 2]);
    await expect(oddzOptionManager.exercise(optionBought.value.toNumber())).to.be.revertedWith("Option has expired");
  });

  it("should throw an error when trying to excercise an option that is owned by other wallet", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    const assetId = await oddzOptionManager.addAsset(utils.formatBytes32String("WBTC"), BigNumber.from(100000));
    const oddzOptionManager1 = await this.oddzOptionManager.connect(this.signers.admin1);
    const optionBought = await oddzOptionManager.buy(
      assetId.value.toNumber(),
      BigNumber.from(24 * 3600 * 1),
      BigNumber.from(1000),
      BigNumber.from(1200),
      OptionType.Call,
    );
    await expect(oddzOptionManager1.exercise(optionBought.value.toNumber())).to.be.revertedWith("Wrong msg.sender");
  });

  it("should throw an error when trying excercise an option if the option is not active", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    const assetId = await oddzOptionManager.addAsset(utils.formatBytes32String("WBTC"), BigNumber.from(100000));

    const optionBought = await oddzOptionManager.buy(
      assetId.value.toNumber(),
      BigNumber.from(24 * 3600 * 1),
      BigNumber.from(1000),
      BigNumber.from(1200),
      OptionType.Call,
    );
    await expect(oddzOptionManager.exercise(optionBought.value.toNumber())).to.emit(oddzOptionManager, "Exercise");
    await expect(oddzOptionManager.exercise(optionBought.value.toNumber())).to.be.revertedWith("Wrong state");
  });
}
