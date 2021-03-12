import { expect } from "chai";
import { BigNumber, utils } from "ethers";
import { OptionType, getExpiry } from "../../test-utils";

import {
  OddzLiquidityPool,
  OddzAssetManager,
  OddzPriceOracleManager,
  MockOddzPriceOracle,
  OddzToken,
} from "../../typechain";
import { Signer } from "@ethersproject/abstract-signer";

const getAssetPair = async (
  oddzAssetManager: OddzAssetManager,
  admin: Signer,
  oddzPriceOracleManager: OddzPriceOracleManager,
  oracleAddress: MockOddzPriceOracle,
  usdcToken: OddzToken,
  ethToken: OddzToken,
) => {
  const oam = await oddzAssetManager.connect(admin);
  await oam.addAsset(utils.formatBytes32String("USD"), usdcToken.address, BigNumber.from(1e8));
  await oam.addAsset(utils.formatBytes32String("ETH"), ethToken.address, BigNumber.from(1e8));
  await oam.addAssetPair(1, 0);

  await oddzPriceOracleManager
    .connect(admin)
    .addAggregator(
      utils.formatBytes32String("ETH"),
      utils.formatBytes32String("USD"),
      oracleAddress.address,
      oracleAddress.address,
    );
  const hash = utils.keccak256(
    utils.defaultAbiCoder.encode(
      ["bytes32", "bytes32", "address"],
      [utils.formatBytes32String("ETH"), utils.formatBytes32String("USD"), oracleAddress.address],
    ),
  );

  await oddzPriceOracleManager.connect(admin).setActiveAggregator(hash);

  return (await oam.pairs(0)).id;
};

const addLiquidity = async (oddzLiquidityPool: OddzLiquidityPool, admin: Signer, amount: number) => {
  const olp = await oddzLiquidityPool.connect(admin);
  await olp.addLiquidity(utils.parseEther(amount.toString()));
  return olp;
};

export function shouldBehaveLikeMockSwapOddzOptionManager(): void {
  it("Call option - excercise flow with underlying asset", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);

    const pairId = getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );
    const oddzLiquidityPool = await this.oddzLiquidityPool.connect(this.signers.admin);
    const oddzPriceOracle = await this.oddzPriceOracle.connect(this.signers.admin);
    const dexManager = await this.dexManager.connect(this.signers.admin);

    await addLiquidity(this.oddzLiquidityPool, this.signers.admin, 1000000);

    await oddzOptionManager.buy(
      pairId,
      getExpiry(2),
      BigNumber.from(utils.parseEther("0.001")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
    );

    await expect(oddzOptionManager.exercise(0)).to.be.revertedWith("Call option: Current price is too low");
    await oddzPriceOracle.setUnderlyingPrice(175000000000);
    await expect(oddzOptionManager.excerciseUA(0, this.accounts.admin))
      .to.emit(oddzOptionManager, "Exercise")
      .to.emit(oddzLiquidityPool, "Profit")
      .to.emit(dexManager, "Swapped");
  });

  it("Check balance of the user after swap", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);

    const pairId = getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );

    const oddzLiquidityPool = await this.oddzLiquidityPool.connect(this.signers.admin);
    const oddzPriceOracle = await this.oddzPriceOracle.connect(this.signers.admin);
    const dexManager = await this.dexManager.connect(this.signers.admin);

    await addLiquidity(this.oddzLiquidityPool, this.signers.admin, 1000000);

    await oddzOptionManager.buy(
      pairId,
      getExpiry(2),
      BigNumber.from(utils.parseEther("0.001")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
    );

    await expect(oddzOptionManager.exercise(0)).to.be.revertedWith("Call option: Current price is too low");

    await oddzPriceOracle.setUnderlyingPrice(175000000000);
    const balanceBefore = await await this.ethToken.balanceOf(this.accounts.admin);

    await expect(oddzOptionManager.excerciseUA(0, this.accounts.admin))
      .to.emit(oddzOptionManager, "Exercise")
      .to.emit(oddzLiquidityPool, "Profit")
      .to.emit(dexManager, "Swapped")
      .withArgs(
        utils.formatBytes32String("USD"),
        utils.formatBytes32String("ETH"),
        BigNumber.from(utils.parseEther("0.048")),
        BigNumber.from("47902852630873785"),
      );

    await expect(await this.ethToken.balanceOf(this.accounts.admin)).to.equal(
      BigNumber.from(balanceBefore).add(BigNumber.from("47902852630873785")),
    );
  });

  it("revert with invalid assets", async function () {
    const dexManager = await this.dexManager.connect(this.signers.admin);
    await expect(
      dexManager.addExchange(
        utils.formatBytes32String("ETH"),
        utils.formatBytes32String("ETH"),
        this.pancakeSwapForUnderlyingAsset.address,
      ),
    ).to.be.revertedWith("Invalid assets");
  });
}
