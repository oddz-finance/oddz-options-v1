import { expect } from "chai";
import { BigNumber,utils } from "ethers";

export function shouldBehaveLikeOddzAssetManager(): void {
  it("should add new asset", async function () {
    const oddzAssetManager = await this.oddzAssetManager.connect(this.signers.admin);
    await expect(oddzAssetManager.addAsset(utils.formatBytes32String("USD"), this.usdcToken.address, 8)).to.emit(
      oddzAssetManager,
      "NewAsset",
    );
    const asset = await oddzAssetManager.assets(0);
    expect(asset._id).to.be.equal(0);
  });

  it("should return newly added asset ids for multiple assets", async function () {
    const oddzAssetManager = await this.oddzAssetManager.connect(this.signers.admin);
    await oddzAssetManager.addAsset(utils.formatBytes32String("ETH"), this.ethToken.address, 8);
    const asset0 = await oddzAssetManager.assets(0);
    expect(asset0._id).to.be.equal(0);
    await oddzAssetManager.addAsset(utils.formatBytes32String("BTC"), this.btcToken.address, 8);
    const asset1 = await oddzAssetManager.assets(1);
    expect(asset1._id).to.be.equal(1);
  });

  it("should fail with message Asset already present", async function () {
    const oddzAssetManager = await this.oddzAssetManager.connect(this.signers.admin);
    // call should be optionType.call
    await oddzAssetManager.addAsset(utils.formatBytes32String("USD"), this.usdcToken.address, 8);
    await expect(
      oddzAssetManager.addAsset(utils.formatBytes32String("USD"), this.usdcToken.address, 8),
    ).to.be.revertedWith("Asset already present");
  });

  it("should activate asset successfully", async function () {
    const oddzAssetManager = await this.oddzAssetManager.connect(this.signers.admin);
    await oddzAssetManager.addAsset(utils.formatBytes32String("USD"), this.usdcToken.address, 8);
    await expect(oddzAssetManager.deactivateAsset(0));
    await expect(oddzAssetManager.activateAsset(0))
      .to.emit(oddzAssetManager, "AssetActivate")
      .withArgs(0, "0x5553440000000000000000000000000000000000000000000000000000000000");
  });

  it("should fail with message Asset is active", async function () {
    const oddzAssetManager = await this.oddzAssetManager.connect(this.signers.admin);
    // call should be optionType.call
    await oddzAssetManager.addAsset(utils.formatBytes32String("USD"), this.usdcToken.address, 8);
    await expect(oddzAssetManager.activateAsset(0)).to.be.revertedWith("Asset is active");
  });

  it("should deactivate asset successfully", async function () {
    const oddzAssetManager = await this.oddzAssetManager.connect(this.signers.admin);
    await oddzAssetManager.addAsset(utils.formatBytes32String("USD"), this.usdcToken.address, 8);
    await expect(oddzAssetManager.deactivateAsset(0))
      .to.emit(oddzAssetManager, "AssetDeactivate")
      .withArgs(0, "0x5553440000000000000000000000000000000000000000000000000000000000");
  });

  it("should fail with message Invalid asset", async function () {
    const oddzAssetManager = await this.oddzAssetManager.connect(this.signers.admin);
    // call should be optionType.call
    await oddzAssetManager.addAsset(utils.formatBytes32String("USD"), this.usdcToken.address, 8);
    await oddzAssetManager.deactivateAsset(0);
    await expect(oddzAssetManager.deactivateAsset(0)).to.be.revertedWith("Invalid Asset");
  });

  it("should add new asset pair", async function () {
    const oddzAssetManager = await this.oddzAssetManager.connect(this.signers.admin);
    await oddzAssetManager.addAsset(utils.formatBytes32String("USD"), this.usdcToken.address, 8);
    await oddzAssetManager.addAsset(utils.formatBytes32String("ETH"), this.ethToken.address, 8);
    await expect(oddzAssetManager.addAssetPair(1, 0, BigNumber.from(utils.parseEther("0.01"))))
      .to.emit(oddzAssetManager, "NewAssetPair")
      .withArgs(0, 1, 0, true, BigNumber.from(utils.parseEther("0.01")));
   
  });

  it("should fail with message Asset pair already present", async function () {
    const oddzAssetManager = await this.oddzAssetManager.connect(this.signers.admin);
    // call should be optionType.call
    await oddzAssetManager.addAsset(utils.formatBytes32String("USD"), this.usdcToken.address, 8);
    await oddzAssetManager.addAsset(utils.formatBytes32String("ETH"), this.ethToken.address, 8);
    await oddzAssetManager.addAssetPair(1, 0, BigNumber.from(utils.parseEther("0.01")));
    await expect(oddzAssetManager.addAssetPair(1, 0, BigNumber.from(utils.parseEther("0.01")))).to.be.revertedWith(
      "Asset pair already present",
    );
  });

  it("should activate asset pair successfully", async function () {
    const oddzAssetManager = await this.oddzAssetManager.connect(this.signers.admin);
    await oddzAssetManager.addAsset(utils.formatBytes32String("USD"), this.usdcToken.address, 8);
    await oddzAssetManager.addAsset(utils.formatBytes32String("ETH"), this.ethToken.address, 8);
    await oddzAssetManager.addAssetPair(1, 0, BigNumber.from(utils.parseEther("0.01")));
    const pair = await oddzAssetManager.pairs(0);
    await oddzAssetManager.deactivateAssetPair(pair._id);
    await expect(oddzAssetManager.activateAssetPair(pair._id))
      .to.emit(oddzAssetManager, "AssetActivatePair")
      .withArgs(0, 1, 0);
  });

  it("should fail with message Asset pair is active", async function () {
    const oddzAssetManager = await this.oddzAssetManager.connect(this.signers.admin);
    await oddzAssetManager.addAsset(utils.formatBytes32String("USD"), this.usdcToken.address, 8);
    await oddzAssetManager.addAsset(utils.formatBytes32String("ETH"), this.ethToken.address, 8);
    await expect(oddzAssetManager.addAssetPair(1, 0, BigNumber.from(utils.parseEther("0.01"))))
      .to.emit(oddzAssetManager, "NewAssetPair")
      .withArgs(0, 1, 0, true, BigNumber.from(utils.parseEther("0.01")));
    const pair = await oddzAssetManager.pairs(0);
    await expect(oddzAssetManager.activateAssetPair(pair._id)).to.be.revertedWith("Asset pair is active");
  });

  it("should deactivate asset pair successfully", async function () {
    const oddzAssetManager = await this.oddzAssetManager.connect(this.signers.admin);
    await oddzAssetManager.addAsset(utils.formatBytes32String("USD"), this.usdcToken.address, 8);
    await oddzAssetManager.addAsset(utils.formatBytes32String("ETH"), this.ethToken.address, 8);
    await oddzAssetManager.addAssetPair(1, 0, BigNumber.from(utils.parseEther("0.01")));
    const pair = await oddzAssetManager.pairs(0);
    await expect(oddzAssetManager.deactivateAssetPair(pair._id))
      .to.emit(oddzAssetManager, "AssetDeactivatePair")
      .withArgs(0, 1, 0);
  });

  it("should fail with message Invalid asset pair", async function () {
    const oddzAssetManager = await this.oddzAssetManager.connect(this.signers.admin);
    await oddzAssetManager.addAsset(utils.formatBytes32String("USD"), this.usdcToken.address, 8);
    await oddzAssetManager.addAsset(utils.formatBytes32String("ETH"), this.ethToken.address, 8);
    await expect(oddzAssetManager.addAssetPair(1, 0, BigNumber.from(utils.parseEther("0.01"))))
      .to.emit(oddzAssetManager, "NewAssetPair")
      .withArgs(0, 1, 0, true, BigNumber.from(utils.parseEther("0.01")));
    const pair = await oddzAssetManager.pairs(0);
    await oddzAssetManager.deactivateAssetPair(pair._id);
    await expect(oddzAssetManager.deactivateAssetPair(pair._id)).to.be.revertedWith("Invalid Asset pair");
  });

  it("should set asset pair purchase limit", async function () {
    const oddzAssetManager = await this.oddzAssetManager.connect(this.signers.admin);
    await oddzAssetManager.addAsset(utils.formatBytes32String("USD"), this.usdcToken.address, 8);
    await oddzAssetManager.addAsset(utils.formatBytes32String("ETH"), this.ethToken.address, 8);
    await oddzAssetManager.addAssetPair(1, 0, BigNumber.from(utils.parseEther("0.01")));

    await expect(oddzAssetManager.setPurchaseLimit(0, BigNumber.from(utils.parseEther("0.001"))))
      .to.emit(oddzAssetManager, "SetPurchaseLimit")
      .withArgs(0, 1, 0, BigNumber.from(utils.parseEther("0.001")));
  });

  it("should revert for invalid asset pair while setting purchase limit", async function () {
    const oddzAssetManager = await this.oddzAssetManager.connect(this.signers.admin);
    await oddzAssetManager.addAsset(utils.formatBytes32String("USD"), this.usdcToken.address, 8);
    await oddzAssetManager.addAsset(utils.formatBytes32String("ETH"), this.ethToken.address, 8);
    await oddzAssetManager.addAssetPair(1, 0, BigNumber.from(utils.parseEther("0.01")));

    await expect(oddzAssetManager.setPurchaseLimit(1, BigNumber.from(utils.parseEther("0.01")))).to.be.revertedWith(
      "Invalid Asset pair",
    );
  });

  it("should revert for non owner while setting purchase limit ", async function () {
    const oddzAssetManager = await this.oddzAssetManager.connect(this.signers.admin);
    await oddzAssetManager.addAsset(utils.formatBytes32String("USD"), this.usdcToken.address, 8);
    await oddzAssetManager.addAsset(utils.formatBytes32String("ETH"), this.ethToken.address, 8);
    await oddzAssetManager.addAssetPair(1, 0, BigNumber.from(utils.parseEther("0.01")));
    const oddzAssetManager1 = await this.oddzAssetManager.connect(this.signers.admin1);
    await expect(oddzAssetManager1.setPurchaseLimit(0, BigNumber.from(utils.parseEther("0.001")))).to.be.revertedWith(
      "caller is not the owner",
    );
  });
}
