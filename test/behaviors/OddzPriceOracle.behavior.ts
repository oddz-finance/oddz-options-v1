import { expect } from "chai";
import { AssetIds } from "../../test-utils";

export function shouldBehaveLikeOddzPriceOracle(): void {
  it("Should be able to successfully set the aggregator", async function () {
    const oracle = await this.oddzPriceOracleManager.connect(this.signers.admin);
    await expect(
      oracle.addAggregator(AssetIds.ETH, AssetIds.USDT, this.MockAggregator.address, this.MockAggregator.address),
    ).to.emit(oracle, "SetAggregator");
  });

  it("Should not return underlying price and throw No aggregator message when no aggregator is set", async function () {
    const oracle = await this.oddzPriceOracleManager.connect(this.signers.admin);
    await expect(oracle.getUnderlyingPrice(AssetIds.ETH, AssetIds.USDT)).to.be.revertedWith("No aggregator");
  });

  it("Should return underlying price when an aggregator is set", async function () {
    const oracle = await this.oddzPriceOracleManager.connect(this.signers.admin);
    await oracle.setAggregator(AssetIds.ETH, AssetIds.USDT, this.MockAggregator.address);
    await expect(oracle.getUnderlyingPrice(AssetIds.ETH, AssetIds.USDT)).to.not.equal(null);
  });
}
