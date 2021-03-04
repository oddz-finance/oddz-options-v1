import { expect } from "chai";
import { BigNumber, utils } from "ethers";
import { OptionType, getExpiry } from "../../test-utils";

import {
  OddzLiquidityPool,
  OddzOptionManager,
  OddzPriceOracleManager,
  MockOddzPriceOracle,
  SwapUnderlyingAsset,
} from "../../typechain";
import { Signer } from "@ethersproject/abstract-signer";

const getAssetPair = async (
  oddzOptionManager: OddzOptionManager,
  admin: Signer,
  oddzPriceOracleManager: OddzPriceOracleManager,
  oracleAddress: MockOddzPriceOracle,
) => {
  const oom = await oddzOptionManager.connect(admin);
  await oom.addAsset(utils.formatBytes32String("USD"), BigNumber.from(1e8));
  await oom.addAsset(utils.formatBytes32String("ETH"), BigNumber.from(1e8));
  await oom.addAssetPair(1, 0);

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

  return (await oom.pairs(0)).id;
};

const addAssetAddresses = async (
  swapUnderlyingAsset: SwapUnderlyingAsset,
  admin: Signer,
  usdcAddress: string,
  ethAddress: string,
) => {
  const swapAsset = await swapUnderlyingAsset.connect(admin);

  await swapAsset.addAssetAddress(utils.formatBytes32String("ETH"), ethAddress);
  await swapAsset.addAssetAddress(utils.formatBytes32String("USDC"), usdcAddress);
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
      this.oddzOptionManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
    );

    const oddzLiquidityPool = await this.oddzLiquidityPool.connect(this.signers.admin);
    const oddzPriceOracle = await this.oddzPriceOracle.connect(this.signers.admin);
    const swapUnderlyingAsset = await this.swapUnderlyingAsset.connect(this.signers.admin);
    await addAssetAddresses(
      this.swapUnderlyingAsset,
      this.signers.admin,
      this.usdcToken.address,
      this.ethToken.address,
    );

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
      .to.emit(swapUnderlyingAsset, "Swapped");
  });

  it("Call option - excercise flow with underlying asset, revert without adding asset addresses", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);

    const pairId = getAssetPair(
      this.oddzOptionManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
    );

    const oddzPriceOracle = await this.oddzPriceOracle.connect(this.signers.admin);

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

    await expect(oddzOptionManager.excerciseUA(0, this.accounts.admin)).to.be.revertedWith(
      "PancakeLibrary: ZERO_ADDRESS",
    );
  });
}
