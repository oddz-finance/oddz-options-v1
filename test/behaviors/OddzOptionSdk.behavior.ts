import { expect } from "chai";
import { BigNumber, utils } from "ethers";
import { OptionType, getExpiry } from "../../test-utils";
import {
  OddzLiquidityPool,
  OddzAssetManager,
  MockERC20,
  OddzPriceOracleManager,
  MockOddzPriceOracle,
  OddzOptionSdk,
} from "../../typechain";
import { Signer } from "@ethersproject/abstract-signer";

const getPremiumWithSlippageAndBuy = async (
  oddzOptionSdk: OddzOptionSdk,
  pairId: number,
  model: string,
  expiry: number,
  amount: BigNumber,
  strike: BigNumber,
  type: number,
  slippage: any,
  admin: string,
  isBuy: boolean,
) => {
  //console.log("admin: ",admin.toString())
  const premium: any = await oddzOptionSdk.getPremium(
    pairId,
    model,
    expiry,
    amount, // number of options
    strike,
    type,
  );
  const premiumWithSlippage = Number(premium.optionPremium * (1 + slippage / 100));
  if (isBuy) {
    await oddzOptionSdk.buy(
      pairId,
      model,
      BigNumber.from(utils.parseEther((premiumWithSlippage / 1e18).toString())),
      expiry,
      amount, // number of options
      strike,
      type,
      admin,
    );
  } else {
    return premium.optionPremium * (1 + slippage / 100);
  }
};
const getAssetPair = async (
  oddzAssetManager: OddzAssetManager,
  admin: Signer,
  oddzPriceOracleManager: OddzPriceOracleManager,
  oracleAddress: MockOddzPriceOracle,
  usdcToken: MockERC20,
  ethToken: MockERC20,
) => {
  const oam = await oddzAssetManager.connect(admin);
  await oam.addAsset(utils.formatBytes32String("USD"), usdcToken.address, 8);
  await oam.addAsset(utils.formatBytes32String("ETH"), ethToken.address, 8);
  await oam.addAssetPair(1, 0, BigNumber.from(utils.parseEther("0.01")));

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

  return (await oam.pairs(0))._id;
};

const addLiquidity = async (oddzLiquidityPool: OddzLiquidityPool, admin: Signer, amount: number) => {
  const olp = await oddzLiquidityPool.connect(admin);
  await olp.addLiquidity(utils.parseEther(amount.toString()), await admin.getAddress());
  return olp;
};

export function shouldBehaveLikeOddzOptionSdk(): void {
  it("should fail with message invalid asset pair", async function () {
    const oddzOptionSdk = await this.oddzOptionSdk.connect(this.signers.admin);

    await expect(
      oddzOptionSdk.getPremium(
        1,
        utils.formatBytes32String("B_S"),
        getExpiry(1),
        BigNumber.from(100),
        BigNumber.from(1234),
        OptionType.Call,
      ),
    ).to.be.revertedWith("Invalid Asset pair");
  });

  it("should return premium price only if the asset pair is active", async function () {
    const oddzOptionSdk = await this.oddzOptionSdk.connect(this.signers.admin);
    const pairId = await getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );
    const oddzAssetManager = await this.oddzAssetManager.connect(this.signers.admin);
    await oddzAssetManager.deactivateAssetPair(pairId);
    await expect(
      oddzOptionSdk.getPremium(
        pairId,
        utils.formatBytes32String("B_S"),
        getExpiry(1),
        BigNumber.from(utils.parseEther("1")), // number of options
        BigNumber.from(160000000000),
        OptionType.Call,
      ),
    ).to.be.revertedWith("Invalid Asset pair");
    await oddzAssetManager.activateAssetPair(pairId);
    const option = await oddzOptionSdk.getPremium(
      pairId,
      utils.formatBytes32String("B_S"),
      getExpiry(1),
      BigNumber.from(utils.parseEther("1")), // number of options
      BigNumber.from(160000000000),
      OptionType.Call,
    );
    const { optionPremium, txnFee } = option;
    await expect(BigNumber.from(optionPremium).div(1e10)).to.equal(6653168625);
    await expect(BigNumber.from(txnFee).div(1e10)).to.equal(332658431);
  });

  it("should return the premium price 1 day", async function () {
    const oddzOptionSdk = await this.oddzOptionSdk.connect(this.signers.admin);
    // call should be optionType.call
    const pairId = getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );
    const option = await oddzOptionSdk.getPremium(
      pairId,
      utils.formatBytes32String("B_S"),
      getExpiry(1),
      BigNumber.from(utils.parseEther("1")), // number of options
      BigNumber.from(160000000000),
      OptionType.Call,
    );
    const { optionPremium, txnFee, iv } = option;
    expect(iv.toNumber()).to.equal(180000);
    expect(BigNumber.from(optionPremium).div(1e10)).to.equal(6653168625);
    expect(BigNumber.from(txnFee).div(1e10)).to.equal(332658431);
    await expect(BigNumber.from(optionPremium).div(1e10)).to.equal(6653168625);
  });

  it("should return the premium price for 7 days", async function () {
    const oddzOptionSdk = await this.oddzOptionSdk.connect(this.signers.admin);
    // call should be optionType.call
    const pairId = getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );
    const option = await oddzOptionSdk.getPremium(
      pairId,
      utils.formatBytes32String("B_S"),
      getExpiry(7),
      BigNumber.from(utils.parseEther("1")), // number of options
      BigNumber.from(160000000000),
      OptionType.Call,
    );
    const { optionPremium, txnFee, iv } = option;
    expect(iv.toNumber()).to.equal(180000);
    expect(BigNumber.from(optionPremium).div(1e10)).to.equal(16536825618);
    expect(BigNumber.from(txnFee).div(1e10)).to.equal(826841280);
  });

  it("should throw Expiration cannot be less than 1 days error when the expiry is less than a day", async function () {
    const oddzOptionSdk = await this.oddzOptionSdk.connect(this.signers.admin);

    await expect(
      oddzOptionSdk.buy(
        1,
        utils.formatBytes32String("B_S"),
        BigNumber.from(utils.parseEther("1")),
        getExpiry(0),
        BigNumber.from(utils.parseEther("1")), // number of options
        BigNumber.from(123400000000),
        OptionType.Call,
        this.accounts.admin,
      ),
    ).to.be.revertedWith("Expiration cannot be less than 1 days");
  });

  it("should throw Expiration cannot be more than 30 days error when the expiry is more than a 30 days", async function () {
    const oddzOptionSdk = await this.oddzOptionSdk.connect(this.signers.admin);
    await expect(
      oddzOptionSdk.buy(
        1,
        utils.formatBytes32String("B_S"),
        BigNumber.from(utils.parseEther("1")),
        getExpiry(31),
        BigNumber.from(utils.parseEther("1")), // number of options
        BigNumber.from(123400000000),
        OptionType.Call,
        this.accounts.admin,
      ),
    ).to.be.revertedWith("Expiration cannot be more than 30 days");
  });

  it("should prevent buying options for unsupported asset pair type", async function () {
    const oddzOptionSdk = await this.oddzOptionSdk.connect(this.signers.admin);
    await expect(
      oddzOptionSdk.buy(
        1,
        utils.formatBytes32String("B_S"),
        BigNumber.from(utils.parseEther("1")),
        getExpiry(1),
        BigNumber.from(utils.parseEther("1")), // number of options
        BigNumber.from(123400000000),
        OptionType.Call,
        this.accounts.admin,
      ),
    ).to.be.revertedWith("Invalid Asset pair");
  });

  it("should buy option if the asset pair is supported and emit buy event", async function () {
    const oddzOptionSdk = await this.oddzOptionSdk.connect(this.signers.admin);
    await addLiquidity(this.oddzLiquidityPool, this.signers.admin, 1000000);
    const pairId = await getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );

    const premiumWithSlippage = await getPremiumWithSlippageAndBuy(
      this.oddzOptionSdk,
      pairId,
      utils.formatBytes32String("B_S"),
      getExpiry(1),
      BigNumber.from(utils.parseEther("1")), // number of options
      BigNumber.from(160000000000),
      OptionType.Call,
      0.05,
      this.accounts.admin,
      false,
    );

    await expect(
      oddzOptionSdk.buy(
        pairId,
        utils.formatBytes32String("B_S"),
        BigInt(premiumWithSlippage),
        getExpiry(1),
        BigNumber.from(utils.parseEther("1")), // number of options
        BigNumber.from(160000000000),
        OptionType.Call,
        this.accounts.admin,
      ),
    ).to.emit(oddzOptionSdk, "BuySdk");
  });

  it("should revert buy for less than purchase limit", async function () {
    const oddzOptionSdk = await this.oddzOptionSdk.connect(this.signers.admin);

    const pairId = await getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );

    const premiumWithSlippage = await getPremiumWithSlippageAndBuy(
      this.oddzOptionSdk,
      pairId,
      utils.formatBytes32String("B_S"),
      getExpiry(1),
      BigNumber.from(utils.parseEther("0.001")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
      0.05,
      this.accounts.admin,
      false,
    );

    await expect(
      oddzOptionSdk.buy(
        pairId,
        utils.formatBytes32String("B_S"),
        BigInt(premiumWithSlippage),
        getExpiry(2),
        BigNumber.from(utils.parseEther("0.001")), // number of options
        BigNumber.from(170000000000),
        OptionType.Call,
        this.accounts.admin,
      ),
    ).to.be.revertedWith("amount less than purchase limit");
  });

  it("should set less limit and buy option", async function () {
    const oddzOptionSdk = await this.oddzOptionSdk.connect(this.signers.admin);
    const oddzAssetManager = await this.oddzAssetManager.connect(this.signers.admin);

    const pairId = await getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );
    await addLiquidity(this.oddzLiquidityPool, this.signers.admin, 1000000);
    const purchaseLimit = await oddzAssetManager.getPurchaseLimit(pairId);
    const premiumWithSlippage = await getPremiumWithSlippageAndBuy(
      this.oddzOptionSdk,
      pairId,
      utils.formatBytes32String("B_S"),
      getExpiry(2),
      BigNumber.from(purchaseLimit / 10), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
      0.05,
      this.accounts.admin,
      false,
    );
    await expect(
      oddzOptionSdk.buy(
        pairId,
        utils.formatBytes32String("B_S"),
        BigInt(premiumWithSlippage),
        getExpiry(2),
        BigNumber.from(purchaseLimit / 10), // number of options
        BigNumber.from(170000000000),
        OptionType.Call,
        this.accounts.admin,
      ),
    ).to.be.revertedWith("amount less than purchase limit");
    await oddzAssetManager.setPurchaseLimit(pairId, BigNumber.from(purchaseLimit / 10));
    const premiumWithSlippage1 = await getPremiumWithSlippageAndBuy(
      this.oddzOptionSdk,
      pairId,
      utils.formatBytes32String("B_S"),
      getExpiry(2),
      BigNumber.from(utils.parseEther("0.002")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
      0.05,
      this.accounts.admin,
      false,
    );

    await expect(
      oddzOptionSdk.buy(
        pairId,
        utils.formatBytes32String("B_S"),
        BigInt(premiumWithSlippage1),
        getExpiry(2),
        BigNumber.from(utils.parseEther("0.002")), // number of options
        BigNumber.from(170000000000),
        OptionType.Call,
        this.accounts.admin,
      ),
    ).to.emit(oddzOptionSdk, "BuySdk");
  });

  it("should revert buy when premium crosses slippage limit of 5%", async function () {
    const oddzOptionSdk = await this.oddzOptionSdk.connect(this.signers.admin);
    const oddzVolatility = await this.oddzVolatility.connect(this.signers.admin);

    const pairId = await getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );
    await addLiquidity(this.oddzLiquidityPool, this.signers.admin, 1000000);
    const premiumWithSlippage = await getPremiumWithSlippageAndBuy(
      this.oddzOptionSdk,
      pairId,
      utils.formatBytes32String("B_S"),
      getExpiry(1),
      BigNumber.from(utils.parseEther("1")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
      5,
      this.accounts.admin,
      false,
    );
    await oddzVolatility.setIv(3600000, 5);
    await expect(
      oddzOptionSdk.buy(
        pairId,
        utils.formatBytes32String("B_S"),
        BigInt(premiumWithSlippage),
        getExpiry(1),
        BigNumber.from(utils.parseEther("1")), // number of options
        BigNumber.from(170000000000),
        OptionType.Call,
        this.accounts.admin,
      ),
    ).to.be.revertedWith("Premium crossed slippage tolerance");
  });

  it("should revert buy when premium crosses slippage limit of 3%", async function () {
    const oddzOptionSdk = await this.oddzOptionSdk.connect(this.signers.admin);
    const oddzVolatility = await this.oddzVolatility.connect(this.signers.admin);

    const pairId = await getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );
    await addLiquidity(this.oddzLiquidityPool, this.signers.admin, 1000000);
    const premiumWithSlippage = await getPremiumWithSlippageAndBuy(
      this.oddzOptionSdk,
      pairId,
      utils.formatBytes32String("B_S"),
      getExpiry(1),
      BigNumber.from(utils.parseEther("1")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
      3,
      this.accounts.admin,
      false,
    );
    await oddzVolatility.setIv(3600000, 5);
    await expect(
      oddzOptionSdk.buy(
        pairId,
        utils.formatBytes32String("B_S"),
        BigInt(premiumWithSlippage),
        getExpiry(1),
        BigNumber.from(utils.parseEther("1")), // number of options
        BigNumber.from(170000000000),
        OptionType.Call,
        this.accounts.admin,
      ),
    ).to.be.revertedWith("Premium crossed slippage tolerance");
  });
  it("should revert buy when premium crosses slippage limit of 1%", async function () {
    const oddzOptionSdk = await this.oddzOptionSdk.connect(this.signers.admin);
    const oddzVolatility = await this.oddzVolatility.connect(this.signers.admin);

    const pairId = await getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );
    await addLiquidity(this.oddzLiquidityPool, this.signers.admin, 1000000);
    const premiumWithSlippage = await getPremiumWithSlippageAndBuy(
      this.oddzOptionSdk,
      pairId,
      utils.formatBytes32String("B_S"),
      getExpiry(1),
      BigNumber.from(utils.parseEther("1")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
      1,
      this.accounts.admin,
      false,
    );
    await oddzVolatility.setIv(3600000, 5);
    await expect(
      oddzOptionSdk.buy(
        pairId,
        utils.formatBytes32String("B_S"),
        BigInt(premiumWithSlippage),
        getExpiry(1),
        BigNumber.from(utils.parseEther("1")), // number of options
        BigNumber.from(170000000000),
        OptionType.Call,
        this.accounts.admin,
      ),
    ).to.be.revertedWith("Premium crossed slippage tolerance");
  });

  it("should revert buy when premium crosses slippage limit of 0.5%", async function () {
    const oddzOptionSdk = await this.oddzOptionSdk.connect(this.signers.admin);
    const oddzVolatility = await this.oddzVolatility.connect(this.signers.admin);

    const pairId = await getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );
    await addLiquidity(this.oddzLiquidityPool, this.signers.admin, 1000000);
    const premiumWithSlippage = await getPremiumWithSlippageAndBuy(
      this.oddzOptionSdk,
      pairId,
      utils.formatBytes32String("B_S"),
      getExpiry(1),
      BigNumber.from(utils.parseEther("1")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
      0.5,
      this.accounts.admin,
      false,
    );
    await oddzVolatility.setIv(3600000, 5);
    await expect(
      oddzOptionSdk.buy(
        pairId,
        utils.formatBytes32String("B_S"),
        BigInt(premiumWithSlippage),
        getExpiry(1),
        BigNumber.from(utils.parseEther("1")), // number of options
        BigNumber.from(170000000000),
        OptionType.Call,
        this.accounts.admin,
      ),
    ).to.be.revertedWith("Premium crossed slippage tolerance");
  });

  it("should revert  with less slippage and buy for more slippage with same iv", async function () {
    const oddzOptionSdk = await this.oddzOptionSdk.connect(this.signers.admin);
    const oddzVolatility = await this.oddzVolatility.connect(this.signers.admin);

    const pairId = await getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );
    await addLiquidity(this.oddzLiquidityPool, this.signers.admin, 1000000);
    const premiumWithSlippage = await getPremiumWithSlippageAndBuy(
      this.oddzOptionSdk,
      pairId,
      utils.formatBytes32String("B_S"),
      getExpiry(1),
      BigNumber.from(utils.parseEther("1")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
      3,
      this.accounts.admin,
      false,
    );
    // increae iv
    await oddzVolatility.setIv(182831, 5);
    await expect(
      oddzOptionSdk.buy(
        pairId,
        utils.formatBytes32String("B_S"),
        BigInt(premiumWithSlippage),
        getExpiry(1),
        BigNumber.from(utils.parseEther("1")), // number of options
        BigNumber.from(170000000000),
        OptionType.Call,
        this.accounts.admin,
      ),
    ).to.be.revertedWith("Premium crossed slippage tolerance");
    // reset IV to original
    await oddzVolatility.setIv(180000, 5);
    const premiumWithSlippage1 = await getPremiumWithSlippageAndBuy(
      this.oddzOptionSdk,
      pairId,
      utils.formatBytes32String("B_S"),
      getExpiry(1),
      BigNumber.from(utils.parseEther("1")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
      3.1,
      this.accounts.admin,
      false,
    );
    // increase iv
    await oddzVolatility.setIv(182831, 5);
    await expect(
      oddzOptionSdk.buy(
        pairId,
        utils.formatBytes32String("B_S"),
        BigInt(premiumWithSlippage1),
        getExpiry(1),
        BigNumber.from(utils.parseEther("1")), // number of options
        BigNumber.from(170000000000),
        OptionType.Call,
        this.accounts.admin,
      ),
    ).to.emit(oddzOptionSdk, "BuySdk");
  });

  it("should  revert for invalid address while add liquidity", async function () {
    const oddzOptionSdk = await this.oddzOptionSdk.connect(this.signers.admin);
    const depositAmount = 1000;
    await expect(
      oddzOptionSdk.addLiquidity(depositAmount, "0x0000000000000000000000000000000000000000"),
    ).to.be.revertedWith("invalid provider address");
  });

  it("should  revert for invalid address while buying option", async function () {
    const oddzOptionSdk = await this.oddzOptionSdk.connect(this.signers.admin);
    const pairId = await getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );
    await expect(
      oddzOptionSdk.buy(
        pairId,
        utils.formatBytes32String("B_S"),
        BigNumber.from(utils.parseEther("1")),
        getExpiry(1),
        BigNumber.from(utils.parseEther("1")), // number of options
        BigNumber.from(170000000000),
        OptionType.Call,
        "0x0000000000000000000000000000000000000000",
      ),
    ).to.revertedWith("invalid provider address");
  });

  it("should  emit AddLiquidity event ", async function () {
    const oddzOptionSdk = await this.oddzOptionSdk.connect(this.signers.admin);
    const depositAmount = 1000;
    await expect(oddzOptionSdk.addLiquidity(depositAmount, this.accounts.admin)).to.emit(
      oddzOptionSdk,
      "AddLiquiditySdk",
    );
  });

  it("should  get liquidity count of provider ", async function () {
    const oddzOptionSdk = await this.oddzOptionSdk.connect(this.signers.admin);
    const depositAmount = 1000;
    await expect(oddzOptionSdk.addLiquidity(depositAmount, this.accounts.admin)).to.emit(
      oddzOptionSdk,
      "AddLiquiditySdk",
    );

    expect(await oddzOptionSdk.liquidityCount(this.accounts.admin)).to.equal(1);
  });
  it("should  get option count of provider ", async function () {
    const oddzOptionSdk = await this.oddzOptionSdk.connect(this.signers.admin);

    const pairId = await getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );
    await addLiquidity(this.oddzLiquidityPool, this.signers.admin, 1000000);
    const premiumWithSlippage = await getPremiumWithSlippageAndBuy(
      this.oddzOptionSdk,
      pairId,
      utils.formatBytes32String("B_S"),
      getExpiry(1),
      BigNumber.from(utils.parseEther("1")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
      3,
      this.accounts.admin,
      false,
    );
    await oddzOptionSdk.buy(
      pairId,
      utils.formatBytes32String("B_S"),
      BigInt(premiumWithSlippage),
      getExpiry(1),
      BigNumber.from(utils.parseEther("1")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
      this.accounts.admin,
    );
    expect(await oddzOptionSdk.optionCount(this.accounts.admin)).to.equal(1);
  });
}
