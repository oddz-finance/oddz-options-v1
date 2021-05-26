import { expect } from "chai";
import { BigNumber, utils } from "ethers";

export function shouldBehaveLikeOddzFeeManager(): void {
  it("Should get transaction fee as max for no stakers/holders/lps", async function () {
    const oddzFeeManager = await this.oddzFeeManager.connect(this.signers.admin);
    expect(await oddzFeeManager.getTransactionFee(this.accounts.admin1)).to.equal(500);
  });

  it("Should get transaction fee as max for 1 digit token holders", async function () {
    const oddzFeeManager = await this.oddzFeeManager.connect(this.signers.admin);
    await this.oddzToken
      .connect(this.signers.admin)
      .transfer(this.accounts.admin1, BigNumber.from(utils.parseEther("9")));
    expect(await oddzFeeManager.getTransactionFee(this.accounts.admin1)).to.equal(500);
  });

  it("Should get transaction fee as max for 2 digits token holders", async function () {
    const oddzFeeManager = await this.oddzFeeManager.connect(this.signers.admin);
    await this.oddzToken
      .connect(this.signers.admin)
      .transfer(this.accounts.admin1, BigNumber.from(utils.parseEther("99")));
    expect(await oddzFeeManager.getTransactionFee(this.accounts.admin1)).to.equal(500);
  });

  it("Should get transaction fee as max for 3 digits token holders", async function () {
    const oddzFeeManager = await this.oddzFeeManager.connect(this.signers.admin);
    await this.oddzToken
      .connect(this.signers.admin)
      .transfer(this.accounts.admin1, BigNumber.from(utils.parseEther("999")));
    expect(await oddzFeeManager.getTransactionFee(this.accounts.admin1)).to.equal(450);
  });

  it("Should get max discount of 20% on transaction fee for 4 digits stakers/holders/lps", async function () {
    const oddzFeeManager = await this.oddzFeeManager.connect(this.signers.admin);
    await this.oddzToken
      .connect(this.signers.admin)
      .transfer(this.accounts.admin1, BigNumber.from(utils.parseEther("1000")));
    expect(await oddzFeeManager.getTransactionFee(this.accounts.admin1)).to.equal(400);
  });

  it("Should get max discount of 40% on transaction fee for 5 digits stakers/holders/lps", async function () {
    const oddzFeeManager = await this.oddzFeeManager.connect(this.signers.admin);
    await this.oddzToken
      .connect(this.signers.admin)
      .transfer(this.accounts.admin1, BigNumber.from(utils.parseEther("15000")));
    expect(await oddzFeeManager.getTransactionFee(this.accounts.admin1)).to.equal(300);
  });

  it("Should get max discount of 60% on transaction fee for 6 digits stakers/holders/lps", async function () {
    const oddzFeeManager = await this.oddzFeeManager.connect(this.signers.admin);
    await this.oddzToken
      .connect(this.signers.admin)
      .transfer(this.accounts.admin1, BigNumber.from(utils.parseEther("300000")));
    expect(await oddzFeeManager.getTransactionFee(this.accounts.admin1)).to.equal(200);
  });

  it("Should get max discount of 80% on transaction fee for 7 digits stakers/holders/lps", async function () {
    const oddzFeeManager = await this.oddzFeeManager.connect(this.signers.admin);
    await this.oddzToken
      .connect(this.signers.admin)
      .transfer(this.accounts.admin1, BigNumber.from(utils.parseEther("5000000")));
    expect(await oddzFeeManager.getTransactionFee(this.accounts.admin1)).to.equal(100);
  });

  it("Should get max discount of 100% on transaction fee for 7 digits stakers/holders/lps of multiple eligible tokens", async function () {
    const oddzFeeManager = await this.oddzFeeManager.connect(this.signers.admin);
    await this.oddzToken
      .connect(this.signers.admin)
      .transfer(this.accounts.admin1, BigNumber.from(utils.parseEther("5000000")));
    await this.random1Token
      .connect(this.signers.admin)
      .transfer(this.accounts.admin1, BigNumber.from(utils.parseEther("5000000")));
    expect(await oddzFeeManager.getTransactionFee(this.accounts.admin1)).to.equal(0);
  });

  it("Should get settlement fee as max for no stakers/holders/lps", async function () {
    const oddzFeeManager = await this.oddzFeeManager.connect(this.signers.admin);
    expect(await oddzFeeManager.getSettlementFee(this.accounts.admin1)).to.equal(400);
  });

  it("Should get settlement fee as max for 1 digit token holders", async function () {
    const oddzFeeManager = await this.oddzFeeManager.connect(this.signers.admin);
    await this.oUsdToken
      .connect(this.signers.admin)
      .transfer(this.accounts.admin1, BigNumber.from(utils.parseEther("9")));
    expect(await oddzFeeManager.getSettlementFee(this.accounts.admin1)).to.equal(400);
  });

  it("Should get settlement fee as max for 2 digits token holders", async function () {
    const oddzFeeManager = await this.oddzFeeManager.connect(this.signers.admin);
    await this.oUsdToken
      .connect(this.signers.admin)
      .transfer(this.accounts.admin1, BigNumber.from(utils.parseEther("99")));
    expect(await oddzFeeManager.getSettlementFee(this.accounts.admin1)).to.equal(400);
  });

  it("Should get settlement fee as max for 3 digits token holders", async function () {
    const oddzFeeManager = await this.oddzFeeManager.connect(this.signers.admin);
    await this.oUsdToken
      .connect(this.signers.admin)
      .transfer(this.accounts.admin1, BigNumber.from(utils.parseEther("999")));
    expect(await oddzFeeManager.getSettlementFee(this.accounts.admin1)).to.equal(360);
  });

  it("Should get max discount of 20% on settlement fee for 4 digits stakers/holders/lps", async function () {
    const oddzFeeManager = await this.oddzFeeManager.connect(this.signers.admin);
    await this.oUsdToken
      .connect(this.signers.admin)
      .transfer(this.accounts.admin1, BigNumber.from(utils.parseEther("1000")));
    expect(await oddzFeeManager.getSettlementFee(this.accounts.admin1)).to.equal(320);
  });

  it("Should get max discount of 40% on settlement fee for 5 digits stakers/holders/lps", async function () {
    const oddzFeeManager = await this.oddzFeeManager.connect(this.signers.admin);
    await this.oUsdToken
      .connect(this.signers.admin)
      .transfer(this.accounts.admin1, BigNumber.from(utils.parseEther("15000")));
    expect(await oddzFeeManager.getSettlementFee(this.accounts.admin1)).to.equal(240);
  });

  it("Should get max discount of 60% on settlement fee for 6 digits stakers/holders/lps", async function () {
    const oddzFeeManager = await this.oddzFeeManager.connect(this.signers.admin);
    await this.oUsdToken
      .connect(this.signers.admin)
      .transfer(this.accounts.admin1, BigNumber.from(utils.parseEther("300000")));
    expect(await oddzFeeManager.getSettlementFee(this.accounts.admin1)).to.equal(160);
  });

  it("Should get max discount of 80% on settlement fee for 7 digits stakers/holders/lps", async function () {
    const oddzFeeManager = await this.oddzFeeManager.connect(this.signers.admin);
    await this.oUsdToken
      .connect(this.signers.admin)
      .transfer(this.accounts.admin1, BigNumber.from(utils.parseEther("5000000")));
    expect(await oddzFeeManager.getSettlementFee(this.accounts.admin1)).to.equal(80);
  });

  it("Should get max discount of 100% on settlement fee for 7 digits stakers/holders/lps of multiple eligible tokens", async function () {
    const oddzFeeManager = await this.oddzFeeManager.connect(this.signers.admin);
    await this.oUsdToken
      .connect(this.signers.admin)
      .transfer(this.accounts.admin1, BigNumber.from(utils.parseEther("5000000")));
    await this.random2Token
      .connect(this.signers.admin)
      .transfer(this.accounts.admin1, BigNumber.from(utils.parseEther("5000000")));
    expect(await oddzFeeManager.getSettlementFee(this.accounts.admin1)).to.equal(0);
  });
}
