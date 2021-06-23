import { expect } from "chai";
import { BigNumber, utils, constants } from "ethers";
import { OddzAssetManager, MockERC20, OddzPriceOracleManager, MockOddzPriceOracle } from "../../typechain";
import { DistributionPercentage, DepositType, getExpiry } from "../../test-utils";

import { Signer } from "@ethersproject/abstract-signer";

const addAssetPair = async (
  oddzAssetManager: OddzAssetManager,
  admin: Signer,
  usdcToken: MockERC20,
  oddzToken: MockERC20,
  oddzPriceOracleManager: OddzPriceOracleManager,
  oracleAddress: MockOddzPriceOracle,
) => {
  const oam = await oddzAssetManager.connect(admin);
  await oam.addAsset(utils.formatBytes32String("USD"), usdcToken.address, 8);
  await oam.addAsset(utils.formatBytes32String("ODDZ"), oddzToken.address, 8);
  await oam.addAssetPair(
    utils.formatBytes32String("ODDZ"),
    utils.formatBytes32String("USD"),
    BigNumber.from(utils.parseEther("0.01")),
    2592000,
    86400,
  );
  await oddzPriceOracleManager
    .connect(admin)
    .addAggregator(
      utils.formatBytes32String("ODDZ"),
      utils.formatBytes32String("USD"),
      oracleAddress.address,
      oracleAddress.address,
    );
  const hash = utils.keccak256(
    utils.defaultAbiCoder.encode(
      ["bytes32", "bytes32", "address"],
      [utils.formatBytes32String("ODDZ"), utils.formatBytes32String("USD"), oracleAddress.address],
    ),
  );

  await oddzPriceOracleManager.connect(admin).setActiveAggregator(hash);
};

export function shouldBehaveLikeOddzStrategyManager(): void {
  it("should revert setting strategy create lockup duration for non owner", async function () {
    const oddzStrategyManager = await this.oddzStrategyManager.connect(this.signers.admin1);
    await expect(oddzStrategyManager.updateStrategyCreateLockupDuration(getExpiry(2))).to.be.revertedWith(
      "Ownable: caller is not the owner",
    );
  });

  it("should revert setting strategy create lockup duration for invalid value", async function () {
    const oddzStrategyManager = await this.oddzStrategyManager.connect(this.signers.admin);
    await expect(oddzStrategyManager.updateStrategyCreateLockupDuration(getExpiry(31))).to.be.revertedWith(
      "SM Error: invalid duration",
    );
  });

  it("should set strategy create lockup duration for owner", async function () {
    const oddzStrategyManager = await this.oddzStrategyManager.connect(this.signers.admin);
    await oddzStrategyManager.updateStrategyCreateLockupDuration(getExpiry(30));
    expect(await oddzStrategyManager.strategyCreateLockupDuration()).to.equal(getExpiry(30));
  });

  it("should revert setting strategy change lockup duration for non owner", async function () {
    const oddzStrategyManager = await this.oddzStrategyManager.connect(this.signers.admin1);
    await expect(oddzStrategyManager.updateStrategyChangeLockupDuration(getExpiry(2))).to.be.revertedWith(
      "Ownable: caller is not the owner",
    );
  });

  it("should revert setting strategy change lockup duration for invalid value", async function () {
    const oddzStrategyManager = await this.oddzStrategyManager.connect(this.signers.admin);
    await expect(oddzStrategyManager.updateStrategyChangeLockupDuration(getExpiry(31))).to.be.revertedWith(
      "SM Error: invalid duration",
    );
  });

  it("should set strategy change lockup duration for owner", async function () {
    const oddzStrategyManager = await this.oddzStrategyManager.connect(this.signers.admin);
    await oddzStrategyManager.updateStrategyChangeLockupDuration(getExpiry(30));
    expect(await oddzStrategyManager.strategyChangeLockupDuration()).to.equal(getExpiry(30));
  });

  it("should revert add pool for non owner", async function () {
    const oddzStrategyManager = await this.oddzStrategyManager.connect(this.signers.admin1);
    await expect(oddzStrategyManager.addPool(this.oddzDefaultPool.address))
        .to.be.revertedWith("Ownable: caller is not the owner")
  });
  it("should add pool for owner", async function () {
    const oddzStrategyManager = await this.oddzStrategyManager.connect(this.signers.admin);
    await oddzStrategyManager.addPool(this.oddzDefaultPool.address);
    expect(await oddzStrategyManager.validPools(this.oddzDefaultPool.address)).to.be.true;
  });

  it("should revert remove pool for non owner", async function () {
    const oddzStrategyManager = await this.oddzStrategyManager.connect(this.signers.admin1);
    await expect(oddzStrategyManager.removePool(this.oddzDefaultPool.address))
        .to.be.revertedWith("Ownable: caller is not the owner")
  });
  it("should remove pool for owner", async function () {
    const oddzStrategyManager = await this.oddzStrategyManager.connect(this.signers.admin);
    await oddzStrategyManager.removePool(this.oddzDefaultPool.address);
    expect(await oddzStrategyManager.validPools(this.oddzDefaultPool.address)).to.be.false;
  });

  

 
}
