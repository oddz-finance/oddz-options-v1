import { expect } from "chai";
import { BigNumber, utils } from "ethers";
import { address0 } from "../../test-utils";

export function shouldBehaveLikeOddzAssetManager(): void {
  it("should add new asset", async function () {
    const oddzAssetManager = await this.oddzAssetManager.connect(this.signers.admin);
    await expect(oddzAssetManager.addAsset(utils.formatBytes32String("USD"), this.usdcToken.address, 8)).to.emit(
      oddzAssetManager,
      "NewAsset",
    );
  });

  it("should fail with message Asset already present", async function () {
    const oddzAssetManager = await this.oddzAssetManager.connect(this.signers.admin);
    await oddzAssetManager.addAsset(utils.formatBytes32String("USD"), this.usdcToken.address, 8);
    await expect(
      oddzAssetManager.addAsset(utils.formatBytes32String("USD"), this.usdcToken.address, 8),
    ).to.be.revertedWith("Asset already present");
  });

  it("should revert for non owner while adding asset", async function () {
    const oddzAssetManager = await this.oddzAssetManager.connect(this.signers.admin1);
    await expect(
      oddzAssetManager.addAsset(utils.formatBytes32String("USD"), this.usdcToken.address, 8),
    ).to.be.revertedWith("caller is not the owner");
  });

  it("should activate asset successfully", async function () {
    const oddzAssetManager = await this.oddzAssetManager.connect(this.signers.admin);
    await oddzAssetManager.addAsset(utils.formatBytes32String("USD"), this.usdcToken.address, 8);
    await expect(oddzAssetManager.deactivateAsset(utils.formatBytes32String("USD")));
    await expect(oddzAssetManager.activateAsset(utils.formatBytes32String("USD")))
      .to.emit(oddzAssetManager, "AssetActivate")
      .withArgs("0x5553440000000000000000000000000000000000000000000000000000000000", this.usdcToken.address);
  });

  it("should fail with message Asset is active", async function () {
    const oddzAssetManager = await this.oddzAssetManager.connect(this.signers.admin);
    await oddzAssetManager.addAsset(utils.formatBytes32String("USD"), this.usdcToken.address, 8);
    await expect(oddzAssetManager.activateAsset(utils.formatBytes32String("USD"))).to.be.revertedWith(
      "Asset is active",
    );
  });

  it("should deactivate asset successfully", async function () {
    const oddzAssetManager = await this.oddzAssetManager.connect(this.signers.admin);
    await oddzAssetManager.addAsset(utils.formatBytes32String("USD"), this.usdcToken.address, 8);
    await expect(oddzAssetManager.deactivateAsset(utils.formatBytes32String("USD")))
      .to.emit(oddzAssetManager, "AssetDeactivate")
      .withArgs("0x5553440000000000000000000000000000000000000000000000000000000000", this.usdcToken.address);
  });

  it("should revert for non owner while deactivate asset", async function () {
    const oddzAssetManager = await this.oddzAssetManager.connect(this.signers.admin);
    await oddzAssetManager.addAsset(utils.formatBytes32String("USD"), this.usdcToken.address, 8);
    const oddzAssetManager1 = await this.oddzAssetManager.connect(this.signers.admin1);
    await expect(oddzAssetManager1.deactivateAsset(utils.formatBytes32String("USD"))).to.be.revertedWith(
      "caller is not the owner",
    );
  });

  it("should revert for non owner while activate asset", async function () {
    const oddzAssetManager = await this.oddzAssetManager.connect(this.signers.admin);
    await oddzAssetManager.addAsset(utils.formatBytes32String("USD"), this.usdcToken.address, 8);
    await oddzAssetManager.deactivateAsset(utils.formatBytes32String("USD"));
    const oddzAssetManager1 = await this.oddzAssetManager.connect(this.signers.admin1);
    await expect(oddzAssetManager1.activateAsset(utils.formatBytes32String("USD"))).to.be.revertedWith(
      "caller is not the owner",
    );
  });

  it("should fail with message Invalid asset", async function () {
    const oddzAssetManager = await this.oddzAssetManager.connect(this.signers.admin);
    await oddzAssetManager.addAsset(utils.formatBytes32String("USD"), this.usdcToken.address, 8);
    await oddzAssetManager.deactivateAsset(utils.formatBytes32String("USD"));
    await expect(oddzAssetManager.deactivateAsset(utils.formatBytes32String("USD"))).to.be.revertedWith(
      "Invalid Asset",
    );
  });

  it("should add new asset pair", async function () {
    const oddzAssetManager = await this.oddzAssetManager.connect(this.signers.admin);
    await oddzAssetManager.addAsset(utils.formatBytes32String("USD"), this.usdcToken.address, 8);
    await oddzAssetManager.addAsset(utils.formatBytes32String("ETH"), this.ethToken.address, 8);
    await expect(
      oddzAssetManager.addAssetPair(
        utils.formatBytes32String("ETH"),
        utils.formatBytes32String("USD"),
        BigNumber.from(utils.parseEther("0.01")),
      ),
    ).to.emit(oddzAssetManager, "NewAssetPair");
  });

  it("should fail with message Asset pair already present", async function () {
    const oddzAssetManager = await this.oddzAssetManager.connect(this.signers.admin);
    await oddzAssetManager.addAsset(utils.formatBytes32String("USD"), this.usdcToken.address, 8);
    await oddzAssetManager.addAsset(utils.formatBytes32String("ETH"), this.ethToken.address, 8);
    await oddzAssetManager.addAssetPair(
      utils.formatBytes32String("ETH"),
      utils.formatBytes32String("USD"),
      BigNumber.from(utils.parseEther("0.01")),
    );
    await expect(
      oddzAssetManager.addAssetPair(
        utils.formatBytes32String("ETH"),
        utils.formatBytes32String("USD"),
        BigNumber.from(utils.parseEther("0.01")),
      ),
    ).to.be.revertedWith("Asset pair already present");
  });

  it("should revert for non owner while adding asset pair", async function () {
    const oddzAssetManager = await this.oddzAssetManager.connect(this.signers.admin);
    await oddzAssetManager.addAsset(utils.formatBytes32String("USD"), this.usdcToken.address, 8);
    await oddzAssetManager.addAsset(utils.formatBytes32String("ETH"), this.ethToken.address, 8);
    const oddzAssetManager1 = await this.oddzAssetManager.connect(this.signers.admin1);
    await expect(
      oddzAssetManager1.addAssetPair(
        utils.formatBytes32String("ETH"),
        utils.formatBytes32String("USD"),
        BigNumber.from(utils.parseEther("0.01")),
      ),
    ).to.be.revertedWith("caller is not the owner");
  });

  it("should activate asset pair successfully", async function () {
    const oddzAssetManager = await this.oddzAssetManager.connect(this.signers.admin);
    await oddzAssetManager.addAsset(utils.formatBytes32String("USD"), this.usdcToken.address, 8);
    await oddzAssetManager.addAsset(utils.formatBytes32String("ETH"), this.ethToken.address, 8);
    await oddzAssetManager.addAssetPair(
      utils.formatBytes32String("ETH"),
      utils.formatBytes32String("USD"),
      BigNumber.from(utils.parseEther("0.01")),
    );

    const addr = (await oddzAssetManager.pairMap(utils.formatBytes32String("ETH"), utils.formatBytes32String("USD")))
      ._address;

    await oddzAssetManager.deactivateAssetPair(addr);
    await expect(oddzAssetManager.activateAssetPair(addr))
      .to.emit(oddzAssetManager, "AssetActivatePair")
      .withArgs(addr, utils.formatBytes32String("ETH"), utils.formatBytes32String("USD"));
  });

  it("should fail with message Asset pair is active", async function () {
    const oddzAssetManager = await this.oddzAssetManager.connect(this.signers.admin);
    await oddzAssetManager.addAsset(utils.formatBytes32String("USD"), this.usdcToken.address, 8);
    await oddzAssetManager.addAsset(utils.formatBytes32String("ETH"), this.ethToken.address, 8);
    await expect(
      oddzAssetManager.addAssetPair(
        utils.formatBytes32String("ETH"),
        utils.formatBytes32String("USD"),
        BigNumber.from(utils.parseEther("0.01")),
      ),
    ).to.emit(oddzAssetManager, "NewAssetPair");

    const addr = (await oddzAssetManager.pairMap(utils.formatBytes32String("ETH"), utils.formatBytes32String("USD")))
      ._address;
    await expect(oddzAssetManager.activateAssetPair(addr)).to.be.revertedWith("Asset pair is active");
  });

  it("should deactivate asset pair successfully", async function () {
    const oddzAssetManager = await this.oddzAssetManager.connect(this.signers.admin);
    await oddzAssetManager.addAsset(utils.formatBytes32String("USD"), this.usdcToken.address, 8);
    await oddzAssetManager.addAsset(utils.formatBytes32String("ETH"), this.ethToken.address, 8);
    await oddzAssetManager.addAssetPair(
      utils.formatBytes32String("ETH"),
      utils.formatBytes32String("USD"),
      BigNumber.from(utils.parseEther("0.01")),
    );
    const addr = (await oddzAssetManager.pairMap(utils.formatBytes32String("ETH"), utils.formatBytes32String("USD")))
      ._address;
    await expect(oddzAssetManager.deactivateAssetPair(addr))
      .to.emit(oddzAssetManager, "AssetDeactivatePair")
      .withArgs(addr, utils.formatBytes32String("ETH"), utils.formatBytes32String("USD"));
  });

  it("should revert for non owner while deactivate asset pair", async function () {
    const oddzAssetManager = await this.oddzAssetManager.connect(this.signers.admin);
    await oddzAssetManager.addAsset(utils.formatBytes32String("USD"), this.usdcToken.address, 8);
    await oddzAssetManager.addAsset(utils.formatBytes32String("ETH"), this.ethToken.address, 8);
    await oddzAssetManager.addAssetPair(
      utils.formatBytes32String("ETH"),
      utils.formatBytes32String("USD"),
      BigNumber.from(utils.parseEther("0.01")),
    );
    const addr = (await oddzAssetManager.pairMap(utils.formatBytes32String("ETH"), utils.formatBytes32String("USD")))
      ._address;
    const oddzAssetManager1 = await this.oddzAssetManager.connect(this.signers.admin1);
    await expect(oddzAssetManager1.deactivateAssetPair(addr)).to.be.revertedWith("caller is not the owner");
  });

  it("should revert for non owner while activate asset pair", async function () {
    const oddzAssetManager = await this.oddzAssetManager.connect(this.signers.admin);
    await oddzAssetManager.addAsset(utils.formatBytes32String("USD"), this.usdcToken.address, 8);
    await oddzAssetManager.addAsset(utils.formatBytes32String("ETH"), this.ethToken.address, 8);
    await oddzAssetManager.addAssetPair(
      utils.formatBytes32String("ETH"),
      utils.formatBytes32String("USD"),
      BigNumber.from(utils.parseEther("0.01")),
    );
    const addr = (await oddzAssetManager.pairMap(utils.formatBytes32String("ETH"), utils.formatBytes32String("USD")))
      ._address;
    await oddzAssetManager.deactivateAssetPair(addr);
    const oddzAssetManager1 = await this.oddzAssetManager.connect(this.signers.admin1);
    await expect(oddzAssetManager1.activateAssetPair(addr)).to.be.revertedWith("caller is not the owner");
  });

  it("should fail with message Invalid asset pair", async function () {
    const oddzAssetManager = await this.oddzAssetManager.connect(this.signers.admin);
    await oddzAssetManager.addAsset(utils.formatBytes32String("USD"), this.usdcToken.address, 8);
    await oddzAssetManager.addAsset(utils.formatBytes32String("ETH"), this.ethToken.address, 8);
    await expect(
      oddzAssetManager.addAssetPair(
        utils.formatBytes32String("ETH"),
        utils.formatBytes32String("USD"),
        BigNumber.from(utils.parseEther("0.01")),
      ),
    ).to.emit(oddzAssetManager, "NewAssetPair");
    const addr = (await oddzAssetManager.pairMap(utils.formatBytes32String("ETH"), utils.formatBytes32String("USD")))
      ._address;
    await oddzAssetManager.deactivateAssetPair(addr);
    await expect(oddzAssetManager.deactivateAssetPair(addr)).to.be.revertedWith("Invalid Asset pair");
  });

  it("should set asset pair purchase limit", async function () {
    const oddzAssetManager = await this.oddzAssetManager.connect(this.signers.admin);
    await oddzAssetManager.addAsset(utils.formatBytes32String("USD"), this.usdcToken.address, 8);
    await oddzAssetManager.addAsset(utils.formatBytes32String("ETH"), this.ethToken.address, 8);
    await oddzAssetManager.addAssetPair(
      utils.formatBytes32String("ETH"),
      utils.formatBytes32String("USD"),
      BigNumber.from(utils.parseEther("0.01")),
    );

    const addr = (await oddzAssetManager.pairMap(utils.formatBytes32String("ETH"), utils.formatBytes32String("USD")))
      ._address;

    await expect(oddzAssetManager.setPurchaseLimit(addr, BigNumber.from(utils.parseEther("0.001"))))
      .to.emit(oddzAssetManager, "SetPurchaseLimit")
      .withArgs(
        addr,
        utils.formatBytes32String("ETH"),
        utils.formatBytes32String("USD"),
        BigNumber.from(utils.parseEther("0.001")),
      );
  });

  it("should revert for invalid asset pair while setting purchase limit", async function () {
    const oddzAssetManager = await this.oddzAssetManager.connect(this.signers.admin);
    await oddzAssetManager.addAsset(utils.formatBytes32String("USD"), this.usdcToken.address, 8);
    await oddzAssetManager.addAsset(utils.formatBytes32String("ETH"), this.ethToken.address, 8);
    await oddzAssetManager.addAssetPair(
      utils.formatBytes32String("ETH"),
      utils.formatBytes32String("USD"),
      BigNumber.from(utils.parseEther("0.01")),
    );

    const addr = (await oddzAssetManager.pairMap(utils.formatBytes32String("ETH"), utils.formatBytes32String("USD")))
      ._address;

    await expect(
      oddzAssetManager.setPurchaseLimit(address0(), BigNumber.from(utils.parseEther("0.01"))),
    ).to.be.revertedWith("Invalid Asset pair");
  });

  it("should revert for non owner while setting purchase limit ", async function () {
    const oddzAssetManager = await this.oddzAssetManager.connect(this.signers.admin);
    await oddzAssetManager.addAsset(utils.formatBytes32String("USD"), this.usdcToken.address, 8);
    await oddzAssetManager.addAsset(utils.formatBytes32String("ETH"), this.ethToken.address, 8);
    await oddzAssetManager.addAssetPair(
      utils.formatBytes32String("ETH"),
      utils.formatBytes32String("USD"),
      BigNumber.from(utils.parseEther("0.01")),
    );
    const addr = (await oddzAssetManager.pairMap(utils.formatBytes32String("ETH"), utils.formatBytes32String("USD")))
      ._address;
    const oddzAssetManager1 = await this.oddzAssetManager.connect(this.signers.admin1);
    await expect(
      oddzAssetManager1.setPurchaseLimit(addr, BigNumber.from(utils.parseEther("0.001"))),
    ).to.be.revertedWith("caller is not the owner");
  });
}
