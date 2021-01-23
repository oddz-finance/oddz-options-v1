import { expect } from "chai";
import {BigNumber, utils} from "ethers";
import {OptionType} from '../../test-utils';

export function shouldBehaveLikeOddzOptionManager(): void {
  it("should fail with message invalid asset", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    await expect(
      oddzOptionManager.getPremium(
        1,
        Date.now(),
        BigNumber.from(100),
        BigNumber.from(1234),
        OptionType.Call,
      )
    ).to.be.revertedWith("Invalid Asset");
  });
  it("should fail with message Asset already present", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    // call should be optionType.call
    await oddzOptionManager.addAsset(
      utils.formatBytes32String("ETH"),
      BigNumber.from(100000),
    );
    await expect(oddzOptionManager.addAsset(
      utils.formatBytes32String("ETH"),
      BigNumber.from(100000),
    )).to.be.revertedWith("Asset already present");
  });
  it("should return newly added asset id", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    const assetId = await oddzOptionManager.addAsset(
      utils.formatBytes32String("ETH"),
      BigNumber.from(100000),
    );
    expect(assetId.value.toNumber()).to.equal(0);
  });
  // it("should return newly added asset ids for multiple assets", async function () {
  //   const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
  //   await expect(oddzOptionManager.addAsset(
  //     utils.formatBytes32String("ETH"),
  //     BigNumber.from(100000),
  //   )).to.be.equal(0);
  //   await expect(oddzOptionManager.addAsset(
  //     utils.formatBytes32String("BTC"),
  //     BigNumber.from(100000),
  //   )).to.be.equal(1);
  // });
  it("should return the premium price", async function () {

    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    // call should be optionType.call
    const assetId = await oddzOptionManager.addAsset(
      utils.formatBytes32String("ETH"),
      BigNumber.from(100000),
    );
    const option = await oddzOptionManager.getPremium(
      assetId.value.toNumber(),
      Date.now(),
      BigNumber.from(1000), // number of options
      BigNumber.from(1234),
      OptionType.Call,
    );
    const {optionPremium, settlementFee, cp, iv} = option;
    expect(iv.toNumber()).to.equal(1);
    expect(optionPremium.toNumber()).to.equal(33);
    expect(settlementFee.toNumber()).to.equal(10); //shouldn't the settlement fee a % of optionPremium?
    expect(cp.toNumber()).to.equal(1200);
  });

  it("should throw Expiration cannot be less than 1 days error when the expiry is less than a day", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    await expect(oddzOptionManager.buy(
      1,
      BigNumber.from(24 * 3600 * 0),
      BigNumber.from(100),
      BigNumber.from(1234),
      OptionType.Call)
    ).to.be.revertedWith("Expiration cannot be less than 1 days");
  });

  it("should throw Expiration cannot be more than 30 days error when the expiry is more than a 30 days", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    await expect(oddzOptionManager.buy(
      1,
      BigNumber.from(24 * 3600 * 31),
      BigNumber.from(100),
      BigNumber.from(1234),
      OptionType.Call)
    ).to.be.revertedWith("Expiration cannot be more than 30 days");
  });

  it("should prevent buying options for unsupported asset type", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    await expect(oddzOptionManager.buy(
      1,
      BigNumber.from(24 * 3600 * 1),
      BigNumber.from(100),
      BigNumber.from(1234),
      OptionType.Call)
    ).to.be.revertedWith("Invalid Asset");
  });

  it("should buy option if the asset is supported and emit buy event", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    const assetId = await oddzOptionManager.addAsset(
      utils.formatBytes32String("WBTC"),
      BigNumber.from(100000),
    );
    await expect(oddzOptionManager.buy(
      assetId.value.toNumber(),
      BigNumber.from(24 * 3600 * 1),
      BigNumber.from(1000),
      BigNumber.from(1200),
      OptionType.Call)
    ).to.emit(oddzOptionManager, 'Buy');
  });
}
