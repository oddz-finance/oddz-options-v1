import { expect } from "chai";
import { BigNumber, utils, constants } from "ethers";
import { OptionType, ExcerciseType, addDaysAndGetSeconds, getExpiry, Option, addSnapshotCount } from "../../test-utils";
import { waffle } from "hardhat";
import {
  OddzLiquidityPoolManager,
  OddzAssetManager,
  MockERC20,
  OddzPriceOracleManager,
  MockOddzPriceOracle,
  OddzOptionManager,
  OddzDefaultPool,
} from "../../typechain";
import { Signer } from "@ethersproject/abstract-signer";
const provider = waffle.provider;

const getOptionDetailsStruct = (
  pair: any,
  model: string,
  expiry: number,
  amount: BigNumber,
  strike: BigNumber,
  type: number,
) => {
  const option: Option = {
    _pair: pair,
    _optionModel: model,
    _expiration: expiry,
    _amount: amount,
    _strike: strike,
    _optionType: type,
  };

  return option;
};

const getPremiumWithSlippageAndBuy = async (
  oddzOptionManager: OddzOptionManager,
  optionDetails: Option,
  slippage: any,
  admin: string,
  isBuy: boolean,
) => {
  const premium: any = await oddzOptionManager.getPremium(optionDetails, admin);
  const premiumWithSlippage = Number(premium.optionPremium * (1 + slippage / 100));
  if (isBuy) {
    await oddzOptionManager.buy(
      optionDetails,
      BigNumber.from(utils.parseEther((premiumWithSlippage / 1e18).toString())),
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
  await olp.addLiquidity(oddzDefaultPool.address, utils.parseEther(amount.toString()));
  return olp;
};

export function shouldBehaveLikeOddzOptionManager(): void {
  it("should fail with message invalid asset pair", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    const optionDetails = getOptionDetailsStruct(
      constants.AddressZero,
      utils.formatBytes32String("B_S"),
      getExpiry(1),
      BigNumber.from(100),
      BigNumber.from(1234),
      OptionType.Call,
    );
    await expect(oddzOptionManager.getPremium(optionDetails, this.accounts.admin)).to.be.revertedWith(
      "Invalid Asset pair",
    );
  });

  it("should return premium price only if the asset pair is active", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
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
    const optionDetails = getOptionDetailsStruct(
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(1),
      BigNumber.from(utils.parseEther("1")), // number of options
      BigNumber.from(160000000000),
      OptionType.Call,
    );
    await expect(oddzOptionManager.getPremium(optionDetails, this.accounts.admin)).to.be.revertedWith(
      "Invalid Asset pair",
    );
    await oddzAssetManager.activateAssetPair(pair);
    const option = await oddzOptionManager.getPremium(optionDetails, this.accounts.admin);
    const { optionPremium, txnFee } = option;
    await expect(BigNumber.from(optionPremium).div(1e10)).to.equal(6653168625);
    await expect(BigNumber.from(txnFee).div(1e10)).to.equal(332658431);
  });

  it("should return the premium price 1 day", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    // call should be optionType.call
    const pair = await getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );
    const optionDetails = getOptionDetailsStruct(
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(1),
      BigNumber.from(utils.parseEther("1")), // number of options
      BigNumber.from(160000000000),
      OptionType.Call,
    );
    const option = await oddzOptionManager.getPremium(optionDetails, this.accounts.admin);
    const { optionPremium, txnFee, iv } = option;
    expect(iv.toNumber()).to.equal(180000);
    expect(BigNumber.from(optionPremium).div(1e10)).to.equal(6653168625);
    expect(BigNumber.from(txnFee).div(1e10)).to.equal(332658431);
    await expect(BigNumber.from(optionPremium).div(1e10)).to.equal(6653168625);
  });

  it("should return the premium price for 7 days", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    // call should be optionType.call
    const pair = await getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );
    const optionDetails = getOptionDetailsStruct(
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(7),
      BigNumber.from(utils.parseEther("1")), // number of options
      BigNumber.from(160000000000),
      OptionType.Call,
    );
    const option = await oddzOptionManager.getPremium(optionDetails, this.accounts.admin);
    const { optionPremium, txnFee, iv } = option;
    expect(iv.toNumber()).to.equal(180000);
    expect(BigNumber.from(optionPremium).div(1e10)).to.equal(16536825618);
    expect(BigNumber.from(txnFee).div(1e10)).to.equal(826841280);
  });

  it("should throw Expiration is less than min expiry error when the expiry is less than a day", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    const pair = getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );
    const optionDetails = getOptionDetailsStruct(
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(0),
      BigNumber.from(utils.parseEther("1")), // number of options
      BigNumber.from(123400000000),
      OptionType.Call,
    );

    await expect(
      oddzOptionManager.buy(optionDetails, BigNumber.from(utils.parseEther("1")), this.accounts.admin),
    ).to.be.revertedWith("Expiration is less than min expiry");
  });

  it("should throw Expiration is greater than max expiry error when the expiry is more than a 30 days", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    const pair = getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );
    const optionDetails = getOptionDetailsStruct(
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(31),
      BigNumber.from(utils.parseEther("1")), // number of options
      BigNumber.from(123400000000),
      OptionType.Call,
    );

    await expect(
      oddzOptionManager.buy(optionDetails, BigNumber.from(utils.parseEther("1")), this.accounts.admin),
    ).to.be.revertedWith("Expiration is greater than max expiry");
  });

  it("should throw Strike out of Range error when the strike is out of range for call option", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    const pair = getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );
    const optionDetails = getOptionDetailsStruct(
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(1),
      BigNumber.from(utils.parseEther("1")), // number of options
      BigNumber.from(975201968001),
      OptionType.Call,
    );

    await expect(
      oddzOptionManager.buy(optionDetails, BigNumber.from(utils.parseEther("10000")), this.accounts.admin),
    ).to.be.revertedWith("Strike out of Range");

    const optionDetails1 = getOptionDetailsStruct(
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(1),
      BigNumber.from(utils.parseEther("1")), // number of options
      BigNumber.from(26644747999),
      OptionType.Call,
    );

    await expect(
      oddzOptionManager.buy(optionDetails1, BigNumber.from(utils.parseEther("10000")), this.accounts.admin),
    ).to.be.revertedWith("Strike out of Range");
  });

  it("should throw Strike out of Range error when the strike is out of range for put option", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    const pair = getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );
    const optionDetails = getOptionDetailsStruct(
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(1),
      BigNumber.from(utils.parseEther("1")), // number of options
      BigNumber.from(975201968001),
      OptionType.Put,
    );

    await expect(
      oddzOptionManager.buy(optionDetails, BigNumber.from(utils.parseEther("10000")), this.accounts.admin),
    ).to.be.revertedWith("Strike out of Range");

    const optionDetails1 = getOptionDetailsStruct(
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(1),
      BigNumber.from(utils.parseEther("1")), // number of options
      BigNumber.from(26644747999),
      OptionType.Call,
    );

    await expect(
      oddzOptionManager.buy(optionDetails1, BigNumber.from(utils.parseEther("10000")), this.accounts.admin),
    ).to.be.revertedWith("Strike out of Range");
  });

  it("should prevent buying options for unsupported asset pair type", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    const optionDetails = getOptionDetailsStruct(
      constants.AddressZero,
      utils.formatBytes32String("B_S"),
      getExpiry(1),
      BigNumber.from(utils.parseEther("1")), // number of options
      BigNumber.from(123400000000),
      OptionType.Call,
    );

    await expect(
      oddzOptionManager.buy(optionDetails, BigNumber.from(utils.parseEther("1")), this.accounts.admin),
    ).to.be.revertedWith("Invalid Asset pair");
  });

  it("should buy option if the asset pair is supported and emit buy event", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    await addLiquidity(this.oddzDefaultPool, this.oddzLiquidityPoolManager, this.signers.admin, 1000000);
    const pair = await getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );

    const optionDetails = getOptionDetailsStruct(
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(1),
      BigNumber.from(utils.parseEther("1")), // number of options
      BigNumber.from(160000000000),
      OptionType.Call,
    );

    const premiumWithSlippage = await getPremiumWithSlippageAndBuy(
      this.oddzOptionManager,
      optionDetails,
      0.05,
      this.accounts.admin,
      false,
    );

    await expect(oddzOptionManager.buy(optionDetails, BigInt(premiumWithSlippage), this.accounts.admin)).to.emit(
      oddzOptionManager,
      "Buy",
    );
  });

  it("should throw low premium exception", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);

    await addLiquidity(this.oddzDefaultPool, this.oddzLiquidityPoolManager, this.signers.admin, 1000000);
    const pair = await getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );

    const optionDetails = getOptionDetailsStruct(
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(10),
      BigNumber.from(utils.parseEther("1")), // number of options
      BigNumber.from(122000000000),
      OptionType.Call,
    );
    const premiumWithSlippage = await getPremiumWithSlippageAndBuy(
      this.oddzOptionManager,
      optionDetails,
      0.05,
      this.accounts.admin,
      false,
    );

    const usdcToken = await this.usdcToken.connect(this.signers.admin);
    await usdcToken.approve(this.oddzOptionManager.address, 100);

    await expect(
      oddzOptionManager.buy(optionDetails, BigInt(premiumWithSlippage), this.accounts.admin),
    ).to.be.revertedWith("Premium is low");
  });

  it("should successfully exercise call option", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);

    const pair = await getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );

    const oddzPriceOracle = await this.oddzPriceOracle.connect(this.signers.admin);
    await addLiquidity(this.oddzDefaultPool, this.oddzLiquidityPoolManager, this.signers.admin, 1000000);

    const optionDetails = getOptionDetailsStruct(
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(2),
      BigNumber.from(utils.parseEther("5")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
    );

    await getPremiumWithSlippageAndBuy(this.oddzOptionManager, optionDetails, 0.05, this.accounts.admin, true);

    await expect(oddzOptionManager.exercise(0)).to.be.revertedWith("Call option: Current price is too low");
    await oddzPriceOracle.setUnderlyingPrice(175000000000);
    await expect(oddzOptionManager.exercise(0))
      .to.emit(oddzOptionManager, "Exercise")
      .withArgs(0, BigNumber.from(utils.parseEther("240")), BigNumber.from(utils.parseEther("10")), ExcerciseType.Cash)
      .to.emit(this.oddzDefaultPool, "Profit")
      .withArgs(0, BigNumber.from(utils.parseEther("14.28186620")));
    expect(BigNumber.from(await oddzOptionManager.settlementFeeAggregate())).to.equal(
      BigNumber.from(utils.parseEther("10")),
    );
  });

  it("should successfully exercise put option", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);

    const pair = await getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );
    await addLiquidity(this.oddzDefaultPool, this.oddzLiquidityPoolManager, this.signers.admin, 1000000);
    const optionDetails = getOptionDetailsStruct(
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(2),
      BigNumber.from(utils.parseEther("5")), // number of options
      BigNumber.from(150000000000),
      OptionType.Put,
    );
    await getPremiumWithSlippageAndBuy(this.oddzOptionManager, optionDetails, 0.05, this.accounts.admin, true);

    const oddzPriceOracle = await this.oddzPriceOracle.connect(this.signers.admin);

    await expect(oddzOptionManager.exercise(0)).to.be.revertedWith("Put option: Current price is too high");
    await oddzPriceOracle.setUnderlyingPrice(145000000000);
    await expect(oddzOptionManager.exercise(0))
      .to.emit(oddzOptionManager, "Exercise")
      .withArgs(0, BigNumber.from(utils.parseEther("240")), BigNumber.from(utils.parseEther("10")), ExcerciseType.Cash)
      .to.emit(this.oddzDefaultPool, "Loss")
      .withArgs(0, BigNumber.from(utils.parseEther("47.94690220")));
    expect(BigNumber.from(await oddzOptionManager.settlementFeeAggregate())).to.equal(
      BigNumber.from(utils.parseEther("10")),
    );
  });

  it("should throw an error when trying to excercise an option that is owned by other wallet", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);

    const pair = await getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );
    await addLiquidity(this.oddzDefaultPool, this.oddzLiquidityPoolManager, this.signers.admin, 1000000);

    const optionDetails = getOptionDetailsStruct(
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(2),
      BigNumber.from(utils.parseEther("5")), // number of options
      BigNumber.from(160000000000),
      OptionType.Call,
    );

    await getPremiumWithSlippageAndBuy(oddzOptionManager, optionDetails, 0.05, this.accounts.admin, true);

    const oddzOptionManager1 = await this.oddzOptionManager.connect(this.signers.admin1);

    await expect(oddzOptionManager1.exercise(0)).to.be.revertedWith("Wrong msg.sender");
  });

  it("should throw an error when trying excercise an option if the option is not active", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);

    const pair = await getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );
    await addLiquidity(this.oddzDefaultPool, this.oddzLiquidityPoolManager, this.signers.admin, 1000000);

    const optionDetails = getOptionDetailsStruct(
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(2),
      BigNumber.from(utils.parseEther("5")), // number of options
      BigNumber.from(160000000000),
      OptionType.Call,
    );

    await getPremiumWithSlippageAndBuy(this.oddzOptionManager, optionDetails, 0.05, this.accounts.admin, true);

    await expect(oddzOptionManager.exercise(0)).to.emit(oddzOptionManager, "Exercise");
    await expect(oddzOptionManager.exercise(0)).to.be.revertedWith("Wrong state");
  });

  it("should unlock the collateral locked if the option is expired", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);

    const pair = await getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );
    await addLiquidity(this.oddzDefaultPool, this.oddzLiquidityPoolManager, this.signers.admin, 1000000);

    const optionDetails = getOptionDetailsStruct(
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(1),
      BigNumber.from(utils.parseEther("10")), // number of options
      BigNumber.from(160000000000),
      OptionType.Call,
    );

    await getPremiumWithSlippageAndBuy(this.oddzOptionManager, optionDetails, 0.05, this.accounts.admin, true);
    const op0 = await oddzOptionManager.options(0);

    await getPremiumWithSlippageAndBuy(this.oddzOptionManager, optionDetails, 0.05, this.accounts.admin, true);
    const op1 = await oddzOptionManager.options(1);

    await getPremiumWithSlippageAndBuy(this.oddzOptionManager, optionDetails, 0.05, this.accounts.admin, true);
    const op2 = await oddzOptionManager.options(2);

    const premiums = BigNumber.from(op0.premium).add(BigNumber.from(op1.premium)).add(BigNumber.from(op2.premium));

    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(2)]);
    await expect(oddzOptionManager.unlockAll([0, 1, 2])).to.emit(oddzOptionManager, "Expire");
    const collected = BigNumber.from(
      (await this.oddzDefaultPool.connect(this.signers.admin).premiumDayPool(addDaysAndGetSeconds(2)))._collected,
    );
    expect(premiums).to.equal(collected);
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);
  });

  it("should throw an error when transaction fee updated", async function () {
    const oddzFeeManager = await this.oddzFeeManager.connect(this.signers.admin);
    await expect(oddzFeeManager.setTransactionFeePerc(0)).to.be.revertedWith("Invalid transaction fee");
    await expect(oddzFeeManager.setTransactionFeePerc(11)).to.be.revertedWith("Invalid transaction fee");
  });

  it("should update transaction percentage and option transaction fee", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);

    const pair = await getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );
    await addLiquidity(this.oddzDefaultPool, this.oddzLiquidityPoolManager, this.signers.admin, 1000000);

    const oddzFeeManager = await this.oddzFeeManager.connect(this.signers.admin);
    await oddzFeeManager.setTransactionFeePerc(2);
    expect(await oddzFeeManager.txnFeePerc()).to.equal(2);

    const optionDetails = getOptionDetailsStruct(
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(1),
      BigNumber.from(utils.parseEther("1")), // number of options
      BigNumber.from(134100000000),
      OptionType.Call,
    );
    const option = await oddzOptionManager.getPremium(optionDetails, this.accounts.admin);

    expect(BigNumber.from(option.txnFee)).to.equal(utils.parseEther("5.4465919032"));
  });

  it("should throw an error when trying to excercise an option that is expired", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);

    const pair = await getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );

    await addLiquidity(this.oddzDefaultPool, this.oddzLiquidityPoolManager, this.signers.admin, 1000000);

    const optionDetails = getOptionDetailsStruct(
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(1),
      BigNumber.from(utils.parseEther("1")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
    );

    await getPremiumWithSlippageAndBuy(this.oddzOptionManager, optionDetails, 0.05, this.accounts.admin, true);

    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(2)]);
    await expect(oddzOptionManager.exercise(0)).to.be.revertedWith("Option has expired");
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);
  });

  it("should update settlement percentage and option excercise fee", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);

    const pair = await getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );
    await addLiquidity(this.oddzDefaultPool, this.oddzLiquidityPoolManager, this.signers.admin, 1000000);

    const oddzPriceOracle = await this.oddzPriceOracle.connect(this.signers.admin);
    const oddzFeeManager = await this.oddzFeeManager.connect(this.signers.admin);
    await oddzFeeManager.setSettlementFeePerc(5);
    expect(await oddzFeeManager.settlementFeePerc()).to.equal(5);

    const optionDetails = getOptionDetailsStruct(
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(2),
      BigNumber.from(utils.parseEther("5")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
    );
    await getPremiumWithSlippageAndBuy(this.oddzOptionManager, optionDetails, 0.05, this.accounts.admin, true);

    await expect(oddzOptionManager.exercise(0)).to.be.revertedWith("Call option: Current price is too low");
    await oddzPriceOracle.setUnderlyingPrice(175000000000);
    await expect(oddzOptionManager.exercise(0))
      .to.emit(oddzOptionManager, "Exercise")
      .withArgs(
        0,
        BigNumber.from(utils.parseEther("237.5")),
        BigNumber.from(utils.parseEther("12.5")),
        ExcerciseType.Cash,
      )
      .to.emit(this.oddzDefaultPool, "Profit")
      .withArgs(0, BigNumber.from(utils.parseEther("16.78186620")));

    expect(BigNumber.from(await oddzOptionManager.settlementFeeAggregate())).to.equal(
      BigNumber.from(utils.parseEther("12.5")),
    );
  });

  it("should send settlement fee aggregate to administrator contract successfully", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);

    const pair = await getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );

    await addLiquidity(this.oddzDefaultPool, this.oddzLiquidityPoolManager, this.signers.admin, 1000000);

    const oddzPriceOracle = await this.oddzPriceOracle.connect(this.signers.admin);

    const optionDetails = getOptionDetailsStruct(
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(2),
      BigNumber.from(utils.parseEther("500")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
    );
    await getPremiumWithSlippageAndBuy(this.oddzOptionManager, optionDetails, 0.05, this.accounts.admin, true);

    await expect(oddzOptionManager.exercise(0)).to.be.revertedWith("Call option: Current price is too low");
    await oddzPriceOracle.setUnderlyingPrice(175000000000);
    await oddzOptionManager.exercise(0);

    expect(BigNumber.from(await oddzOptionManager.settlementFeeAggregate())).to.equal(
      BigNumber.from(utils.parseEther("1000")),
    );
    await oddzOptionManager.transferSettlementFeeToBeneficiary();
    expect((await oddzOptionManager.settlementFeeAggregate()).toNumber()).to.equal(0);
  });

  it("should send transaction fee aggregate to administrator contract successfully", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);

    const pair = await getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );

    await addLiquidity(this.oddzDefaultPool, this.oddzLiquidityPoolManager, this.signers.admin, 1000000);

    const optionDetails = getOptionDetailsStruct(
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(2),
      BigNumber.from(utils.parseEther("500")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
    );
    await getPremiumWithSlippageAndBuy(this.oddzOptionManager, optionDetails, 0.05, this.accounts.admin, true);

    expect(BigNumber.from(await oddzOptionManager.txnFeeAggregate())).to.equal(
      BigNumber.from(utils.parseEther("1271.409331")),
    );

    await oddzOptionManager.transferTxnFeeToBeneficiary();
    expect((await oddzOptionManager.txnFeeAggregate()).toNumber()).to.equal(0);
  });

  it("should set max deadline by owner", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    const deadline = 100;
    await oddzOptionManager.setMaxDeadline(deadline);
    expect(await oddzOptionManager.maxDeadline()).to.equal(deadline);
  });

  it("should revert set max deadline by non owner", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin1);

    await expect(oddzOptionManager.setMaxDeadline(100)).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("should set max slippage by owner", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    const slippage = 100;
    await oddzOptionManager.setMaxSlippage(slippage);
    expect(await oddzOptionManager.maxSlippage()).to.equal(slippage);
  });

  it("should revert set max slippage by non owner", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin1);

    await expect(oddzOptionManager.setMaxSlippage(100)).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("should revert set max slippage for out of bound", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);

    await expect(oddzOptionManager.setMaxSlippage(1001)).to.be.revertedWith("invalid slippage");
  });

  it("should revert buy for less than purchase limit", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);

    const pair = await getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );

    const optionDetails = getOptionDetailsStruct(
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(1),
      BigNumber.from(utils.parseEther("0.001")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
    );

    const premiumWithSlippage = await getPremiumWithSlippageAndBuy(
      this.oddzOptionManager,
      optionDetails,
      0.05,
      this.accounts.admin,
      false,
    );

    await expect(
      oddzOptionManager.buy(optionDetails, BigInt(premiumWithSlippage), this.accounts.admin),
    ).to.be.revertedWith("amount less than purchase limit");
  });

  it("should set less limit and buy option", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    const oddzAssetManager = await this.oddzAssetManager.connect(this.signers.admin);

    const pair = await getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );
    await addLiquidity(this.oddzDefaultPool, this.oddzLiquidityPoolManager, this.signers.admin, 1000000);

    const purchaseLimit = await oddzAssetManager.getPurchaseLimit(pair);
    const optionDetails = getOptionDetailsStruct(
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(2),
      BigNumber.from(purchaseLimit / 10), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
    );
    const premiumWithSlippage = await getPremiumWithSlippageAndBuy(
      this.oddzOptionManager,
      optionDetails,
      0.05,
      this.accounts.admin,
      false,
    );

    await expect(
      oddzOptionManager.buy(optionDetails, BigInt(premiumWithSlippage), this.accounts.admin),
    ).to.be.revertedWith("amount less than purchase limit");
    await oddzAssetManager.setPurchaseLimit(pair, BigNumber.from(purchaseLimit / 10));
    const optionDetails1 = getOptionDetailsStruct(
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(2),
      BigNumber.from(utils.parseEther("0.002")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
    );
    const premiumWithSlippage1 = await getPremiumWithSlippageAndBuy(
      this.oddzOptionManager,
      optionDetails1,
      0.05,
      this.accounts.admin,
      false,
    );

    await expect(oddzOptionManager.buy(optionDetails1, BigInt(premiumWithSlippage1), this.accounts.admin)).to.emit(
      oddzOptionManager,
      "Buy",
    );
  });

  it("should revert buy when premium crosses slippage limit of 5%", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
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

    const optionDetails = getOptionDetailsStruct(
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(1),
      BigNumber.from(utils.parseEther("1")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
    );
    const premiumWithSlippage = await getPremiumWithSlippageAndBuy(
      this.oddzOptionManager,
      optionDetails,
      5,
      this.accounts.admin,
      false,
    );

    await oddzVolatility.setIv(3600000, 5);
    await expect(
      oddzOptionManager.buy(optionDetails, BigInt(premiumWithSlippage), this.accounts.admin),
    ).to.be.revertedWith("Premium crossed slippage tolerance");
  });

  it("should revert buy when premium crosses slippage limit of 3%", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
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

    const optionDetails = getOptionDetailsStruct(
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(1),
      BigNumber.from(utils.parseEther("1")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
    );
    const premiumWithSlippage = await getPremiumWithSlippageAndBuy(
      this.oddzOptionManager,
      optionDetails,
      3,
      this.accounts.admin,
      false,
    );
    await oddzVolatility.setIv(3600000, 5);

    await expect(
      oddzOptionManager.buy(optionDetails, BigInt(premiumWithSlippage), this.accounts.admin),
    ).to.be.revertedWith("Premium crossed slippage tolerance");
  });

  it("should revert buy when premium crosses slippage limit of 1%", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
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

    const optionDetails = getOptionDetailsStruct(
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(1),
      BigNumber.from(utils.parseEther("1")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
    );
    const premiumWithSlippage = await getPremiumWithSlippageAndBuy(
      this.oddzOptionManager,
      optionDetails,
      1,
      this.accounts.admin,
      false,
    );
    await oddzVolatility.setIv(3600000, 5);

    await expect(
      oddzOptionManager.buy(optionDetails, BigInt(premiumWithSlippage), this.accounts.admin),
    ).to.be.revertedWith("Premium crossed slippage tolerance");
  });

  it("should revert buy when premium crosses slippage limit of 0.5%", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
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

    const optionDetails = getOptionDetailsStruct(
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(1),
      BigNumber.from(utils.parseEther("1")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
    );
    const premiumWithSlippage = await getPremiumWithSlippageAndBuy(
      this.oddzOptionManager,
      optionDetails,
      0.5,
      this.accounts.admin,
      false,
    );
    await oddzVolatility.setIv(3600000, 5);

    await expect(
      oddzOptionManager.buy(optionDetails, BigInt(premiumWithSlippage), this.accounts.admin),
    ).to.be.revertedWith("Premium crossed slippage tolerance");
  });

  it("should revert with less slippage and buy for more slippage with same iv", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
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

    const optionDetails = getOptionDetailsStruct(
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(1),
      BigNumber.from(utils.parseEther("1")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
    );
    const premiumWithSlippage = await getPremiumWithSlippageAndBuy(
      this.oddzOptionManager,
      optionDetails,
      3,
      this.accounts.admin,
      false,
    );
    // increae iv
    await oddzVolatility.setIv(182831, 5);

    await expect(
      oddzOptionManager.buy(optionDetails, BigInt(premiumWithSlippage), this.accounts.admin),
    ).to.be.revertedWith("Premium crossed slippage tolerance");
    // reset IV to original
    await oddzVolatility.setIv(180000, 5);
    const premiumWithSlippage1 = await getPremiumWithSlippageAndBuy(
      this.oddzOptionManager,
      optionDetails,
      3.1,
      this.accounts.admin,
      false,
    );
    // increase iv
    await oddzVolatility.setIv(182831, 5);

    await expect(oddzOptionManager.buy(optionDetails, BigInt(premiumWithSlippage1), this.accounts.admin)).to.emit(
      oddzOptionManager,
      "Buy",
    );
  });

  it("should use msg.sender instead of account sent for buy option", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);

    const pair = await getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );
    await addLiquidity(this.oddzDefaultPool, this.oddzLiquidityPoolManager, this.signers.admin, 1000000);
    const optionDetails = getOptionDetailsStruct(
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(1),
      BigNumber.from(utils.parseEther("1")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
    );

    const premiumWithSlippage = await getPremiumWithSlippageAndBuy(
      this.oddzOptionManager,
      optionDetails,
      3,
      this.accounts.admin,
      false,
    );

    await expect(oddzOptionManager.buy(optionDetails, BigInt(premiumWithSlippage), this.accounts.admin1))
      .to.emit(oddzOptionManager, "Buy")
      .withArgs(
        0,
        this.accounts.admin,
        utils.formatBytes32String("B_S"),
        BigNumber.from(utils.parseEther("1.392900201")),
        BigNumber.from(utils.parseEther("29.250904221")),
        "0xFCb06D25357ef01726861B30b0b83e51482db417",
      );
  });

  it("should revert set sdk for non contract address", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);

    await expect(oddzOptionManager.setSdk(this.accounts.admin)).to.be.revertedWith("invalid SDK contract address");
  });
  it("should set sdk with contract address", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);

    oddzOptionManager.setSdk(this.oddzLiquidityPoolManager.address);
    expect(await oddzOptionManager.sdk()).to.equal(this.oddzLiquidityPoolManager.address);
  });

  it("should revert set settlement fee for invalid value", async function () {
    const oddzFeeManager = await this.oddzFeeManager.connect(this.signers.admin);
    await expect(oddzFeeManager.setSettlementFeePerc(11)).to.be.revertedWith("Invalid settlement fee");
  });

  it("should revert exercise UA with more than deadline limit", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    const deadline = 101;
    const slippage = 1;
    await expect(oddzOptionManager.exerciseUA(0, deadline, slippage)).to.be.revertedWith(
      "Deadline input is more than maximum limit allowed",
    );
  });

  it("should revert exercise UA with more than slippage limit", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    const deadline = 15;
    const slippage = 101;
    await expect(oddzOptionManager.exerciseUA(0, deadline, slippage)).to.be.revertedWith(
      "Slippage input is more than maximum limit allowed",
    );
  });

  it("should revert exercise after expiration period", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);

    const pair = await getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );

    const oddzLiquidityPoolManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    const oddzPriceOracle = await this.oddzPriceOracle.connect(this.signers.admin);
    await provider.send("evm_snapshot", []);

    await addLiquidity(this.oddzDefaultPool, oddzLiquidityPoolManager, this.signers.admin, 1000000);

    const optionDetails = getOptionDetailsStruct(
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(2),
      BigNumber.from(utils.parseEther("5")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
    );

    await getPremiumWithSlippageAndBuy(this.oddzOptionManager, optionDetails, 0.05, this.accounts.admin, true);

    await oddzPriceOracle.setUnderlyingPrice(305000000000);

    await provider.send("evm_snapshot", []);
    // execution day + 3
    await provider.send("evm_increaseTime", [getExpiry(3)]);
    const deadline = 15;
    const slippage = 1;
    await expect(oddzOptionManager.exerciseUA(0, deadline, slippage)).to.be.revertedWith("Option has expired");

    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);
  });

  it("should revert exercise for non owner", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);

    const pair = await getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );

    const oddzLiquidityPoolManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    const oddzPriceOracle = await this.oddzPriceOracle.connect(this.signers.admin);
    await addLiquidity(this.oddzDefaultPool, oddzLiquidityPoolManager, this.signers.admin, 1000000);

    const optionDetails = getOptionDetailsStruct(
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(2),
      BigNumber.from(utils.parseEther("5")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
    );

    await getPremiumWithSlippageAndBuy(this.oddzOptionManager, optionDetails, 0.05, this.accounts.admin, true);

    await oddzPriceOracle.setUnderlyingPrice(305000000000);
    const deadline = 15;
    const slippage = 1;
    await expect(oddzOptionManager.connect(this.signers.admin1).exerciseUA(0, deadline, slippage)).to.be.revertedWith(
      "Wrong msg.sender",
    );
  });

  it("should revert exercise for options not active", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);

    const pair = await getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );

    const oddzLiquidityPoolManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    const oddzPriceOracle = await this.oddzPriceOracle.connect(this.signers.admin);
    await addLiquidity(this.oddzDefaultPool, oddzLiquidityPoolManager, this.signers.admin, 1000000);

    const optionDetails = getOptionDetailsStruct(
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(2),
      BigNumber.from(utils.parseEther("5")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
    );
    await getPremiumWithSlippageAndBuy(this.oddzOptionManager, optionDetails, 0.05, this.accounts.admin, true);

    await oddzPriceOracle.setUnderlyingPrice(175000000000);
    const deadline = 15;
    const slippage = 1;
    await expect(oddzOptionManager.exerciseUA(0, deadline, slippage)).to.emit(oddzOptionManager, "Exercise");

    await expect(oddzOptionManager.exerciseUA(0, deadline, slippage)).to.be.revertedWith("Wrong state");
  });

  it("should exercise UA", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);

    const pair = await getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );

    const oddzLiquidityPoolManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    const oddzPriceOracle = await this.oddzPriceOracle.connect(this.signers.admin);
    await addLiquidity(this.oddzDefaultPool, oddzLiquidityPoolManager, this.signers.admin, 1000000);

    const optionDetails = getOptionDetailsStruct(
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(2),
      BigNumber.from(utils.parseEther("5")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
    );

    await getPremiumWithSlippageAndBuy(this.oddzOptionManager, optionDetails, 0.05, this.accounts.admin, true);

    await oddzPriceOracle.setUnderlyingPrice(305000000000);
    const deadline = 15;
    const slippage = 1;
    await expect(oddzOptionManager.exerciseUA(0, deadline, slippage)).to.emit(oddzOptionManager, "Exercise");
  });

  it("should revert expire for options not expired yet", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);

    const pair = await getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );

    const oddzLiquidityPoolManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    await addLiquidity(this.oddzDefaultPool, oddzLiquidityPoolManager, this.signers.admin, 1000000);

    const optionDetails = getOptionDetailsStruct(
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(2),
      BigNumber.from(utils.parseEther("5")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
    );

    await getPremiumWithSlippageAndBuy(this.oddzOptionManager, optionDetails, 0.05, this.accounts.admin, true);

    await expect(oddzOptionManager.unlock(0)).to.be.revertedWith("Option has not expired yet");
  });

  it("should revert option is not active for already exercised option", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);

    const pair = await getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );

    const oddzLiquidityPoolManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    const oddzPriceOracle = await this.oddzPriceOracle.connect(this.signers.admin);
    await provider.send("evm_snapshot", []);

    await addLiquidity(this.oddzDefaultPool, oddzLiquidityPoolManager, this.signers.admin, 1000000);

    const optionDetails = getOptionDetailsStruct(
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(2),
      BigNumber.from(utils.parseEther("5")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
    );

    await getPremiumWithSlippageAndBuy(this.oddzOptionManager, optionDetails, 0.05, this.accounts.admin, true);
    await oddzPriceOracle.setUnderlyingPrice(175000000000);
    const deadline = 15;
    const slippage = 1;
    await expect(oddzOptionManager.exerciseUA(0, deadline, slippage)).to.emit(oddzOptionManager, "Exercise");
    await provider.send("evm_snapshot", []);
    // execution day + 3
    await provider.send("evm_increaseTime", [getExpiry(3)]);
    await expect(oddzOptionManager.unlock(0)).to.be.revertedWith("Option is not active");
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);
  });

  it("should buy after setting less decimals", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    const oddzPriceOracle = await this.oddzPriceOracle.connect(this.signers.admin);
    await addLiquidity(this.oddzDefaultPool, this.oddzLiquidityPoolManager, this.signers.admin, 1000000);
    const pair = await getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );
    // set more decimal
    await oddzPriceOracle.setDecimals(9);
    const optionDetails = getOptionDetailsStruct(
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(1),
      BigNumber.from(utils.parseEther("1")), // number of options
      BigNumber.from(1600000000000),
      OptionType.Call,
    );

    const premiumWithSlippage = await getPremiumWithSlippageAndBuy(
      this.oddzOptionManager,
      optionDetails,
      0.05,
      this.accounts.admin,
      false,
    );

    await expect(oddzOptionManager.buy(optionDetails, BigInt(premiumWithSlippage), this.accounts.admin)).to.emit(
      oddzOptionManager,
      "Buy",
    );
  });

  it("should buy option if the asset pair is supported and emit buy event with 2 pools", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    await addLiquidity(this.oddzDefaultPool, this.oddzLiquidityPoolManager, this.signers.admin, 1000000);
    await this.oddzLiquidityPoolManager
      .connect(this.signers.admin)
      .addLiquidity(this.oddzEthUsdCallBS30Pool.address, utils.parseEther("50"));
    const pair = await getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );

    const optionDetails = getOptionDetailsStruct(
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(1),
      BigNumber.from(utils.parseEther("1")), // number of options
      BigNumber.from(160000000000),
      OptionType.Call,
    );

    const premiumWithSlippage = await getPremiumWithSlippageAndBuy(
      this.oddzOptionManager,
      optionDetails,
      0.05,
      this.accounts.admin,
      false,
    );

    await expect(oddzOptionManager.buy(optionDetails, BigInt(premiumWithSlippage), this.accounts.admin)).to.emit(
      oddzOptionManager,
      "Buy",
    );
  });
}
