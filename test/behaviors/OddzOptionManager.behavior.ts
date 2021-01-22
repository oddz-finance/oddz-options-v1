import { expect } from "chai";
import {BigNumber} from "ethers";
import {OptionType} from '../../test-utils';

export function shouldBehaveLikeOddzOptionManager(): void {
  it("should return the premium price", async function () {

    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    // call should be optionType.call
    const optionPremium = await oddzOptionManager.getPremium(
      1,
      Date.now(),
      BigNumber.from(100),
      BigNumber.from(1234),
      OptionType.Call,
    );
    console.log(optionPremium);
  });
}
