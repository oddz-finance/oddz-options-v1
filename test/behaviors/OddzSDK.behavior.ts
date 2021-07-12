import { expect } from "chai";
import { BigNumber, utils, constants } from "ethers";
import { OptionType, getExpiry } from "../../test-utils";
import {
  OddzLiquidityPoolManager,
  OddzDefaultPool,
  OddzAssetManager,
  MockERC20,
  OddzPriceOracleManager,
  MockOddzPriceOracle,
  OddzSDK,
} from "../../typechain";
import { Signer } from "@ethersproject/abstract-signer";

const getPremiumWithSlippageAndBuy = async (
  oddzSDK: OddzSDK,
  pair: any,
  model: string,
  expiry: number,
  amount: BigNumber,
  strike: BigNumber,
  type: number,
  slippage: any,
  admin: string,
  isBuy: boolean,
) => {
  const premium: any = await oddzSDK.getPremium(
    pair,
    model,
    expiry,
    amount, // number of options
    strike,
    type,
  );
  const premiumWithSlippage = Number(premium.optionPremium * (1 + slippage / 100));
  if (isBuy) {
    await oddzSDK.buy(
      pair,
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
  await oam.addAssetPair(
    utils.formatBytes32String("ETH"),
    utils.formatBytes32String("USD"),
    BigNumber.from(utils.parseEther("0.01")),
    2592000,
    86400,
  );

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

  return (await oam.addressPairMap("0xfcb06d25357ef01726861b30b0b83e51482db417"))._address;
};

const addLiquidity = async (
  oddzDefaultPool: OddzDefaultPool,
  oddzLiquidityPoolManager: OddzLiquidityPoolManager,
  admin: Signer,
  amount: number,
) => {
  const olp = await oddzLiquidityPoolManager.connect(admin);
  await olp.addLiquidity(await admin.getAddress(), oddzDefaultPool.address, utils.parseEther(amount.toString()));
  return olp;
};

export function shouldBehaveLikeOddzSDK(): void {
  it("should fail with message invalid asset pair", async function () {
    const oddzSDK = await this.oddzSDK.connect(this.signers.admin);

    await expect(
      oddzSDK.getPremium(
        constants.AddressZero,
        utils.formatBytes32String("B_S"),
        getExpiry(1),
        BigNumber.from(100),
        BigNumber.from(1234),
        OptionType.Call,
      ),
    ).to.be.revertedWith("Invalid Asset pair");
  });

  it("should return premium price if the asset pair is active", async function () {
    const oddzSDK = await this.oddzSDK.connect(this.signers.admin);
    const pair = await getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );
    const oddzAssetManager = await this.oddzAssetManager.connect(this.signers.admin);
    await oddzAssetManager.deactivateAssetPair(pair);
    await expect(
      oddzSDK.getPremium(
        pair,
        utils.formatBytes32String("B_S"),
        getExpiry(1),
        BigNumber.from(utils.parseEther("1")), // number of options
        BigNumber.from(160000000000),
        OptionType.Call,
      ),
    ).to.be.revertedWith("Invalid Asset pair");
    await oddzAssetManager.activateAssetPair(pair);
    const option = await oddzSDK.getPremium(
      pair,
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

  it("should throw Expiration is less than min expiry error when the expiry is less than a day", async function () {
    const oddzSDK = await this.oddzSDK.connect(this.signers.admin);
    const pair = getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );

    await expect(
      oddzSDK.buy(
        pair,
        utils.formatBytes32String("B_S"),
        BigNumber.from(utils.parseEther("1")),
        getExpiry(0),
        BigNumber.from(utils.parseEther("1")), // number of options
        BigNumber.from(123400000000),
        OptionType.Call,
        this.accounts.admin,
      ),
    ).to.be.revertedWith("Expiration is less than min expiry");
  });

  it("should throw Expiration is greater than max expiry error when the expiry is more than a 30 days", async function () {
    const oddzSDK = await this.oddzSDK.connect(this.signers.admin);
    const pair = getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );

    await expect(
      oddzSDK.buy(
        pair,
        utils.formatBytes32String("B_S"),
        BigNumber.from(utils.parseEther("1")),
        getExpiry(31),
        BigNumber.from(utils.parseEther("1")), // number of options
        BigNumber.from(123400000000),
        OptionType.Call,
        this.accounts.admin,
      ),
    ).to.be.revertedWith("Expiration is greater than max expiry");
  });

  it("should prevent buying options for unsupported asset pair type", async function () {
    const oddzSDK = await this.oddzSDK.connect(this.signers.admin);
    await expect(
      oddzSDK.buy(
        constants.AddressZero,
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
    const oddzSDK = await this.oddzSDK.connect(this.signers.admin);
    await addLiquidity(this.oddzDefaultPool, this.oddzLiquidityPoolManager, this.signers.admin, 1000000);
    const pair = await getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );

    const premiumWithSlippage = await getPremiumWithSlippageAndBuy(
      this.oddzSDK,
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(1),
      BigNumber.from(utils.parseEther("1")), // number of options
      BigNumber.from(160000000000),
      OptionType.Call,
      0.05,
      this.accounts.admin,
      false,
    );

    await oddzSDK.buy(
      pair,
      utils.formatBytes32String("B_S"),
      BigInt(premiumWithSlippage),
      getExpiry(1),
      BigNumber.from(utils.parseEther("1")), // number of options
      BigNumber.from(160000000000),
      OptionType.Call,
      this.accounts.admin,
    );

    await oddzSDK.buy(
      pair,
      utils.formatBytes32String("B_S"),
      BigInt(premiumWithSlippage),
      getExpiry(1),
      BigNumber.from(utils.parseEther("1")), // number of options
      BigNumber.from(160000000000),
      OptionType.Call,
      this.accounts.admin,
    );
    expect(await oddzSDK.premiumCollected(this.accounts.admin, new Date().getMonth() + 1)).to.equal(
      BigNumber.from(utils.parseEther("133.0633725")),
    );
    expect(await oddzSDK.totalPremiumCollected(new Date().getMonth() + 1)).to.equal(
      BigNumber.from(utils.parseEther("133.0633725")),
    );
  });

  it("should revert buy for less than purchase limit", async function () {
    const oddzSDK = await this.oddzSDK.connect(this.signers.admin);

    const pair = await getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );

    const premiumWithSlippage = await getPremiumWithSlippageAndBuy(
      this.oddzSDK,
      pair,
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
      oddzSDK.buy(
        pair,
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

  it("should revert with less slippage and buy for more slippage with same iv", async function () {
    const oddzSDK = await this.oddzSDK.connect(this.signers.admin);
    const oddzVolatility = await this.oddzVolatility.connect(this.signers.admin);

    const pair = await getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );
    await addLiquidity(this.oddzDefaultPool, this.oddzLiquidityPoolManager, this.signers.admin, 1000000);
    const premiumWithSlippage = await getPremiumWithSlippageAndBuy(
      this.oddzSDK,
      pair,
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
      oddzSDK.buy(
        pair,
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
      this.oddzSDK,
      pair,
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
    await oddzSDK.buy(
      pair,
      utils.formatBytes32String("B_S"),
      BigInt(premiumWithSlippage1),
      getExpiry(1),
      BigNumber.from(utils.parseEther("1")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
      this.accounts.admin,
    );
  });

  it("should revert for invalid address while buying option", async function () {
    const oddzSDK = await this.oddzSDK.connect(this.signers.admin);
    const pairId = await getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );
    await expect(
      oddzSDK.buy(
        pairId,
        utils.formatBytes32String("B_S"),
        BigNumber.from(utils.parseEther("1")),
        getExpiry(1),
        BigNumber.from(utils.parseEther("1")), // number of options
        BigNumber.from(170000000000),
        OptionType.Call,
        constants.AddressZero,
      ),
    ).to.revertedWith("invalid provider address");
  });

  it("should get option premium of provider", async function () {
    const oddzSDK = await this.oddzSDK.connect(this.signers.admin);

    const pair = await getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );
    await addLiquidity(this.oddzDefaultPool, this.oddzLiquidityPoolManager, this.signers.admin, 1000000);
    const premiumWithSlippage = await getPremiumWithSlippageAndBuy(
      this.oddzSDK,
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(1),
      BigNumber.from(utils.parseEther("1")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
      3,
      this.accounts.admin,
      false,
    );
    await oddzSDK.buy(
      pair,
      utils.formatBytes32String("B_S"),
      BigInt(premiumWithSlippage),
      getExpiry(1),
      BigNumber.from(utils.parseEther("1")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
      this.accounts.admin,
    );
    expect(await oddzSDK.premiumCollected(this.accounts.admin, new Date().getMonth() + 1)).to.equal(
      BigNumber.from(utils.parseEther("27.85800402")),
    );
  });

  it("should revert set minimum gasless premium for non owner", async function () {
    const oddzSDK = await this.oddzSDK.connect(this.signers.admin1);

    await expect(oddzSDK.setMinimumGaslessPremium(BigNumber.from(utils.parseEther("1")))).to.be.revertedWith(
      "SDK: caller has no access to the method",
    );
  });

  it("should revert set minimum gasless premium for invalid range", async function () {
    const oddzSDK = await this.oddzSDK.connect(this.signers.admin);

    await expect(oddzSDK.setMinimumGaslessPremium(BigNumber.from(utils.parseEther("0.5")))).to.be.revertedWith(
      "invalid minimum gasless premium",
    );
  });

  it("should revert buy option with gasless if premium is less than minimum allowed", async function () {
    const oddzSDK = await this.oddzSDK.connect(this.signers.admin);
    await addLiquidity(this.oddzDefaultPool, this.oddzLiquidityPoolManager, this.signers.admin, 1000000);
    const pair = await getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );

    const premiumWithSlippage = await getPremiumWithSlippageAndBuy(
      this.oddzSDK,
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(1),
      BigNumber.from(utils.parseEther("1")), // number of options
      BigNumber.from(160000000000),
      OptionType.Call,
      0.05,
      this.accounts.admin,
      false,
    );
    await oddzSDK.setMinimumGaslessPremium(BigNumber.from(utils.parseEther("100")));

    await expect(
      oddzSDK.buyWithGasless(
        pair,
        utils.formatBytes32String("B_S"),
        BigInt(premiumWithSlippage),
        getExpiry(1),
        BigNumber.from(utils.parseEther("1")), // number of options
        BigNumber.from(160000000000),
        OptionType.Call,
        this.accounts.admin,
      ),
    ).to.be.revertedWith("SDK: premium amount not elgible for gasless");
  });

  it("should buy option with gasless", async function () {
    const oddzSDK = await this.oddzSDK.connect(this.signers.admin);
    const optionManager = await this.oddzOptionManager.connect(this.signers.admin);
    await addLiquidity(this.oddzDefaultPool, this.oddzLiquidityPoolManager, this.signers.admin, 1000000);
    const pair = await getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );

    const premiumWithSlippage = await getPremiumWithSlippageAndBuy(
      this.oddzSDK,
      pair,
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
      oddzSDK.buyWithGasless(
        pair,
        utils.formatBytes32String("B_S"),
        BigInt(premiumWithSlippage),
        getExpiry(1),
        BigNumber.from(utils.parseEther("1")), // number of options
        BigNumber.from(160000000000),
        OptionType.Call,
        this.accounts.admin,
      ),
    ).to.emit(optionManager, "Buy");
  });
}
