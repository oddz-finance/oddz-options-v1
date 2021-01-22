import { expect } from "chai";

const TotalSupply = 100000000;
export function shouldBehaveLikeOddzOptionManager(): void {
  it("should return the premium price", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    const optionPremium = await oddzOptionManager.getPremium();
    console.log(optionPremium);
  });
}
