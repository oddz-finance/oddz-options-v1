import { expect } from "chai";
import { utils, constants } from "ethers";

export function shouldBehaveLikeOddzPriceOracleManager(): void {
  it("should be able to successfully add an aggregator", async function () {
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

  it("should throw Invalid assets message", async function () {
    const oracleManager = await this.oddzPriceOracleManager.connect(this.signers.admin);
    await expect(
      oracleManager.addAggregator(
        utils.formatBytes32String("USD"),
        utils.formatBytes32String("USD"),
        this.oddzPriceOracle.address,
        this.oddzPriceOracle.address,
      ),
    ).to.be.revertedWith("OPOM Error: Invalid assets");
  });

  it("should throw Invalid aggregator message", async function () {
    const oracleManager = await this.oddzPriceOracleManager.connect(this.signers.admin);
    await expect(
      oracleManager.addAggregator(
        utils.formatBytes32String("ETH"),
        utils.formatBytes32String("USD"),
        this.accounts.admin,
        this.accounts.admin,
      ),
    ).to.be.revertedWith("OPOM Error: Invalid aggregator");
  });

  it("should not return underlying price and throw No aggregator message when no aggregator is set", async function () {
    const mockPriceOracleUser = await this.mockPriceOracleUser.connect(this.signers.admin);
    await expect(mockPriceOracleUser.getPrice()).to.be.revertedWith("OPOM Error: No aggregator");
  });

  it("Should throw out of synch message when price is not in sync", async function () {
    const oracleManager = await this.oddzPriceOracleManager.connect(this.signers.admin);
    const mockPriceOracleUser = await this.mockPriceOracleUser.connect(this.signers.admin);

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
        constants.AddressZero,
        this.oddzPriceOracle.address,
      );

    await this.oddzPriceOracle.setUpdatedAt(2000);
    await expect(mockPriceOracleUser.getPrice()).to.be.revertedWith("Chain link Price Out Of Sync");
  });

  it("should return underlying price when an aggregator is set", async function () {
    const oracleManager = await this.oddzPriceOracleManager.connect(this.signers.admin);
    const mockPriceOracleUser = await this.mockPriceOracleUser.connect(this.signers.admin);

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
        constants.AddressZero,
        this.oddzPriceOracle.address,
      );

    await expect(mockPriceOracleUser.getPrice()).to.not.equal(null);
  });

  it("should revert for setting invalid active aggregator", async function () {
    const oracleManager = await this.oddzPriceOracleManager.connect(this.signers.admin);

    const hash = utils.keccak256(
      utils.defaultAbiCoder.encode(
        ["bytes32", "bytes32", "address"],
        [utils.formatBytes32String("ETH"), utils.formatBytes32String("USD"), this.oddzPriceOracle.address],
      ),
    );
    // tries to set address(0) as active aggregator
    await expect(oracleManager.setActiveAggregator(hash)).to.be.revertedWith("OPOM Error: Invalid aggregator");
  });
}
