import { expect } from "chai";
import { BigNumber, utils } from "ethers";

export function shouldBehaveLikeOddzAssetManager(): void {
  it("should add new asset", async function () {
    const oddzAssetManager = await this.oddzAssetManager.connect(this.signers.admin);
    await expect(
      oddzAssetManager.addAsset(utils.formatBytes32String("USD"), this.usdcToken.address, BigNumber.from(1e8)),
    ).to.emit(oddzAssetManager, "NewAsset");
    const asset = await oddzAssetManager.assets(0);
    expect(asset._id).to.be.equal(0);
  });

  it("should return newly added asset ids for multiple assets", async function () {
    const oddzAssetManager = await this.oddzAssetManager.connect(this.signers.admin);
    await oddzAssetManager.addAsset(utils.formatBytes32String("ETH"), this.ethToken.address, BigNumber.from(1e8));
    const asset0 = await oddzAssetManager.assets(0);
    expect(asset0._id).to.be.equal(0);
    await oddzAssetManager.addAsset(utils.formatBytes32String("BTC"), this.btcToken.address, BigNumber.from(1e8));
    const asset1 = await oddzAssetManager.assets(1);
    expect(asset1._id).to.be.equal(1);
  });

  it("should fail with message Asset already present", async function () {
    const oddzAssetManager = await this.oddzAssetManager.connect(this.signers.admin);
    // call should be optionType.call
    await oddzAssetManager.addAsset(utils.formatBytes32String("USD"), this.usdcToken.address, BigNumber.from(1e8));
    await expect(
      oddzAssetManager.addAsset(utils.formatBytes32String("USD"), this.usdcToken.address, BigNumber.from(1e8)),
    ).to.be.revertedWith("Asset already present");
  });

  it("should activate asset successfully", async function () {
    const oddzAssetManager = await this.oddzAssetManager.connect(this.signers.admin);
    await oddzAssetManager.addAsset(utils.formatBytes32String("USD"), this.usdcToken.address, BigNumber.from(1e8));
    await expect(oddzAssetManager.deactivateAsset(0));
    await expect(oddzAssetManager.activateAsset(0))
      .to.emit(oddzAssetManager, "AssetActivate")
      .withArgs(0, "0x5553440000000000000000000000000000000000000000000000000000000000");
  });

  it("should fail with message Asset is active", async function () {
    const oddzAssetManager = await this.oddzAssetManager.connect(this.signers.admin);
    // call should be optionType.call
    await oddzAssetManager.addAsset(utils.formatBytes32String("USD"), this.usdcToken.address, BigNumber.from(1e8));
    await expect(oddzAssetManager.activateAsset(0)).to.be.revertedWith("Asset is active");
  });

  it("should deactivate asset successfully", async function () {
    const oddzAssetManager = await this.oddzAssetManager.connect(this.signers.admin);
    await oddzAssetManager.addAsset(utils.formatBytes32String("USD"), this.usdcToken.address, BigNumber.from(1e8));
    await expect(oddzAssetManager.deactivateAsset(0))
      .to.emit(oddzAssetManager, "AssetDeactivate")
      .withArgs(0, "0x5553440000000000000000000000000000000000000000000000000000000000");
  });

  it("should fail with message Invalid asset", async function () {
    const oddzAssetManager = await this.oddzAssetManager.connect(this.signers.admin);
    // call should be optionType.call
    await oddzAssetManager.addAsset(utils.formatBytes32String("USD"), this.usdcToken.address, BigNumber.from(1e8));
    await oddzAssetManager.deactivateAsset(0);
    await expect(oddzAssetManager.deactivateAsset(0)).to.be.revertedWith("Invalid Asset");
  });

  it("should add new asset pair", async function () {
    const oddzAssetManager = await this.oddzAssetManager.connect(this.signers.admin);
    await oddzAssetManager.addAsset(utils.formatBytes32String("USD"), this.usdcToken.address, BigNumber.from(1e8));
    await oddzAssetManager.addAsset(utils.formatBytes32String("ETH"), this.ethToken.address, BigNumber.from(1e8));
    await expect(oddzAssetManager.addAssetPair(1, 0)).to.emit(oddzAssetManager, "NewAssetPair").withArgs(0, 1, 0, true);
  });

  it("should fail with message Asset pair already present", async function () {
    const oddzAssetManager = await this.oddzAssetManager.connect(this.signers.admin);
    // call should be optionType.call
    await oddzAssetManager.addAsset(utils.formatBytes32String("USD"), this.usdcToken.address, BigNumber.from(1e8));
    await oddzAssetManager.addAsset(utils.formatBytes32String("ETH"), this.ethToken.address, BigNumber.from(1e8));
    await oddzAssetManager.addAssetPair(1, 0);
    await expect(oddzAssetManager.addAssetPair(1, 0)).to.be.revertedWith("Asset pair already present");
  });

  it("should activate asset pair successfully", async function () {
    const oddzAssetManager = await this.oddzAssetManager.connect(this.signers.admin);
    await oddzAssetManager.addAsset(utils.formatBytes32String("USD"), this.usdcToken.address, BigNumber.from(1e8));
    await oddzAssetManager.addAsset(utils.formatBytes32String("ETH"), this.ethToken.address, BigNumber.from(1e8));
    await oddzAssetManager.addAssetPair(1, 0);
    const pair = await oddzAssetManager.pairs(0);
    await oddzAssetManager.deactivateAssetPair(pair._id);
    await expect(oddzAssetManager.activateAssetPair(pair._id))
      .to.emit(oddzAssetManager, "AssetActivatePair")
      .withArgs(0, 1, 0);
  });

  it("should fail with message Asset pair is active", async function () {
    const oddzAssetManager = await this.oddzAssetManager.connect(this.signers.admin);
    await oddzAssetManager.addAsset(utils.formatBytes32String("USD"), this.usdcToken.address, BigNumber.from(1e8));
    await oddzAssetManager.addAsset(utils.formatBytes32String("ETH"), this.ethToken.address, BigNumber.from(1e8));
    await expect(oddzAssetManager.addAssetPair(1, 0)).to.emit(oddzAssetManager, "NewAssetPair").withArgs(0, 1, 0, true);
    const pair = await oddzAssetManager.pairs(0);
    await expect(oddzAssetManager.activateAssetPair(pair._id)).to.be.revertedWith("Asset pair is active");
  });

  it("should deactivate asset pair successfully", async function () {
    const oddzAssetManager = await this.oddzAssetManager.connect(this.signers.admin);
    await oddzAssetManager.addAsset(utils.formatBytes32String("USD"), this.usdcToken.address, BigNumber.from(1e8));
    await oddzAssetManager.addAsset(utils.formatBytes32String("ETH"), this.ethToken.address, BigNumber.from(1e8));
    await oddzAssetManager.addAssetPair(1, 0);
    const pair = await oddzAssetManager.pairs(0);
    await expect(oddzAssetManager.deactivateAssetPair(pair._id))
      .to.emit(oddzAssetManager, "AssetDeactivatePair")
      .withArgs(0, 1, 0);
  });

  it("should fail with message Invalid asset pair", async function () {
    const oddzAssetManager = await this.oddzAssetManager.connect(this.signers.admin);
    await oddzAssetManager.addAsset(utils.formatBytes32String("USD"), this.usdcToken.address, BigNumber.from(1e8));
    await oddzAssetManager.addAsset(utils.formatBytes32String("ETH"), this.ethToken.address, BigNumber.from(1e8));
    await expect(oddzAssetManager.addAssetPair(1, 0)).to.emit(oddzAssetManager, "NewAssetPair").withArgs(0, 1, 0, true);
    const pair = await oddzAssetManager.pairs(0);
    await oddzAssetManager.deactivateAssetPair(pair._id);
    await expect(oddzAssetManager.deactivateAssetPair(pair._id)).to.be.revertedWith("Invalid Asset pair");
  });
}
