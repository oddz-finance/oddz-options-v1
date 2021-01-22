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
  it("should fail with message invalid asset", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    // call should be optionType.call
    const assetId = await oddzOptionManager.addAsset(
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
    const asset = await oddzOptionManager.assets(0);
    expect(asset.id).to.be.equal(0);
  });
  it("should return newly added asset ids for multiple assets", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    await oddzOptionManager.addAsset(
      utils.formatBytes32String("ETH"),
      BigNumber.from(100000),
    );
    const asset0 = await oddzOptionManager.assets(0);
    expect(asset0.id).to.be.equal(0);
    await oddzOptionManager.addAsset(
      utils.formatBytes32String("BTC"),
      BigNumber.from(100000),
    );
    const asset1 = await oddzOptionManager.assets(1);
    expect(asset1.id).to.be.equal(1);
  });
  it("should return the premium price", async function () {

    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    // call should be optionType.call
    const assetId = await oddzOptionManager.addAsset(
      utils.formatBytes32String("ETH"),
      BigNumber.from(100000),
    );
    const asset = await oddzOptionManager.assets(0);
    const optionPremium = await oddzOptionManager.getPremium(
      asset.id,
      Date.now(),
      BigNumber.from(100),
      BigNumber.from(1234),
      OptionType.Call,
    );
    console.log(optionPremium);
  });
}
