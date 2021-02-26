import { expect } from "chai";
import { utils } from "ethers";

export function shouldBehaveLikeOddzPriceOracleManager(): void {
  it("Should be able to successfully add an aggregator", async function () {
    const oracleManager = await this.oddzPriceOracleManager.connect(this.signers.admin);
    await expect(
      oracleManager.addAggregator(
        utils.formatBytes32String("ETH"),
        utils.formatBytes32String("USD"),
        this.oddzPriceOracle.address,
        this.oddzPriceOracle.address,
      ),
    )
      .to.emit(oracleManager, "NewAggregator")
      .withArgs(utils.formatBytes32String("ETH"), utils.formatBytes32String("USD"), this.oddzPriceOracle.address);
  });

  it("Should throw Invalid assets message", async function () {
    const oracleManager = await this.oddzPriceOracleManager.connect(this.signers.admin);
    await expect(
      oracleManager.addAggregator(
        utils.formatBytes32String("USD"),
        utils.formatBytes32String("USD"),
        this.oddzPriceOracle.address,
        this.oddzPriceOracle.address,
      ),
    ).to.be.revertedWith("Invalid assets");
  });

  it("Should throw Invalid aggregator message", async function () {
    const oracleManager = await this.oddzPriceOracleManager.connect(this.signers.admin);
    await expect(
      oracleManager.addAggregator(
        utils.formatBytes32String("ETH"),
        utils.formatBytes32String("USD"),
        this.accounts.admin,
        this.accounts.admin,
      ),
    ).to.be.revertedWith("Invalid aggregator");
  });

  it("Should not return underlying price and throw No aggregator message when no aggregator is set", async function () {
    const oracleManager = await this.oddzPriceOracleManager.connect(this.signers.admin);
    await expect(
      oracleManager.getUnderlyingPrice(utils.formatBytes32String("ETH"), utils.formatBytes32String("USD")),
    ).to.be.revertedWith("No aggregator");
  });

  it("Should return underlying price when an aggregator is set", async function () {
    const oracleManager = await this.oddzPriceOracleManager.connect(this.signers.admin);

    await oracleManager.addAggregator(
      utils.formatBytes32String("ETH"),
      utils.formatBytes32String("USD"),
      this.oddzPriceOracle.address,
      this.oddzPriceOracle.address,
    );

    const hash = utils.keccak256(
      utils.defaultAbiCoder.encode(
        ["bytes32", "bytes32", "address"],
        [utils.formatBytes32String("ETH"), utils.formatBytes32String("USD"), this.oddzPriceOracle.address],
      ),
    );

    await expect(oracleManager.setActiveAggregator(hash))
      .to.emit(oracleManager, "SetAggregator")
      .withArgs(
        utils.formatBytes32String("ETH"),
        utils.formatBytes32String("USD"),
        "0x0000000000000000000000000000000000000000",
        this.oddzPriceOracle.address,
      );

    await expect(
      oracleManager.getUnderlyingPrice(utils.formatBytes32String("ETH"), utils.formatBytes32String("USD")),
    ).to.not.equal(null);
  });
}
