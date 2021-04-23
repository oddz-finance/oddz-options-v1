import { expect } from "chai";
import {  utils, constants } from "ethers";
import {  getExpiry } from "../../test-utils";

export function shouldBehaveLikeOddzIVOracleManager(): void {
  it("Should revert add IV aggregator for non owner", async function () {
    const oracleManager = await this.oddzIVOracleManager.connect(this.signers.admin);
    await expect(
      oracleManager
        .connect(this.signers.admin1)
        .addIVAggregator(
          utils.formatBytes32String("ETH"),
          utils.formatBytes32String("USD"),
          this.oddzIVOracle.address,
          this.oddzIVOracle.address,
          1,
        ),
    ).to.revertedWith("caller has no access to the method");
  });
  it("Should be able to successfully add an aggregator", async function () {
    const oracleManager = await this.oddzIVOracleManager.connect(this.signers.admin);
    await expect(
      oracleManager.addIVAggregator(
        utils.formatBytes32String("ETH"),
        utils.formatBytes32String("USD"),
        this.oddzIVOracle.address,
        this.oddzIVOracle.address,
        1,
      ),
    )
      .to.emit(oracleManager, "NewIVAggregator")
      .withArgs(utils.formatBytes32String("ETH"), utils.formatBytes32String("USD"), this.oddzIVOracle.address);
  });

  it("Should throw Invalid assets message", async function () {
    const oracleManager = await this.oddzIVOracleManager.connect(this.signers.admin);
    await expect(
      oracleManager.addIVAggregator(
        utils.formatBytes32String("USD"),
        utils.formatBytes32String("USD"),
        this.oddzIVOracle.address,
        this.oddzIVOracle.address,
        1,
      ),
    ).to.be.revertedWith("Invalid assets");
  });

  it("Should throw Invalid decimal message", async function () {
    await expect(
      this.oddzIVOracle
        .connect(this.signers.admin)
        .setIv(utils.formatBytes32String("ETH"), utils.formatBytes32String("USD"), 180000, 4),
    ).to.be.revertedWith("Invalid Decimal");

    await expect(
      this.oddzIVOracle
        .connect(this.signers.admin)
        .setIv(utils.formatBytes32String("ETH"), utils.formatBytes32String("USD"), 180000, 9),
    ).to.be.revertedWith("Invalid Decimal");
  });

  it("Should throw Invalid IV message", async function () {
    await expect(
      this.oddzIVOracle
        .connect(this.signers.admin)
        .setIv(utils.formatBytes32String("ETH"), utils.formatBytes32String("USD"), 9000, 5),
    ).to.be.revertedWith("Invalid IV");

    await expect(
      this.oddzIVOracle
        .connect(this.signers.admin)
        .setIv(utils.formatBytes32String("ETH"), utils.formatBytes32String("USD"), 1e9, 5),
    ).to.be.revertedWith("Invalid IV");
  });

  it("Should throw Invalid aggregator message", async function () {
    const oracleManager = await this.oddzIVOracleManager.connect(this.signers.admin);
    await expect(
      oracleManager.addIVAggregator(
        utils.formatBytes32String("ETH"),
        utils.formatBytes32String("USD"),
        this.accounts.admin,
        this.accounts.admin,
        1,
      ),
    ).to.be.revertedWith("Invalid aggregator");
  });

  it("Should not return underlying price and throw No aggregator message when no aggregator is set", async function () {
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);
    await expect(mockIVManager.calculateIv(getExpiry(1))).to.be.revertedWith("No aggregator");
  });

  it("Should return underlying price when an aggregator is set", async function () {
    const oracleManager = await this.oddzIVOracleManager.connect(this.signers.admin);

    await oracleManager.addIVAggregator(
      utils.formatBytes32String("ETH"),
      utils.formatBytes32String("USD"),
      this.oddzIVOracle.address,
      this.oddzIVOracle.address,
      1,
    );

    const hash = utils.keccak256(
      utils.defaultAbiCoder.encode(
        ["bytes32", "bytes32", "address"],
        [utils.formatBytes32String("ETH"), utils.formatBytes32String("USD"), this.oddzIVOracle.address],
      ),
    );

    await expect(oracleManager.setActiveIVAggregator(hash))
      .to.emit(oracleManager, "SetIVAggregator")
      .withArgs(
        utils.formatBytes32String("ETH"),
        utils.formatBytes32String("USD"),
        constants.AddressZero,
        this.oddzIVOracle.address,
      );

    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(1));
    expect(iv).to.equal(180000);
    expect(decimals).to.equal(5);
  });

  it("Should throw caller has no access to the method while calling calculate IV", async function () {
    const oracleManager = await this.oddzIVOracleManager.connect(this.signers.admin);

    await expect(
      oracleManager.calculateIv(utils.formatBytes32String("ETH"), utils.formatBytes32String("USD"), getExpiry(1)),
    ).to.be.revertedWith("caller has no access to the method");
  });

  it("Should revert for setting invalid active aggregator", async function () {
    const oracleManager = await this.oddzIVOracleManager.connect(this.signers.admin);
    // sets address(0) as active aggreagator when aggregator is not added
    const hash = utils.keccak256(
      utils.defaultAbiCoder.encode(
        ["bytes32", "bytes32", "address"],
        [utils.formatBytes32String("ETH"), utils.formatBytes32String("USD"), this.oddzIVOracle.address],
      ),
    );

    await expect(oracleManager.setActiveIVAggregator(hash)).to.be.revertedWith("Invalid aggregator");
  });

  it("Should revert set Manager for non contract address", async function () {
    const oracleManager = await this.oddzIVOracleManager.connect(this.signers.admin);

    await expect(oracleManager.setManager(this.accounts.admin)).to.be.revertedWith("Invalid manager address");
  });

  it("Should  set Manager for  contract address", async function () {
    const oracleManager = await this.oddzIVOracleManager.connect(this.signers.admin);

    await expect(oracleManager.setManager(this.oddzIVOracleManager.address)).to.emit(oracleManager, "RoleGranted")
  });
  it("Should revert remove Manager for non owner", async function () {
    const oracleManager = await this.oddzIVOracleManager.connect(this.signers.admin);

    await oracleManager.setManager(this.oddzIVOracleManager.address);
    await expect(
      oracleManager.connect(this.signers.admin1).removeManager(this.oddzIVOracleManager.address),
    ).to.be.revertedWith("AccessControl: sender must be an admin to revoke");
  });

  it("Should remove Manager ", async function () {
    const oracleManager = await this.oddzIVOracleManager.connect(this.signers.admin);

    await oracleManager.setManager(this.oddzIVOracleManager.address);
    await expect(oracleManager.removeManager(this.oddzIVOracleManager.address)).to.emit(oracleManager, "RoleRevoked");
  });
}
