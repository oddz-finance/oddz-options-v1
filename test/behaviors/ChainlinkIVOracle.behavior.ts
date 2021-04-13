import { expect } from "chai";
import { getExpiry } from "../../test-utils";

export function shouldBehaveLikeChainlinkIVOracle(): void {
  it("Should return 1 day IV", async function () {
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(1));
    expect(iv).to.equal(83790000);
    expect(decimals).to.equal(8);
  });

  it("Should return 2 days IV", async function () {
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(2));
    expect(iv).to.equal(92370000);
    expect(decimals).to.equal(8);
  });

  it("Should return 3 days IV", async function () {
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(3));
    expect(iv).to.equal(92370000);
    expect(decimals).to.equal(8);
  });

  it("Should return 4 days IV", async function () {
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(4));
    expect(iv).to.equal(92370000);
    expect(decimals).to.equal(8);
  });

  it("Should return 5 days IV", async function () {
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(5));
    expect(iv).to.equal(101540000);
    expect(decimals).to.equal(8);
  });

  it("Should return 6 days IV", async function () {
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(6));
    expect(iv).to.equal(101540000);
    expect(decimals).to.equal(8);
  });

  it("Should return 7 days IV", async function () {
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(7));
    expect(iv).to.equal(101540000);
    expect(decimals).to.equal(8);
  });

  it("Should return 8 days IV", async function () {
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(8));
    expect(iv).to.equal(101540000);
    expect(decimals).to.equal(8);
  });

  it("Should return 9 days IV", async function () {
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(9));
    expect(iv).to.equal(101540000);
    expect(decimals).to.equal(8);
  });

  it("Should return 10 days IV", async function () {
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(10));
    expect(iv).to.equal(101540000);
    expect(decimals).to.equal(8);
  });

  it("Should return 11 days IV", async function () {
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(11));
    expect(iv).to.equal(104720000);
    expect(decimals).to.equal(8);
  });

  it("Should return 12 days IV", async function () {
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(12));
    expect(iv).to.equal(104720000);
    expect(decimals).to.equal(8);
  });

  it("Should return 13 days IV", async function () {
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(13));
    expect(iv).to.equal(104720000);
    expect(decimals).to.equal(8);
  });

  it("Should return 14 days IV", async function () {
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(14));
    expect(iv).to.equal(104720000);
    expect(decimals).to.equal(8);
  });

  it("Should return 15 days IV", async function () {
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(15));
    expect(iv).to.equal(104720000);
    expect(decimals).to.equal(8);
  });

  it("Should return 16 days IV", async function () {
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(16));
    expect(iv).to.equal(104720000);
    expect(decimals).to.equal(8);
  });

  it("Should return 17 days IV", async function () {
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(17));
    expect(iv).to.equal(104720000);
    expect(decimals).to.equal(8);
  });

  it("Should return 18 days IV", async function () {
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(18));
    expect(iv).to.equal(105860000);
    expect(decimals).to.equal(8);
  });

  it("Should return 19 days IV", async function () {
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(19));
    expect(iv).to.equal(105860000);
    expect(decimals).to.equal(8);
  });

  it("Should return 20 days IV", async function () {
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(20));
    expect(iv).to.equal(105860000);
    expect(decimals).to.equal(8);
  });

  it("Should return 21 days IV", async function () {
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(21));
    expect(iv).to.equal(105860000);
    expect(decimals).to.equal(8);
  });

  it("Should return 22 days IV", async function () {
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(22));
    expect(iv).to.equal(105860000);
    expect(decimals).to.equal(8);
  });

  it("Should return 23 days IV", async function () {
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(23));
    expect(iv).to.equal(105860000);
    expect(decimals).to.equal(8);
  });

  it("Should return 24 days IV", async function () {
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(24));
    expect(iv).to.equal(105860000);
    expect(decimals).to.equal(8);
  });

  it("Should return 25 days IV", async function () {
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(25));
    expect(iv).to.equal(107590000);
    expect(decimals).to.equal(8);
  });

  it("Should return 26 days IV", async function () {
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(26));
    expect(iv).to.equal(107590000);
    expect(decimals).to.equal(8);
  });

  it("Should return 27 days IV", async function () {
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(27));
    expect(iv).to.equal(107590000);
    expect(decimals).to.equal(8);
  });

  it("Should return 28 days IV", async function () {
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(28));
    expect(iv).to.equal(107590000);
    expect(decimals).to.equal(8);
  });

  it("Should return 29 days IV", async function () {
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(29));
    expect(iv).to.equal(107590000);
    expect(decimals).to.equal(8);
  });

  it("Should return 30 days IV", async function () {
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(30));
    expect(iv).to.equal(107590000);
    expect(decimals).to.equal(8);
  });

  it("Should return 31 days IV", async function () {
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(31));
    expect(iv).to.equal(107590000);
    expect(decimals).to.equal(8);
  });

  it("Should successfully add allow periods", async function () {
    const chainlinkIVOracle = await this.chainlinkIVOracle.connect(this.signers.admin);

    await chainlinkIVOracle.addAllowedPeriods(10);

    expect(await chainlinkIVOracle.allowedPeriods(10)).to.be.true;
  });

  it("Should successfully map days to IV periods", async function () {
    const chainlinkIVOracle = await this.chainlinkIVOracle.connect(this.signers.admin);
    await chainlinkIVOracle.addAllowedPeriods(10);
    await chainlinkIVOracle.mapDaysToIVPeriod(10, 10);

    expect(await chainlinkIVOracle.ivPeriodMap(10)).to.be.equal(10);
  });

  it("Should throw Invalid aggregator period while mapping days to IV periods", async function () {
    const chainlinkIVOracle = await this.chainlinkIVOracle.connect(this.signers.admin);
    await expect(chainlinkIVOracle.mapDaysToIVPeriod(10, 10)).to.be.revertedWith("Invalid aggregator period");
  });
}
