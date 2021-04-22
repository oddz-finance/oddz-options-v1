import { expect } from "chai";
import { BigNumber, utils, constants } from "ethers";
import { OddzAssetManager, MockERC20 } from "../../typechain";
import { Signer } from "@ethersproject/abstract-signer";

const addAssetPair = async (
  oddzAssetManager: OddzAssetManager,
  admin: Signer,
  usdcToken: MockERC20,
  ethToken: MockERC20,
) => {
  const oam = await oddzAssetManager.connect(admin);
  await oam.addAsset(utils.formatBytes32String("USD"), usdcToken.address, 8);
  await oam.addAsset(utils.formatBytes32String("ETH"), ethToken.address, 8);
  await oam.addAssetPair(
    utils.formatBytes32String("ETH"),
    utils.formatBytes32String("USD"),
    BigNumber.from(utils.parseEther("0.01")),
    2592000,
    86400,
  );
};

export function shouldBehaveLikeOddzDexManager(): void {
  it("should revert set swapper for zero address", async function () {
    const dexManager = await this.dexManager.connect(this.signers.admin);
    await expect(dexManager.setSwapper(constants.AddressZero)).to.be.revertedWith("invalid address");
  });

  it("should set swapper", async function () {
    const dexManager = await this.dexManager.connect(this.signers.admin);
    await expect(dexManager.setSwapper(this.dexManager.address)).to.be.ok;
  });

  it("should revert remove swapper for zero address", async function () {
    const dexManager = await this.dexManager.connect(this.signers.admin);
    await expect(dexManager.removeSwapper(constants.AddressZero)).to.be.revertedWith("invalid address");
  });

  it("should  remove swapper", async function () {
    const dexManager = await this.dexManager.connect(this.signers.admin);
    await dexManager.setSwapper(this.dexManager.address);
    await expect(dexManager.removeSwapper(this.dexManager.address)).to.be.ok;
  });

  it("should revert addExchange for non owner", async function () {
    const dexManager = await this.dexManager.connect(this.signers.admin1);
    await expect(
      dexManager.addExchange(
        utils.formatBytes32String("ETH"),
        utils.formatBytes32String("ETH"),
        this.mockOddzDex.address,
      ),
    ).to.be.revertedWith("caller has no access to the method");
  });
  it("should revert addExchange for same assets", async function () {
    const dexManager = await this.dexManager.connect(this.signers.admin);
    await expect(
      dexManager.addExchange(
        utils.formatBytes32String("ETH"),
        utils.formatBytes32String("ETH"),
        this.mockOddzDex.address,
      ),
    ).to.be.revertedWith("Invalid assets");
  });

  it("should revert addExchange for non contract exchange address", async function () {
    const dexManager = await this.dexManager.connect(this.signers.admin);
    await expect(
      dexManager.addExchange(utils.formatBytes32String("ETH"), utils.formatBytes32String("USD"), this.accounts.admin),
    ).to.be.revertedWith("Invalid exchange");
  });

  it("should addExchange for assets", async function () {
    const dexManager = await this.dexManager.connect(this.signers.admin);
    await expect(
      dexManager.addExchange(
        utils.formatBytes32String("ETH"),
        utils.formatBytes32String("USD"),
        this.mockOddzDex.address,
      ),
    ).to.be.ok;
  });
  it("should revert seting active exchange with zero address", async function () {
    const dexManager = await this.dexManager.connect(this.signers.admin);
    // tries to set address(0) as active exchange
    const dexHash = utils.keccak256(
      utils.defaultAbiCoder.encode(
        ["bytes32", "bytes32", "address"],
        [utils.formatBytes32String("ETH"), utils.formatBytes32String("USD"), this.mockOddzDex.address],
      ),
    );

    await expect(dexManager.setActiveExchange(dexHash)).to.be.revertedWith("Invalid exchange");
  });

  it("should set active exchange ", async function () {
    const dexManager = await this.dexManager.connect(this.signers.admin);
    await dexManager.addExchange(
      utils.formatBytes32String("ETH"),
      utils.formatBytes32String("USD"),
      this.mockOddzDex.address,
    );

    const dexHash = utils.keccak256(
      utils.defaultAbiCoder.encode(
        ["bytes32", "bytes32", "address"],
        [utils.formatBytes32String("ETH"), utils.formatBytes32String("USD"), this.mockOddzDex.address],
      ),
    );

    await expect(this.dexManager.setActiveExchange(dexHash)).to.be.ok;
  });
  it("should revert getExchange for non swapper address", async function () {
    const dexManager = await this.dexManager.connect(this.signers.admin);
    await dexManager.removeSwapper(this.mockLiquidityPool.address);
    await expect(
      this.mockLiquidityPool.getExchange(utils.formatBytes32String("ETH"), utils.formatBytes32String("USD")),
    ).to.be.revertedWith("caller has no access to the method");
  });
  it("should revert getExchange without adding any", async function () {
    await expect(
      this.mockLiquidityPool.getExchange(utils.formatBytes32String("ETH"), utils.formatBytes32String("USD")),
    ).to.be.revertedWith("invalid exchange address");
  });
  it("should get Exchange address after adding", async function () {
    const dexManager = await this.dexManager.connect(this.signers.admin);
    await dexManager.addExchange(
      utils.formatBytes32String("ETH"),
      utils.formatBytes32String("USD"),
      this.mockOddzDex.address,
    );

    const dexHash = utils.keccak256(
      utils.defaultAbiCoder.encode(
        ["bytes32", "bytes32", "address"],
        [utils.formatBytes32String("ETH"), utils.formatBytes32String("USD"), this.mockOddzDex.address],
      ),
    );

    await this.dexManager.setActiveExchange(dexHash);

    expect(
      await this.mockLiquidityPool.getExchange(utils.formatBytes32String("ETH"), utils.formatBytes32String("USD")),
    ).to.equal(this.mockOddzDex.address);
  });
  it("should revert swap for non swapper address", async function () {
    await this.dexManager.removeSwapper(this.mockLiquidityPool.address);
    await expect(
      this.mockLiquidityPool.sendUA(
        utils.formatBytes32String("USD"),
        utils.formatBytes32String("ETH"),
        this.mockOddzDex.address,
        this.accounts.admin,
      ),
    ).to.be.revertedWith("caller has no access to the method");
  });
  it("should revert swap if no active exchange for assets", async function () {
    await expect(
      this.mockLiquidityPool.sendUA(
        utils.formatBytes32String("USD"),
        utils.formatBytes32String("ETH"),
        this.mockOddzDex.address,
        this.accounts.admin,
      ),
    ).to.be.revertedWith("No exchange");
  });

  it("should revert swap for invalid exchange for assets", async function () {
    const dexManager = await this.dexManager.connect(this.signers.admin);
    await dexManager.addExchange(
      utils.formatBytes32String("ETH"),
      utils.formatBytes32String("USD"),
      this.mockOddzDex.address,
    );

    const dexHash = utils.keccak256(
      utils.defaultAbiCoder.encode(
        ["bytes32", "bytes32", "address"],
        [utils.formatBytes32String("ETH"), utils.formatBytes32String("USD"), this.mockOddzDex.address],
      ),
    );

    await this.dexManager.setActiveExchange(dexHash);

    await expect(
      this.mockLiquidityPool.sendUA(
        utils.formatBytes32String("USD"),
        utils.formatBytes32String("ETH"),
        this.dexManager.address,
        this.accounts.admin,
      ),
    ).to.be.revertedWith("Invalid exchange");
  });
  it("should successfully swap for assets", async function () {
    const dexManager = await this.dexManager.connect(this.signers.admin);
    const oddzAssetManager = await this.oddzAssetManager.connect(this.signers.admin);

    await addAssetPair(oddzAssetManager, this.signers.admin, this.usdcToken, this.ethToken);
    await dexManager.addExchange(
      utils.formatBytes32String("ETH"),
      utils.formatBytes32String("USD"),
      this.mockOddzDex.address,
    );

    const dexHash = utils.keccak256(
      utils.defaultAbiCoder.encode(
        ["bytes32", "bytes32", "address"],
        [utils.formatBytes32String("ETH"), utils.formatBytes32String("USD"), this.mockOddzDex.address],
      ),
    );
    await this.dexManager.setActiveExchange(dexHash);

    await expect(
      this.mockLiquidityPool.sendUA(
        utils.formatBytes32String("USD"),
        utils.formatBytes32String("ETH"),
        this.mockOddzDex.address,
        this.accounts.admin,
      ),
    ).to.be.ok;
  });
}
