import { expect } from "chai";
import { BigNumber, utils } from "ethers";
import { OptionType, ExcerciseType, addDaysAndGetSeconds, getExpiry, address0 } from "../../test-utils";
import { waffle } from "hardhat";
import {
  OddzLiquidityPool,
  OddzAssetManager,
  MockERC20,
  OddzPriceOracleManager,
  MockOddzPriceOracle,
  OddzOptionManager,
} from "../../typechain";
import { Signer } from "@ethersproject/abstract-signer";
const provider = waffle.provider;
let snapshotCount = 0;

const getPremiumWithSlippageAndBuy = async (
  oddzOptionManager: OddzOptionManager,
  pair: any,
  model: string,
  expiry: number,
  amount: BigNumber,
  strike: BigNumber,
  type: number,
  slippage: any,
  isBuy: boolean,
) => {
  const premium: any = await oddzOptionManager.getPremium(
    pair,
    model,
    expiry,
    amount, // number of options
    strike,
    type,
  );
  const premiumWithSlippage = Number(premium.optionPremium * (1 + slippage / 100));
  if (isBuy) {
    await oddzOptionManager.buy(
      pair,
      model,
      BigNumber.from(utils.parseEther((premiumWithSlippage / 1e18).toString())),
      expiry,
      amount, // number of options
      strike,
      type,
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

const addLiquidity = async (oddzLiquidityPool: OddzLiquidityPool, admin: Signer, amount: number) => {
  const olp = await oddzLiquidityPool.connect(admin);
  await olp.addLiquidity(utils.parseEther(amount.toString()));
  return olp;
};

export function shouldBehaveLikeOddzOptionManager(): void {
  it("should fail with message invalid asset pair", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);

    await expect(
      oddzOptionManager.getPremium(
        address0(),
        utils.formatBytes32String("B_S"),
        getExpiry(1),
        BigNumber.from(100),
        BigNumber.from(1234),
        OptionType.Call,
      ),
    ).to.be.revertedWith("Invalid Asset pair");
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
    await expect(
      oddzOptionManager.getPremium(
        pair,
        utils.formatBytes32String("B_S"),
        getExpiry(1),
        BigNumber.from(utils.parseEther("1")), // number of options
        BigNumber.from(160000000000),
        OptionType.Call,
      ),
    ).to.be.revertedWith("Invalid Asset pair");
    await oddzAssetManager.activateAssetPair(pair);
    const option = await oddzOptionManager.getPremium(
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

  it("should return the premium price 1 day", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    // call should be optionType.call
    const pair = getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );
    const option = await oddzOptionManager.getPremium(
      pair,
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
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    // call should be optionType.call
    const pair = getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );
    const option = await oddzOptionManager.getPremium(
      pair,
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
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);

    await expect(
      oddzOptionManager.buy(
        address0(),
        utils.formatBytes32String("B_S"),
        BigNumber.from(utils.parseEther("1")),
        getExpiry(0),
        BigNumber.from(utils.parseEther("1")), // number of options
        BigNumber.from(123400000000),
        OptionType.Call,
      ),
    ).to.be.revertedWith("Expiration cannot be less than 1 days");
  });

  it("should throw Expiration cannot be more than 30 days error when the expiry is more than a 30 days", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    await expect(
      oddzOptionManager.buy(
        address0(),
        utils.formatBytes32String("B_S"),
        BigNumber.from(utils.parseEther("1")),
        getExpiry(31),
        BigNumber.from(utils.parseEther("1")), // number of options
        BigNumber.from(123400000000),
        OptionType.Call,
      ),
    ).to.be.revertedWith("Expiration cannot be more than 30 days");
  });

  it("should prevent buying options for unsupported asset pair type", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    await expect(
      oddzOptionManager.buy(
        address0(),
        utils.formatBytes32String("B_S"),
        BigNumber.from(utils.parseEther("1")),
        getExpiry(1),
        BigNumber.from(utils.parseEther("1")), // number of options
        BigNumber.from(123400000000),
        OptionType.Call,
      ),
    ).to.be.revertedWith("Invalid Asset pair");
  });

  it("should buy option if the asset pair is supported and emit buy event", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    await addLiquidity(this.oddzLiquidityPool, this.signers.admin, 1000000);
    const pair = await getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );

    const premiumWithSlippage = await getPremiumWithSlippageAndBuy(
      this.oddzOptionManager,
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(1),
      BigNumber.from(utils.parseEther("1")), // number of options
      BigNumber.from(160000000000),
      OptionType.Call,
      0.05,
      false,
    );

    await expect(
      oddzOptionManager.buy(
        pair,
        utils.formatBytes32String("B_S"),
        BigInt(premiumWithSlippage),
        getExpiry(1),
        BigNumber.from(utils.parseEther("1")), // number of options
        BigNumber.from(160000000000),
        OptionType.Call,
      ),
    ).to.emit(oddzOptionManager, "Buy");
  });

  it("should throw low premium exception", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);

    await addLiquidity(this.oddzLiquidityPool, this.signers.admin, 1000000);
    const pair = await getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );
    const premiumWithSlippage = await getPremiumWithSlippageAndBuy(
      this.oddzOptionManager,
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(10),
      BigNumber.from(utils.parseEther("1")), // number of options
      BigNumber.from(122000000000),
      OptionType.Call,
      0.05,
      false,
    );

    const usdcToken = await this.usdcToken.connect(this.signers.admin);
    await usdcToken.approve(this.oddzOptionManager.address, 100);
    await expect(
      oddzOptionManager.buy(
        pair,
        utils.formatBytes32String("B_S"),
        BigInt(premiumWithSlippage),
        getExpiry(10),
        BigNumber.from(utils.parseEther("1")), // number of options
        BigNumber.from(122000000000),
        OptionType.Call,
      ),
    ).to.be.revertedWith("Premium is low");
  });

  it("Call option - excercise flow", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);

    const pair = await getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );

    const oddzLiquidityPool = await this.oddzLiquidityPool.connect(this.signers.admin);
    const oddzPriceOracle = await this.oddzPriceOracle.connect(this.signers.admin);
    await addLiquidity(this.oddzLiquidityPool, this.signers.admin, 1000000);

    await getPremiumWithSlippageAndBuy(
      this.oddzOptionManager,
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(2),
      BigNumber.from(utils.parseEther("5")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
      0.05,
      true,
    );

    await expect(oddzOptionManager.exercise(0)).to.be.revertedWith("Call option: Current price is too low");
    await oddzPriceOracle.setUnderlyingPrice(175000000000);
    await expect(oddzOptionManager.exercise(0))
      .to.emit(oddzOptionManager, "Exercise")
      .withArgs(0, BigNumber.from(utils.parseEther("240")), BigNumber.from(utils.parseEther("10")), ExcerciseType.Cash)
      .to.emit(oddzLiquidityPool, "Profit")
      .withArgs(0, BigNumber.from(utils.parseEther("14.28186620")));
    expect(BigNumber.from(await oddzOptionManager.settlementFeeAggregate())).to.equal(
      BigNumber.from(utils.parseEther("10")),
    );
  });

  it("Put option - excercise flow", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);

    const pair = await getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );
    await addLiquidity(this.oddzLiquidityPool, this.signers.admin, 1000000);
    await getPremiumWithSlippageAndBuy(
      this.oddzOptionManager,
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(2),
      BigNumber.from(utils.parseEther("5")), // number of options
      BigNumber.from(150000000000),
      OptionType.Put,
      0.05,
      true,
    );

    const oddzLiquidityPool = await this.oddzLiquidityPool.connect(this.signers.admin);
    const oddzPriceOracle = await this.oddzPriceOracle.connect(this.signers.admin);

    await expect(oddzOptionManager.exercise(0)).to.be.revertedWith("Put option: Current price is too high");
    await oddzPriceOracle.setUnderlyingPrice(145000000000);
    await expect(oddzOptionManager.exercise(0))
      .to.emit(oddzOptionManager, "Exercise")
      .withArgs(0, BigNumber.from(utils.parseEther("240")), BigNumber.from(utils.parseEther("10")), ExcerciseType.Cash)
      .to.emit(oddzLiquidityPool, "Loss")
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
    await addLiquidity(this.oddzLiquidityPool, this.signers.admin, 1000000);

    await getPremiumWithSlippageAndBuy(
      oddzOptionManager,
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(2),
      BigNumber.from(utils.parseEther("5")), // number of options
      BigNumber.from(160000000000),
      OptionType.Call,
      0.05,
      true,
    );

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
    await addLiquidity(this.oddzLiquidityPool, this.signers.admin, 1000000);

    await getPremiumWithSlippageAndBuy(
      this.oddzOptionManager,
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(2),
      BigNumber.from(utils.parseEther("5")), // number of options
      BigNumber.from(160000000000),
      OptionType.Call,
      0.05,
      true,
    );

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
    await addLiquidity(this.oddzLiquidityPool, this.signers.admin, 1000000);

    await getPremiumWithSlippageAndBuy(
      this.oddzOptionManager,
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(1),
      BigNumber.from(utils.parseEther("10")), // number of options
      BigNumber.from(160000000000),
      OptionType.Call,
      0.05,
      true,
    );

    const oddzLiquidityPool = await this.oddzLiquidityPool.connect(this.signers.admin);

    const op0 = await oddzOptionManager.options(0);
    await getPremiumWithSlippageAndBuy(
      this.oddzOptionManager,
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(1),
      BigNumber.from(utils.parseEther("10")), // number of options
      BigNumber.from(160000000000),
      OptionType.Call,
      0.05,
      true,
    );
    const op1 = await oddzOptionManager.options(1);
    await getPremiumWithSlippageAndBuy(
      this.oddzOptionManager,
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(1),
      BigNumber.from(utils.parseEther("10")), // number of options
      BigNumber.from(160000000000),
      OptionType.Call,
      0.05,
      true,
    );
    const op2 = await oddzOptionManager.options(2);
    const premiums = BigNumber.from(op0.premium).add(BigNumber.from(op1.premium)).add(BigNumber.from(op2.premium));
    // const surplusBeforeUpdate = (await oddzLiquidityPool.surplus()).toNumber();
    //console.log(surplusBeforeUpdate);
    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(2)]);
    await expect(oddzOptionManager.unlockAll([0, 1, 2])).to.emit(oddzOptionManager, "Expire");
    const collected = BigNumber.from((await oddzLiquidityPool.premiumDayPool(addDaysAndGetSeconds(2))).collected);
    expect(premiums).to.equal(collected);
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(++snapshotCount))]);
  });

  it("should distribute premium", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);

    const pair = await getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );
    await provider.send("evm_snapshot", []);
    await addLiquidity(this.oddzLiquidityPool, this.signers.admin, 1000000);
    await getPremiumWithSlippageAndBuy(
      this.oddzOptionManager,
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(1),
      BigNumber.from(utils.parseEther("1")), // number of options
      BigNumber.from(145000000000),
      OptionType.Call,
      0.05,
      true,
    );

    const oddzLiquidityPool = await this.oddzLiquidityPool.connect(this.signers.admin);

    await getPremiumWithSlippageAndBuy(
      this.oddzOptionManager,
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(14),
      BigNumber.from(utils.parseEther("1")), // number of options
      BigNumber.from(145000000000),
      OptionType.Call,
      0.05,
      true,
    );

    await provider.send("evm_snapshot", []);
    // execution day + 2
    await provider.send("evm_increaseTime", [getExpiry(2)]);
    await expect(oddzOptionManager.unlock(0)).to.emit(oddzOptionManager, "Expire");

    await provider.send("evm_snapshot", []);
    // execution day + 5 <= (2 + 3)
    await provider.send("evm_increaseTime", [getExpiry(3)]);
    await oddzLiquidityPool.distributePremium(addDaysAndGetSeconds(2), [this.accounts.admin]);
    await expect(BigNumber.from(await oddzLiquidityPool.lpPremium(this.accounts.admin))).to.equal(
      utils.parseEther("171.41460393"),
    );

    await provider.send("evm_snapshot", []);
    // execution day + 15 <= (2 + 3 + 10)
    await provider.send("evm_increaseTime", [getExpiry(10)]);
    await expect(oddzOptionManager.unlock(1)).to.emit(oddzOptionManager, "Expire");

    await provider.send("evm_snapshot", []);
    // execution day + 16  <= (2 + 3 + 10 + 1)
    await provider.send("evm_increaseTime", [getExpiry(1)]);
    await oddzLiquidityPool.distributePremium(addDaysAndGetSeconds(15), [this.accounts.admin]);

    // After premium lockup period lp premium is transferred from liquidity pool to LP
    await expect(BigNumber.from(await oddzLiquidityPool.balanceOf(this.accounts.admin))).to.equal(
      utils.parseEther("1000476.10566199"),
    );
    await expect((await oddzLiquidityPool.lpPremium(this.accounts.admin)).toNumber()).to.equal(0);

    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(++snapshotCount))]);
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(++snapshotCount))]);
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(++snapshotCount))]);
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(++snapshotCount))]);
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(++snapshotCount))]);
  });

  it("should throw an error when transaction fee updated", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    await expect(oddzOptionManager.setTransactionFeePerc(0)).to.be.revertedWith("Invalid transaction fee");
    await expect(oddzOptionManager.setTransactionFeePerc(11)).to.be.revertedWith("Invalid transaction fee");
  });

  it("should update transaction percentage and option transaction fee", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);

    const pair = getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );
    await addLiquidity(this.oddzLiquidityPool, this.signers.admin, 1000000);

    await oddzOptionManager.setTransactionFeePerc(2);
    expect(await oddzOptionManager.txnFeePerc()).to.equal(2);
    const option = await oddzOptionManager.getPremium(
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(1),
      BigNumber.from(utils.parseEther("1")), // number of options
      BigNumber.from(134100000000),
      OptionType.Call,
    );

    expect(BigNumber.from(option.txnFee)).to.equal(utils.parseEther("5.4465919032"));
  });

  it("should update premium eligibilty correctly", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);

    const pair = await getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );
    await addLiquidity(this.oddzLiquidityPool, this.signers.admin, 1000000);

    const oddzLiquidityPool = await this.oddzLiquidityPool.connect(this.signers.admin);

    await getPremiumWithSlippageAndBuy(
      this.oddzOptionManager,
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(1),
      BigNumber.from(utils.parseEther("5")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
      0.05,
      true,
    );

    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(2)]);
    await oddzOptionManager.unlock(0);

    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(3)]);
    await oddzLiquidityPool.distributePremium(addDaysAndGetSeconds(2), [this.accounts.admin]);
    await expect(BigNumber.from(await oddzLiquidityPool.lpPremium(this.accounts.admin))).to.equal(
      utils.parseEther("139.2900201"),
    );
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(++snapshotCount))]);
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(++snapshotCount))]);
  });

  // TODO: This case should be part of liquidity pool
  it("should withdraw premium successfully", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);

    const pair = await getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );
    await addLiquidity(this.oddzLiquidityPool, this.signers.admin, 1000000);

    await getPremiumWithSlippageAndBuy(
      this.oddzOptionManager,
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(1),
      BigNumber.from(utils.parseEther("5")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
      0.05,
      true,
    );

    const oddzLiquidityPool = await this.oddzLiquidityPool.connect(this.signers.admin);

    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(2)]);
    await expect(oddzOptionManager.unlock(0)).to.emit(oddzOptionManager, "Expire");

    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(3)]);
    await oddzLiquidityPool.distributePremium(addDaysAndGetSeconds(2), [this.accounts.admin]);
    await expect(BigNumber.from(await oddzLiquidityPool.lpPremium(this.accounts.admin))).to.equal(
      utils.parseEther("139.2900201"),
    );

    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(15)]);
    await expect(oddzLiquidityPool.transferPremium()).to.emit(oddzLiquidityPool, "PremiumCollected");
    await expect((await oddzLiquidityPool.lpPremium(this.accounts.admin)).toNumber()).to.equal(0);
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(++snapshotCount))]);
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(++snapshotCount))]);
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(++snapshotCount))]);
  });

  // TODO: This case should be part of liquidity pool
  it("should update surplus and emit premium forfeited event", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);

    const pair = await getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );
    await addLiquidity(this.oddzLiquidityPool, this.signers.admin, 1000000);

    const oddzLiquidityPool = await this.oddzLiquidityPool.connect(this.signers.admin);
    await getPremiumWithSlippageAndBuy(
      this.oddzOptionManager,
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(1),
      BigNumber.from(utils.parseEther("5")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
      0.05,
      true,
    );

    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(2)]);
    await expect(oddzOptionManager.unlock(0)).to.emit(oddzOptionManager, "Expire");

    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(3)]);
    await oddzLiquidityPool.distributePremium(addDaysAndGetSeconds(2), [this.accounts.admin]);
    // Remove 10% of the liquidity
    await expect(oddzLiquidityPool.removeLiquidity(utils.parseEther("100000"))).to.emit(
      oddzLiquidityPool,
      "PremiumForfeited",
    );
    await expect(BigNumber.from(await oddzLiquidityPool.surplus())).to.equal(utils.parseEther("15.4766689"));
    await expect(BigNumber.from(await oddzLiquidityPool.lpPremium(this.accounts.admin))).to.equal(
      utils.parseEther("123.8133512"),
    );
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(++snapshotCount))]);
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(++snapshotCount))]);
  });

  // TODO: This case should be part of liquidity pool
  it("should throw error while withdraw liquidity", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);

    const pair = await getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );
    await addLiquidity(this.oddzLiquidityPool, this.signers.admin, 1000000);

    const oddzLiquidityPool = await this.oddzLiquidityPool.connect(this.signers.admin);
    await getPremiumWithSlippageAndBuy(
      this.oddzOptionManager,
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(1),
      BigNumber.from(utils.parseEther("5")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
      0.05,
      true,
    );

    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(2)]);
    await oddzOptionManager.unlock(0);

    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(3)]);
    await oddzLiquidityPool.distributePremium(addDaysAndGetSeconds(2), [this.accounts.admin]);
    await expect(oddzLiquidityPool.transferPremium()).to.be.revertedWith(
      "LP Error: Address not eligible for premium collection",
    );
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(++snapshotCount))]);
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(++snapshotCount))]);
  });

  // TODO: This case should be part of liquidity pool
  it("should send premium to the LP automatically for second liquidity after 14 days", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);

    const pair = await getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );
    await addLiquidity(this.oddzLiquidityPool, this.signers.admin, 1000000);

    const oddzLiquidityPool = await this.oddzLiquidityPool.connect(this.signers.admin);
    await getPremiumWithSlippageAndBuy(
      this.oddzOptionManager,
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(1),
      BigNumber.from(utils.parseEther("5")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
      0.05,
      true,
    );

    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(2)]);
    await oddzOptionManager.unlock(0);

    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(3)]);
    await oddzLiquidityPool.distributePremium(addDaysAndGetSeconds(2), [this.accounts.admin]);

    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(15)]);
    await expect(oddzLiquidityPool.addLiquidity(utils.parseEther("1000000"))).to.emit(
      oddzLiquidityPool,
      "PremiumCollected",
    );
    await expect((await oddzLiquidityPool.lpPremium(this.accounts.admin)).toNumber()).to.equal(0);
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(++snapshotCount))]);
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(++snapshotCount))]);
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(++snapshotCount))]);
  });

  // TODO: This case should be part of liquidity pool
  it("should not alter user premium eligibility", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);

    const pair = await getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );
    await addLiquidity(this.oddzLiquidityPool, this.signers.admin, 1000000);

    const oddzLiquidityPool = await this.oddzLiquidityPool.connect(this.signers.admin);
    await getPremiumWithSlippageAndBuy(
      this.oddzOptionManager,
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(1),
      BigNumber.from(utils.parseEther("5")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
      0.05,
      true,
    );

    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(2)]);
    await oddzOptionManager.unlock(0);

    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(3)]);
    await oddzLiquidityPool.distributePremium(addDaysAndGetSeconds(2), [this.accounts.admin]);
    // Maximum withdrawal 80% of (available balance - user premium) - 0.8 * (100000000000000 - 13929002010)
    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(15)]);

    await expect(BigNumber.from(await oddzLiquidityPool.lpPremium(this.accounts.admin))).to.equal(
      BigNumber.from(utils.parseEther("139.2900201")),
    );
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(++snapshotCount))]);
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(++snapshotCount))]);
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(++snapshotCount))]);
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
    await addLiquidity(this.oddzLiquidityPool, this.signers.admin, 1000000);

    await getPremiumWithSlippageAndBuy(
      this.oddzOptionManager,
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(1),
      BigNumber.from(utils.parseEther("1")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
      0.05,
      true,
    );

    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(2)]);
    await expect(oddzOptionManager.exercise(0)).to.be.revertedWith("Option has expired");
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(++snapshotCount))]);
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
    await addLiquidity(this.oddzLiquidityPool, this.signers.admin, 1000000);

    const oddzLiquidityPool = await this.oddzLiquidityPool.connect(this.signers.admin);
    const oddzPriceOracle = await this.oddzPriceOracle.connect(this.signers.admin);
    await oddzOptionManager.setSettlementFeePerc(5);
    expect((await oddzOptionManager.settlementFeePerc()).toNumber()).to.equal(5);
    await getPremiumWithSlippageAndBuy(
      this.oddzOptionManager,
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(2),
      BigNumber.from(utils.parseEther("5")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
      0.05,
      true,
    );

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
      .to.emit(oddzLiquidityPool, "Profit")
      .withArgs(0, BigNumber.from(utils.parseEther("16.78186620")));

    expect(BigNumber.from(await oddzOptionManager.settlementFeeAggregate())).to.equal(
      BigNumber.from(utils.parseEther("12.5")),
    );
  });

  // TODO: This case should be part of liquidity pool
  it("should enable premium eligibility successfully", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);

    const pair = await getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );
    await addLiquidity(this.oddzLiquidityPool, this.signers.admin, 1000000);

    const oddzLiquidityPool = await this.oddzLiquidityPool.connect(this.signers.admin);
    await getPremiumWithSlippageAndBuy(
      oddzOptionManager,
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(1),
      BigNumber.from(utils.parseEther("1")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
      0.05,
      true,
    );

    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(2)]);
    await expect(oddzOptionManager.unlock(0)).to.emit(oddzOptionManager, "Expire");

    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(3)]);
    await oddzLiquidityPool.updatePremiumEligibility(addDaysAndGetSeconds(2));
    expect((await oddzLiquidityPool.premiumDayPool(addDaysAndGetSeconds(2))).enabled).to.equal(true);

    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(++snapshotCount))]);
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(++snapshotCount))]);
  });

  // TODO: This case should be part of liquidity pool
  it("should throw an error while enabling premium eligibility for a invalid date", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);

    const pair = await getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );
    await addLiquidity(this.oddzLiquidityPool, this.signers.admin, 1000000);

    const oddzLiquidityPool = await this.oddzLiquidityPool.connect(this.signers.admin);
    await getPremiumWithSlippageAndBuy(
      oddzOptionManager,
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(1),
      BigNumber.from(utils.parseEther("1")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
      0.05,
      true,
    );

    await expect(oddzLiquidityPool.updatePremiumEligibility(addDaysAndGetSeconds(1))).to.be.revertedWith(
      "LP Error: Invalid Date",
    );
  });

  // TODO: This case should be part of liquidity pool
  it("should throw an error while enableling premium eligibility for already enabled date", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);

    const pair = await getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );
    await addLiquidity(this.oddzLiquidityPool, this.signers.admin, 1000000);

    const oddzLiquidityPool = await this.oddzLiquidityPool.connect(this.signers.admin);
    await getPremiumWithSlippageAndBuy(
      this.oddzOptionManager,
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(1),
      BigNumber.from(utils.parseEther("1")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
      0.05,
      true,
    );

    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(2)]);
    await expect(oddzOptionManager.unlock(0)).to.emit(oddzOptionManager, "Expire");

    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(3)]);
    await oddzLiquidityPool.updatePremiumEligibility(addDaysAndGetSeconds(2));
    await expect(oddzLiquidityPool.updatePremiumEligibility(addDaysAndGetSeconds(2))).to.be.revertedWith(
      "LP Error: Premium eligibilty already updated for the date",
    );

    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(++snapshotCount))]);
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(++snapshotCount))]);
  });

  it("should send settlement fee aggragrate staking contract successfully", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);

    const pair = await getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );
    await addLiquidity(this.oddzLiquidityPool, this.signers.admin, 1000000);

    const oddzPriceOracle = await this.oddzPriceOracle.connect(this.signers.admin);
    await getPremiumWithSlippageAndBuy(
      this.oddzOptionManager,
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(2),
      BigNumber.from(utils.parseEther("5")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
      0.05,
      true,
    );

    await expect(oddzOptionManager.exercise(0)).to.be.revertedWith("Call option: Current price is too low");
    await oddzPriceOracle.setUnderlyingPrice(175000000000);
    await oddzOptionManager.exercise(0);
    expect(BigNumber.from(await oddzOptionManager.settlementFeeAggregate())).to.equal(
      BigNumber.from(utils.parseEther("10")),
    );
    await oddzOptionManager.transferSettlementFeeToBeneficiary();
    expect((await oddzOptionManager.settlementFeeAggregate()).toNumber()).to.equal(0);
  });

  it("should send transaction fee aggragrate staking contract successfully", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);

    const pair = await getAssetPair(
      this.oddzAssetManager,
      this.signers.admin,
      this.oddzPriceOracleManager,
      this.oddzPriceOracle,
      this.usdcToken,
      this.ethToken,
    );
    await addLiquidity(this.oddzLiquidityPool, this.signers.admin, 1000000);
    await getPremiumWithSlippageAndBuy(
      this.oddzOptionManager,
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(2),
      BigNumber.from(utils.parseEther("5")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
      0.05,
      true,
    );

    expect(BigNumber.from(await oddzOptionManager.txnFeeAggregate())).to.equal(
      BigNumber.from(utils.parseEther("12.71409331")),
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

    await expect(oddzOptionManager.setMaxDeadline(100)).to.be.revertedWith("caller");
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

    const premiumWithSlippage = await getPremiumWithSlippageAndBuy(
      this.oddzOptionManager,
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(1),
      BigNumber.from(utils.parseEther("0.001")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
      0.05,
      false,
    );

    await expect(
      oddzOptionManager.buy(
        pair,
        utils.formatBytes32String("B_S"),
        BigInt(premiumWithSlippage),
        getExpiry(2),
        BigNumber.from(utils.parseEther("0.001")), // number of options
        BigNumber.from(170000000000),
        OptionType.Call,
      ),
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
    await addLiquidity(this.oddzLiquidityPool, this.signers.admin, 1000000);
    const purchaseLimit = await oddzAssetManager.getPurchaseLimit(pair);
    const premiumWithSlippage = await getPremiumWithSlippageAndBuy(
      this.oddzOptionManager,
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(2),
      BigNumber.from(purchaseLimit / 10), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
      0.05,
      false,
    );
    await expect(
      oddzOptionManager.buy(
        pair,
        utils.formatBytes32String("B_S"),
        BigInt(premiumWithSlippage),
        getExpiry(2),
        BigNumber.from(purchaseLimit / 10), // number of options
        BigNumber.from(170000000000),
        OptionType.Call,
      ),
    ).to.be.revertedWith("amount less than purchase limit");
    await oddzAssetManager.setPurchaseLimit(pair, BigNumber.from(purchaseLimit / 10));
    const premiumWithSlippage1 = await getPremiumWithSlippageAndBuy(
      this.oddzOptionManager,
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(2),
      BigNumber.from(utils.parseEther("0.002")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
      0.05,
      false,
    );

    await expect(
      oddzOptionManager.buy(
        pair,
        utils.formatBytes32String("B_S"),
        BigInt(premiumWithSlippage1),
        getExpiry(2),
        BigNumber.from(utils.parseEther("0.002")), // number of options
        BigNumber.from(170000000000),
        OptionType.Call,
      ),
    ).to.emit(oddzOptionManager, "Buy");
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
    await addLiquidity(this.oddzLiquidityPool, this.signers.admin, 1000000);
    const premiumWithSlippage = await getPremiumWithSlippageAndBuy(
      this.oddzOptionManager,
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(1),
      BigNumber.from(utils.parseEther("1")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
      5,
      false,
    );
    await oddzVolatility.setIv(3600000, 5);
    await expect(
      oddzOptionManager.buy(
        pair,
        utils.formatBytes32String("B_S"),
        BigInt(premiumWithSlippage),
        getExpiry(1),
        BigNumber.from(utils.parseEther("1")), // number of options
        BigNumber.from(170000000000),
        OptionType.Call,
      ),
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
    await addLiquidity(this.oddzLiquidityPool, this.signers.admin, 1000000);
    const premiumWithSlippage = await getPremiumWithSlippageAndBuy(
      this.oddzOptionManager,
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(1),
      BigNumber.from(utils.parseEther("1")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
      3,
      false,
    );
    await oddzVolatility.setIv(3600000, 5);
    await expect(
      oddzOptionManager.buy(
        pair,
        utils.formatBytes32String("B_S"),
        BigInt(premiumWithSlippage),
        getExpiry(1),
        BigNumber.from(utils.parseEther("1")), // number of options
        BigNumber.from(170000000000),
        OptionType.Call,
      ),
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
    await addLiquidity(this.oddzLiquidityPool, this.signers.admin, 1000000);
    const premiumWithSlippage = await getPremiumWithSlippageAndBuy(
      this.oddzOptionManager,
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(1),
      BigNumber.from(utils.parseEther("1")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
      1,
      false,
    );
    await oddzVolatility.setIv(3600000, 5);
    await expect(
      oddzOptionManager.buy(
        pair,
        utils.formatBytes32String("B_S"),
        BigInt(premiumWithSlippage),
        getExpiry(1),
        BigNumber.from(utils.parseEther("1")), // number of options
        BigNumber.from(170000000000),
        OptionType.Call,
      ),
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
    await addLiquidity(this.oddzLiquidityPool, this.signers.admin, 1000000);
    const premiumWithSlippage = await getPremiumWithSlippageAndBuy(
      this.oddzOptionManager,
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(1),
      BigNumber.from(utils.parseEther("1")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
      0.5,
      false,
    );
    await oddzVolatility.setIv(3600000, 5);
    await expect(
      oddzOptionManager.buy(
        pair,
        utils.formatBytes32String("B_S"),
        BigInt(premiumWithSlippage),
        getExpiry(1),
        BigNumber.from(utils.parseEther("1")), // number of options
        BigNumber.from(170000000000),
        OptionType.Call,
      ),
    ).to.be.revertedWith("Premium crossed slippage tolerance");
  });

  it("should revert  with less slippage and buy for more slippage with same iv", async function () {
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
    await addLiquidity(this.oddzLiquidityPool, this.signers.admin, 1000000);
    const premiumWithSlippage = await getPremiumWithSlippageAndBuy(
      this.oddzOptionManager,
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(1),
      BigNumber.from(utils.parseEther("1")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
      3,
      false,
    );
    // increae iv
    await oddzVolatility.setIv(182831, 5);
    await expect(
      oddzOptionManager.buy(
        pair,
        utils.formatBytes32String("B_S"),
        BigInt(premiumWithSlippage),
        getExpiry(1),
        BigNumber.from(utils.parseEther("1")), // number of options
        BigNumber.from(170000000000),
        OptionType.Call,
      ),
    ).to.be.revertedWith("Premium crossed slippage tolerance");
    // reset IV to original
    await oddzVolatility.setIv(180000, 5);
    const premiumWithSlippage1 = await getPremiumWithSlippageAndBuy(
      this.oddzOptionManager,
      pair,
      utils.formatBytes32String("B_S"),
      getExpiry(1),
      BigNumber.from(utils.parseEther("1")), // number of options
      BigNumber.from(170000000000),
      OptionType.Call,
      3.1,
      false,
    );
    // increase iv
    await oddzVolatility.setIv(182831, 5);
    await expect(
      oddzOptionManager.buy(
        pair,
        utils.formatBytes32String("B_S"),
        BigInt(premiumWithSlippage1),
        getExpiry(1),
        BigNumber.from(utils.parseEther("1")), // number of options
        BigNumber.from(170000000000),
        OptionType.Call,
      ),
    ).to.emit(oddzOptionManager, "Buy");
  });
}
