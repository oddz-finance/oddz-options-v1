import { expect } from "chai";
import { getExpiry } from "../../test-utils";
import { utils } from "ethers";

export function shouldBehaveLikeChainlinkIVOracle(): void {
  it("should return 1 day IV", async function () {
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(1), 160000000000, 176000000000);
    expect(iv).to.equal(83790000);
    expect(decimals).to.equal(8);
  });

  it("should return 2 days IV", async function () {
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(2), 160000000000, 176000000000);
    expect(iv).to.equal(92370000);
    expect(decimals).to.equal(8);
  });

  it("should return 3 days IV", async function () {
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(3), 160000000000, 176000000000);
    expect(iv).to.equal(92370000);
    expect(decimals).to.equal(8);
  });

  it("should return 4 days IV", async function () {
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(4), 160000000000, 176000000000);
    expect(iv).to.equal(92370000);
    expect(decimals).to.equal(8);
  });

  it("should return 5 days IV", async function () {
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(5), 160000000000, 176000000000);
    expect(iv).to.equal(101540000);
    expect(decimals).to.equal(8);
  });

  it("should return 6 days IV", async function () {
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(6), 160000000000, 176000000000);
    expect(iv).to.equal(101540000);
    expect(decimals).to.equal(8);
  });

  it("should return 7 days IV", async function () {
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(7), 160000000000, 176000000000);
    expect(iv).to.equal(101540000);
    expect(decimals).to.equal(8);
  });

  it("should return 8 days IV", async function () {
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(8), 160000000000, 176000000000);
    expect(iv).to.equal(101540000);
    expect(decimals).to.equal(8);
  });

  it("should return 9 days IV", async function () {
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(9), 160000000000, 176000000000);
    expect(iv).to.equal(101540000);
    expect(decimals).to.equal(8);
  });

  it("should return 10 days IV", async function () {
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(10), 160000000000, 176000000000);
    expect(iv).to.equal(101540000);
    expect(decimals).to.equal(8);
  });

  it("should return 11 days IV", async function () {
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(11), 160000000000, 176000000000);
    expect(iv).to.equal(104720000);
    expect(decimals).to.equal(8);
  });

  it("should return 12 days IV", async function () {
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(12), 160000000000, 176000000000);
    expect(iv).to.equal(104720000);
    expect(decimals).to.equal(8);
  });

  it("should return 13 days IV", async function () {
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(13), 160000000000, 176000000000);
    expect(iv).to.equal(104720000);
    expect(decimals).to.equal(8);
  });

  it("should return 14 days IV", async function () {
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(14), 160000000000, 176000000000);
    expect(iv).to.equal(104720000);
    expect(decimals).to.equal(8);
  });

  it("should return 15 days IV", async function () {
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(15), 160000000000, 176000000000);
    expect(iv).to.equal(104720000);
    expect(decimals).to.equal(8);
  });

  it("should return 16 days IV", async function () {
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(16), 160000000000, 176000000000);
    expect(iv).to.equal(104720000);
    expect(decimals).to.equal(8);
  });

  it("should return 17 days IV", async function () {
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(17), 160000000000, 176000000000);
    expect(iv).to.equal(104720000);
    expect(decimals).to.equal(8);
  });

  it("should return 18 days IV", async function () {
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(18), 160000000000, 176000000000);
    expect(iv).to.equal(105860000);
    expect(decimals).to.equal(8);
  });

  it("should return 19 days IV", async function () {
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(19), 160000000000, 176000000000);
    expect(iv).to.equal(105860000);
    expect(decimals).to.equal(8);
  });

  it("should return 20 days IV", async function () {
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(20), 160000000000, 176000000000);
    expect(iv).to.equal(105860000);
    expect(decimals).to.equal(8);
  });

  it("should return 21 days IV", async function () {
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(21), 160000000000, 176000000000);
    expect(iv).to.equal(105860000);
    expect(decimals).to.equal(8);
  });

  it("should return 22 days IV", async function () {
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(22), 160000000000, 176000000000);
    expect(iv).to.equal(105860000);
    expect(decimals).to.equal(8);
  });

  it("should return 23 days IV", async function () {
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(23), 160000000000, 176000000000);
    expect(iv).to.equal(105860000);
    expect(decimals).to.equal(8);
  });

  it("should return 24 days IV", async function () {
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(24), 160000000000, 176000000000);
    expect(iv).to.equal(105860000);
    expect(decimals).to.equal(8);
  });

  it("should return 25 days IV", async function () {
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(25), 160000000000, 176000000000);
    expect(iv).to.equal(107590000);
    expect(decimals).to.equal(8);
  });

  it("should return 26 days IV", async function () {
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(26), 160000000000, 176000000000);
    expect(iv).to.equal(107590000);
    expect(decimals).to.equal(8);
  });

  it("should return 27 days IV", async function () {
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(27), 160000000000, 176000000000);
    expect(iv).to.equal(107590000);
    expect(decimals).to.equal(8);
  });

  it("should return 28 days IV", async function () {
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(28), 160000000000, 176000000000);
    expect(iv).to.equal(107590000);
    expect(decimals).to.equal(8);
  });

  it("should return 29 days IV", async function () {
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(29), 160000000000, 176000000000);
    expect(iv).to.equal(107590000);
    expect(decimals).to.equal(8);
  });

  it("should return 30 days IV", async function () {
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(30), 160000000000, 176000000000);
    expect(iv).to.equal(107590000);
    expect(decimals).to.equal(8);
  });

  it("should return 31 days IV", async function () {
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(31), 160000000000, 176000000000);
    expect(iv).to.equal(107590000);
    expect(decimals).to.equal(8);
  });

  it("should successfully add allow periods", async function () {
    const chainlinkIVOracle = await this.chainlinkIVOracle.connect(this.signers.admin);

    await chainlinkIVOracle.addAllowedPeriods(10);

    expect(await chainlinkIVOracle.allowedPeriods(10)).to.be.true;
  });

  it("should successfully map days to IV periods", async function () {
    const chainlinkIVOracle = await this.chainlinkIVOracle.connect(this.signers.admin);
    await chainlinkIVOracle.addAllowedPeriods(10);
    await chainlinkIVOracle.mapDaysToIVPeriod(10, 10);

    expect(await chainlinkIVOracle.ivPeriodMap(10)).to.be.equal(10);
  });

  it("should throw Invalid aggregator period while mapping days to IV periods", async function () {
    const chainlinkIVOracle = await this.chainlinkIVOracle.connect(this.signers.admin);
    await expect(chainlinkIVOracle.mapDaysToIVPeriod(10, 10)).to.be.revertedWith("Invalid aggregator period");
  });

  it("should revert setting volatility precision for non owner", async function () {
    const chainlinkIVOracle = await this.chainlinkIVOracle.connect(this.signers.admin1);
    await expect(chainlinkIVOracle.setVolatilityPrecision(3)).to.be.revertedWith("caller has no access to the method");
  });

  it("should set volatility precision", async function () {
    const chainlinkIVOracle = await this.chainlinkIVOracle.connect(this.signers.admin);
    await chainlinkIVOracle.setVolatilityPrecision(3);
    expect(await chainlinkIVOracle.volatilityPrecision()).to.equal(3);
  });

  it("should revert set min volatility bound for non owner", async function () {
    const chainlinkIVOracle = await this.chainlinkIVOracle.connect(this.signers.admin1);
    await expect(chainlinkIVOracle.setMinVolatilityBound(100)).to.be.revertedWith("caller has no access to the method");
  });

  it("should set min volatility bound", async function () {
    const chainlinkIVOracle = await this.chainlinkIVOracle.connect(this.signers.admin);
    await chainlinkIVOracle.setMinVolatilityBound(100);
    expect(await chainlinkIVOracle.minVolatilityBound()).to.equal(100);
  });

  it("should revert set max volatility bound for non owner", async function () {
    const chainlinkIVOracle = await this.chainlinkIVOracle.connect(this.signers.admin1);
    await expect(chainlinkIVOracle.setMaxVolatilityBound(30000)).to.be.revertedWith(
      "caller has no access to the method",
    );
  });

  it("should set max volatility bound", async function () {
    const chainlinkIVOracle = await this.chainlinkIVOracle.connect(this.signers.admin);
    await chainlinkIVOracle.setMinVolatilityBound(30000);
    expect(await chainlinkIVOracle.minVolatilityBound()).to.equal(30000);
  });

  it("should revert adding volatility mapping for out of bound value", async function () {
    const chainlinkIVOracle = await this.chainlinkIVOracle.connect(this.signers.admin);
    await expect(
      chainlinkIVOracle.addVolatilityMapping(
        utils.formatBytes32String("ETH"),
        utils.formatBytes32String("USD"),
        1,
        10,
        20001, //96.68
      ),
    ).to.be.revertedWith("Volatility out of bound");
  });

  it("should revert adding volatility mapping for non owner", async function () {
    const chainlinkIVOracle = await this.chainlinkIVOracle.connect(this.signers.admin1);
    await expect(
      chainlinkIVOracle.addVolatilityMapping(
        utils.formatBytes32String("ETH"),
        utils.formatBytes32String("USD"),
        1,
        10,
        9668, //96.68
      ),
    ).to.be.revertedWith("caller has no access to the method");
  });

  it("should add volatility mapping", async function () {
    const chainlinkIVOracle = await this.chainlinkIVOracle.connect(this.signers.admin);
    await chainlinkIVOracle.addVolatilityMapping(
      utils.formatBytes32String("ETH"),
      utils.formatBytes32String("USD"),
      1,
      10,
      9668,
    );

    const hash = utils.keccak256(
      utils.defaultAbiCoder.encode(
        ["bytes32", "bytes32", "uint256"],
        [utils.formatBytes32String("ETH"), utils.formatBytes32String("USD"), 1],
      ),
    );
    expect(await chainlinkIVOracle.volatility(hash, 10)).to.equal(9668);
  });

  it("should get volatility for at the money option", async function () {
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(1), 160000000000, 160000000000);
    expect(iv).to.equal(83790000);
    expect(decimals).to.equal(8);
  });

  it("should get at the money iv if there is no iv retrieved", async function () {
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(1), 160000000000, 176000000000);
    expect(iv).to.equal(83790000);
    expect(decimals).to.equal(8);
  });

  it("should get volatility for 10 %", async function () {
    const chainlinkIVOracle = await this.chainlinkIVOracle.connect(this.signers.admin);
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    await chainlinkIVOracle.addVolatilityMapping(
      utils.formatBytes32String("ETH"),
      utils.formatBytes32String("USD"),
      1,
      0,
      9000,
    );

    await chainlinkIVOracle.addVolatilityMapping(
      utils.formatBytes32String("ETH"),
      utils.formatBytes32String("USD"),
      1,
      110,
      9668,
    );

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(1), 160000000000, 176000000000);

    expect(iv).to.equal(90470000);
    expect(decimals).to.equal(8);
  });

  it("should get volatility of plus5% with 2% difference in current and strike", async function () {
    const chainlinkIVOracle = await this.chainlinkIVOracle.connect(this.signers.admin);
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    await chainlinkIVOracle.addVolatilityMapping(
      utils.formatBytes32String("ETH"),
      utils.formatBytes32String("USD"),
      1,
      0,
      9000,
    );

    await chainlinkIVOracle.addVolatilityMapping(
      utils.formatBytes32String("ETH"),
      utils.formatBytes32String("USD"),
      1,
      105,
      9668,
    );

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(1), 160000000000, 163200000000);

    expect(iv).to.equal(90470000);
    expect(decimals).to.equal(8);
  });

  it("should get volatility for less5% with 2% difference in current and strike", async function () {
    const chainlinkIVOracle = await this.chainlinkIVOracle.connect(this.signers.admin);
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    await chainlinkIVOracle.addVolatilityMapping(
      utils.formatBytes32String("ETH"),
      utils.formatBytes32String("USD"),
      1,
      0,
      9000,
    );

    await chainlinkIVOracle.addVolatilityMapping(
      utils.formatBytes32String("ETH"),
      utils.formatBytes32String("USD"),
      1,
      5,
      9668,
    );

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(1), 160000000000, 156800000000);

    expect(iv).to.equal(90470000);
    expect(decimals).to.equal(8);
  });

  it("should get volatility for plus90% with 90% difference in current and strike", async function () {
    const chainlinkIVOracle = await this.chainlinkIVOracle.connect(this.signers.admin);
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    await chainlinkIVOracle.addVolatilityMapping(
      utils.formatBytes32String("ETH"),
      utils.formatBytes32String("USD"),
      1,
      0,
      9000,
    );

    await chainlinkIVOracle.addVolatilityMapping(
      utils.formatBytes32String("ETH"),
      utils.formatBytes32String("USD"),
      1,
      190,
      9668,
    );

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(1), 160000000000, 304000000000);

    expect(iv).to.equal(90470000);
    expect(decimals).to.equal(8);
  });

  it("should get volatility for less90% with 90% difference in current and strike", async function () {
    const chainlinkIVOracle = await this.chainlinkIVOracle.connect(this.signers.admin);
    const mockIVManager = await this.mockIVManager.connect(this.signers.admin);

    await chainlinkIVOracle.addVolatilityMapping(
      utils.formatBytes32String("ETH"),
      utils.formatBytes32String("USD"),
      1,
      0,
      9000,
    );

    await chainlinkIVOracle.addVolatilityMapping(
      utils.formatBytes32String("ETH"),
      utils.formatBytes32String("USD"),
      1,
      90,
      9668,
    );

    const { iv, decimals } = await mockIVManager.calculateIv(getExpiry(1), 160000000000, 16000000000);

    expect(iv).to.equal(90470000);
    expect(decimals).to.equal(8);
  });
}
