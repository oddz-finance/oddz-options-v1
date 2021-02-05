import { expect } from "chai";
import { BigNumber, utils } from "ethers";
import { OptionType } from "../../test-utils";
import { waffle } from "hardhat";
import { OddzLiquidityPool } from "../../typechain";

const provider = waffle.provider;

const addDaysAndGetSeconds = (days = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + days)
  return Date.parse(date.toISOString().slice(0, 10))/1000;
}

const getExpiry = (days = 1) => {
  return 60 * 60 * 24 * days;
}

export function shouldBehaveLikeOddzOptionManager(): void {
  it("should fail with message invalid asset", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    await expect(
      oddzOptionManager.getPremium(1, getExpiry(1), BigNumber.from(100), BigNumber.from(1234), OptionType.Call),
    ).to.be.revertedWith("Invalid Asset");
  });
  it("should fail with message Asset already present", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    // call should be optionType.call
    await oddzOptionManager.addAsset(utils.formatBytes32String("ETH"), BigNumber.from(100000));
    await expect(
      oddzOptionManager.addAsset(utils.formatBytes32String("ETH"), BigNumber.from(100000)),
    ).to.be.revertedWith("Asset already present");
  });
  it("should add new asset", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    await expect(oddzOptionManager.addAsset(utils.formatBytes32String("ETH"), BigNumber.from(100000))).to.emit(
      oddzOptionManager,
      "NewAsset",
    );
  });
  it("should emit new asset event", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    const assetId = await oddzOptionManager.addAsset(utils.formatBytes32String("ETH"), BigNumber.from(100000));
    const asset = await oddzOptionManager.assets(0);
    expect(asset.id).to.be.equal(0);
  });
  it("should return newly added asset ids for multiple assets", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    await oddzOptionManager.addAsset(utils.formatBytes32String("ETH"), BigNumber.from(100000));
    const asset0 = await oddzOptionManager.assets(0);
    expect(asset0.id).to.be.equal(0);
    await oddzOptionManager.addAsset(utils.formatBytes32String("BTC"), BigNumber.from(100000));
    const asset1 = await oddzOptionManager.assets(1);
    expect(asset1.id).to.be.equal(1);
  });
  it("should return the premium price", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    // call should be optionType.call
    const assetId = await oddzOptionManager.addAsset(utils.formatBytes32String("ETH"), BigNumber.from(100000));
    const asset = await oddzOptionManager.assets(0);
    const option = await oddzOptionManager.getPremium(
      asset.id,
      getExpiry(1),
      BigNumber.from(1), // number of options
      BigNumber.from(1341),
      OptionType.Call,
    );
    const { optionPremium, settlementFee, cp, iv } = option;
    expect(iv.toNumber()).to.equal(180000);
    expect(optionPremium.toNumber()).to.equal(147);
    expect(settlementFee.toNumber()).to.equal(7); //shouldn't the settlement fee a % of optionPremium?
    expect(cp.toNumber()).to.equal(1200);
  });

  it("should throw Expiration cannot be less than 1 days error when the expiry is less than a day", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    await expect(
      oddzOptionManager.buy(
        1,
        getExpiry(0),
        BigNumber.from(100),
        BigNumber.from(1234),
        OptionType.Call,
      ),
    ).to.be.revertedWith("Expiration cannot be less than 1 days");
  });

  it("should throw Expiration cannot be more than 30 days error when the expiry is more than a 30 days", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    await expect(
      oddzOptionManager.buy(
        1,
        getExpiry(31),
        BigNumber.from(100),
        BigNumber.from(1234),
        OptionType.Call,
      ),
    ).to.be.revertedWith("Expiration cannot be more than 30 days");
  });

  it("should prevent buying options for unsupported asset type", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    await expect(
      oddzOptionManager.buy(
        1,
        getExpiry(1),
        BigNumber.from(100),
        BigNumber.from(1234),
        OptionType.Call,
      ),
    ).to.be.revertedWith("Invalid Asset");
  });

  it("should buy option if the asset is supported and emit buy event", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    const oddzLiquidityPool = await this.oddzLiquidityPool.connect(this.signers.admin);
    await oddzLiquidityPool.addLiquidity({ value: 100000000 });
    await oddzOptionManager.addAsset(utils.formatBytes32String("WBTC"), BigNumber.from(100000));
    const asset = await oddzOptionManager.assets(0);
    let overrides = {
      value: utils.parseEther("1")     // ether in this case MUST be a string
    };
    await expect(
      oddzOptionManager.buy(
        asset.id,
        getExpiry(10),
        BigNumber.from(5),
        BigNumber.from(1220),
        OptionType.Call,
        overrides,
      ),
    ).to.emit(oddzOptionManager, "Buy");
  });

  it("should throw low premium exception", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    const oddzLiquidityPool = await this.oddzLiquidityPool.connect(this.signers.admin);
    await oddzLiquidityPool.addLiquidity({ value: 100000000 });
    await oddzOptionManager.addAsset(utils.formatBytes32String("WBTC"), BigNumber.from(100000));
    const asset = await oddzOptionManager.assets(0);
    let overrides = {
      value: utils.parseEther("0.01")     // ether in this case MUST be a string
    };
    await expect(
      oddzOptionManager.buy(
        asset.id,
        getExpiry(10),
        BigNumber.from(5),
        BigNumber.from(1220),
        OptionType.Call,
        overrides,
      ),
    ).to.be.revertedWith("Premium is low");
  });

  it("should excercise option if the asset is supported and emit excercise event", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    await oddzOptionManager.addAsset(utils.formatBytes32String("WBTC"), BigNumber.from(100000));
    const asset = await oddzOptionManager.assets(0);
    const oddzLiquidityPool = await this.oddzLiquidityPool.connect(this.signers.admin);
    await oddzLiquidityPool.addLiquidity({ value: 100000000 });
    let overrides = {
      value: utils.parseEther("1")     // ether in this case MUST be a string
    };
    await oddzOptionManager.buy(
      asset.id,
      getExpiry(2),
      BigNumber.from(5),
      BigNumber.from(1210),
      OptionType.Call,
      overrides,
    );
    await expect(oddzOptionManager.exercise(0)).to.emit(oddzOptionManager, "Exercise");
  });

  it("should throw an error when trying to excercise an option that is expired", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    await oddzOptionManager.addAsset(utils.formatBytes32String("WBTC"), BigNumber.from(100000));
    const asset = await oddzOptionManager.assets(0);
    const oddzLiquidityPool = await this.oddzLiquidityPool.connect(this.signers.admin);
    await oddzLiquidityPool.addLiquidity({ value: 100000000 });
    let overrides = {
      value: utils.parseEther("1")     // ether in this case MUST be a string
    };
    await oddzOptionManager.buy(
      asset.id,
      getExpiry(1),
      BigNumber.from(5),
      BigNumber.from(1210),
      OptionType.Call,
      overrides,
    );
    await provider.send("evm_increaseTime", [getExpiry(2)]);
    await expect(oddzOptionManager.exercise(0)).to.be.revertedWith("Option has expired");
  });

  it("should throw an error when trying to excercise an option that is owned by other wallet", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    await oddzOptionManager.addAsset(utils.formatBytes32String("WBTC"), BigNumber.from(100000));
    const asset = await oddzOptionManager.assets(0);
    const oddzOptionManager1 = await this.oddzOptionManager.connect(this.signers.admin1);
    const oddzLiquidityPool = await this.oddzLiquidityPool.connect(this.signers.admin);
    await oddzLiquidityPool.addLiquidity({ value: 100000000 });
    let overrides = {
      value: utils.parseEther("1")     // ether in this case MUST be a string
    };
    await oddzOptionManager.buy(
      asset.id,
      getExpiry(2),
      BigNumber.from(5),
      BigNumber.from(1210),
      OptionType.Call,
      overrides,
    );
    await expect(oddzOptionManager1.exercise(0)).to.be.revertedWith("Wrong msg.sender");
  });

  it("should throw an error when trying excercise an option if the option is not active", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    await oddzOptionManager.addAsset(utils.formatBytes32String("WBTC"), BigNumber.from(100000));
    const asset = await oddzOptionManager.assets(0);
    const oddzLiquidityPool = await this.oddzLiquidityPool.connect(this.signers.admin);
    await oddzLiquidityPool.addLiquidity({ value: 100000000 });
    let overrides = {
      value: utils.parseEther("1")     // ether in this case MUST be a string
    };
    await oddzOptionManager.buy(
      asset.id,
      getExpiry(1),
      BigNumber.from(5),
      BigNumber.from(1210),
      OptionType.Call,
      overrides,
    );
    await expect(oddzOptionManager.exercise(0)).to.emit(oddzOptionManager, "Exercise");
    await expect(oddzOptionManager.exercise(0)).to.be.revertedWith("Wrong state");
  });

  it("should unlock the collateral locked if the option is expired and active", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    await oddzOptionManager.addAsset(utils.formatBytes32String("WBTC"), BigNumber.from(100000));
    const asset = await oddzOptionManager.assets(0);
    const oddzLiquidityPool = await this.oddzLiquidityPool.connect(this.signers.admin);
    await oddzLiquidityPool.addLiquidity({ value: 100000000 });
    let overrides = {
      value: utils.parseEther("1")     // ether in this case MUST be a string
    };
    const optionBought = await oddzOptionManager.buy(
      asset.id,
      getExpiry(1),
      BigNumber.from(10),
      BigNumber.from(1300),
      OptionType.Call,
      overrides,
    );
    await provider.send("evm_increaseTime", [getExpiry(2)]);
    await expect(oddzOptionManager.unlock(0)).to.emit(oddzOptionManager, "Expire");
  });

  it("should distribute liquidity", async function () {
    const oddzOptionManager = await this.oddzOptionManager.connect(this.signers.admin);
    await oddzOptionManager.addAsset(utils.formatBytes32String("WBTC"), BigNumber.from(100000));
    const asset = await oddzOptionManager.assets(0);
    const oddzLiquidityPool = await this.oddzLiquidityPool.connect(this.signers.admin);
    await oddzLiquidityPool.addLiquidity({ value: 1000000 });
    let overrides = {
      value: utils.parseEther("1")     // ether in this case MUST be a string
    };
    await oddzOptionManager.buy(
      asset.id,
      getExpiry(1),
      BigNumber.from(1),
      BigNumber.from(1250),
      OptionType.Call,
      overrides,
    );
    const op0 = await oddzOptionManager.options(0);
    console.log("SP 1250, Expiry: 1 Day", op0.premium.toNumber());

    await oddzOptionManager.buy(
      asset.id,
      getExpiry(10),
      BigNumber.from(1),
      BigNumber.from(1250),
      OptionType.Call,
      overrides,
    );
    const op1 = await oddzOptionManager.options(1);
    console.log("SP 1250, Expiry: 10 Days", op1.premium.toNumber());

    // await provider.send("evm_increaseTime", [getExpiry(2)]);
    // await expect(oddzOptionManager.unlock(0)).to.emit(oddzOptionManager, "Expire");
    // console.log(await oddzLiquidityPool.premiumDayPool(addDaysAndGetSeconds(2)));
    // increment evm time by one more day at this point
    // await oddzOptionManager.distributePremium( addDaysAndGetSeconds(2), [this.signers.admin.getAddress()] );
    // check for lpPremium of admin address should be same as premium
    // also check premiumDayPool distributed increased same as premium
  });
}
