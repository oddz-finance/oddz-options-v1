import { Signer } from "@ethersproject/abstract-signer";
import { ethers, waffle } from "hardhat";
import OddzOptionManagerArtifact from "../artifacts/contracts/Option/OddzOptionManager.sol/OddzOptionManager.json";
import OddzPriceOracleManagerArtifact from "../artifacts/contracts/Oracle/OddzPriceOracleManager.sol/OddzPriceOracleManager.json";
import OddzIVOracleManagerArtifact from "../artifacts/contracts/Oracle/OddzIVOracleManager.sol/OddzIVOracleManager.json";
import MockOddzPriceOracleArtifact from "../artifacts/contracts/Mocks/MockOddzPriceOracle.sol/MockOddzPriceOracle.json";
import MockOddzVolatilityArtifact from "../artifacts/contracts/Mocks/MockOddzVolatility.sol/MockOddzVolatility.json";
import OddzStakingManagerArtifact from "../artifacts/contracts/Staking/OddzStakingManager.sol/OddzStakingManager.json";
import OddzAssetManagerArtifact from "../artifacts/contracts/Option/OddzAssetManager.sol/OddzAssetManager.json";
import DexManagerArtifact from "../artifacts/contracts/Swap/DexManager.sol/DexManager.json";
import OddzOptionPremiumManagerArtifact from "../artifacts/contracts/Option/OddzOptionPremiumManager.sol/OddzOptionPremiumManager.json";
import OddzPremiumBlackScholesArtifact from "../artifacts/contracts/Option/OddzPremiumBlackScholes.sol/OddzPremiumBlackScholes.json";
import OddzSDKArtifact from "../artifacts/contracts/OddzSDK.sol/OddzSDK.json";
import OddzLiquidityPoolManagerArtifact from "../artifacts/contracts/Pool/OddzLiquidityPoolManager.sol/OddzLiquidityPoolManager.json";
import OddzDefaultPoolArtifact from "../artifacts/contracts/Pool/OddzPools.sol/OddzDefaultPool.json";
import OddzFeeManagerArtifact from "../artifacts/contracts/Option/OddzFeeManager.sol/OddzFeeManager.json";
import MockERC20Artifact from "../artifacts/contracts/Mocks/MockERC20.sol/MockERC20.json";

import { Accounts, Signers } from "../types";

import {
  OddzOptionManager,
  MockOddzPriceOracle,
  MockOddzVolatility,
  OddzStakingManager,
  MockERC20,
  OddzLiquidityPoolManager,
  OddzDefaultPool,
  OddzPriceOracleManager,
  OddzAssetManager,
  DexManager,
  OddzIVOracleManager,
  OddzOptionPremiumManager,
  OddzPremiumBlackScholes,
  OddzSDK,
  OddzFeeManager,
} from "../typechain";
import { shouldBehaveLikeOddzSDK } from "./behaviors/OddzSDK.behavior";
import { MockProvider } from "ethereum-waffle";
import { BigNumber, utils } from "ethers";
import { OptionType } from "../test-utils";

const { deployContract } = waffle;

describe("Oddz Option Sdk Unit tests", function () {
  const [wallet, walletTo] = new MockProvider().getWallets();
  before(async function () {
    this.accounts = {} as Accounts;
    this.signers = {} as Signers;

    const signers: Signer[] = await ethers.getSigners();
    this.signers.admin = signers[0];
    this.signers.admin1 = signers[1];
    this.accounts.admin = await signers[0].getAddress();
    this.accounts.admin1 = await signers[1].getAddress();
    this.wallet = wallet;
    this.walletTo = walletTo;
  });

  describe("Oddz Option Sdk", function () {
    beforeEach(async function () {
      this.oddzAssetManager = (await deployContract(
        this.signers.admin,
        OddzAssetManagerArtifact,
        [],
      )) as OddzAssetManager;

      this.dexManager = (await deployContract(this.signers.admin, DexManagerArtifact, [
        this.oddzAssetManager.address,
      ])) as DexManager;

      this.oddzPriceOracle = (await deployContract(this.signers.admin, MockOddzPriceOracleArtifact, [
        BigNumber.from(161200000000),
      ])) as MockOddzPriceOracle;

      this.oddzPriceOracleManager = (await deployContract(
        this.signers.admin,
        OddzPriceOracleManagerArtifact,
        [],
      )) as OddzPriceOracleManager;
      await this.oddzPriceOracle.setManager(this.oddzPriceOracleManager.address);

      this.oddzVolatility = (await deployContract(
        this.signers.admin,
        MockOddzVolatilityArtifact,
      )) as MockOddzVolatility;

      const oddzIVOracleManager = (await deployContract(
        this.signers.admin,
        OddzIVOracleManagerArtifact,
        [],
      )) as OddzIVOracleManager;

      await oddzIVOracleManager.addIVAggregator(
        utils.formatBytes32String("ETH"),
        utils.formatBytes32String("USD"),
        this.oddzVolatility.address,
        this.oddzVolatility.address,
        1,
      );

      const hash = utils.keccak256(
        utils.defaultAbiCoder.encode(
          ["bytes32", "bytes32", "address"],
          [utils.formatBytes32String("ETH"), utils.formatBytes32String("USD"), this.oddzVolatility.address],
        ),
      );

      await oddzIVOracleManager.setActiveIVAggregator(hash);

      const totalSupply = BigNumber.from(utils.parseEther("100000000"));
      this.usdcToken = (await deployContract(this.signers.admin, MockERC20Artifact, [
        "USD coin",
        "USDC",
        totalSupply,
      ])) as MockERC20;
      const bscForwarder = "0x61456BF1715C1415730076BB79ae118E806E74d2";

      this.ethToken = (await deployContract(this.signers.admin, MockERC20Artifact, [
        "ETH Token",
        "ETH",
        totalSupply,
      ])) as MockERC20;

      this.oddzToken = (await deployContract(this.signers.admin, MockERC20Artifact, [
        "ODDZ Token",
        "ODDZ",
        totalSupply,
      ])) as MockERC20;

      const oddzStaking = (await deployContract(this.signers.admin, OddzStakingManagerArtifact, [
        this.usdcToken.address,
      ])) as OddzStakingManager;

      this.oddzDefaultPool = (await deployContract(this.signers.admin, OddzDefaultPoolArtifact, [])) as OddzDefaultPool;

      // USDC prod address 0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48
      this.oddzLiquidityPoolManager = (await deployContract(this.signers.admin, OddzLiquidityPoolManagerArtifact, [
        this.usdcToken.address,
        this.dexManager.address,
      ])) as OddzLiquidityPoolManager;

      const oddzOptionPremiumManager = (await deployContract(
        this.signers.admin,
        OddzOptionPremiumManagerArtifact,
        [],
      )) as OddzOptionPremiumManager;

      const oddzFeeManager = (await deployContract(this.signers.admin, OddzFeeManagerArtifact, [])) as OddzFeeManager;

      this.oddzOptionManager = (await deployContract(this.signers.admin, OddzOptionManagerArtifact, [
        this.oddzPriceOracleManager.address,
        oddzIVOracleManager.address,
        this.oddzLiquidityPoolManager.address,
        this.usdcToken.address,
        this.oddzAssetManager.address,
        oddzOptionPremiumManager.address,
        oddzFeeManager.address,
      ])) as OddzOptionManager;
      await this.oddzLiquidityPoolManager.setManager(this.oddzOptionManager.address);
      await oddzIVOracleManager.setManager(this.oddzOptionManager.address);
      this.oddzSDK = (await deployContract(this.signers.admin, OddzSDKArtifact, [
        this.oddzOptionManager.address,
        bscForwarder,
        this.oddzToken.address,
      ])) as OddzSDK;

      await this.oddzOptionManager.setSdk(this.oddzSDK.address);
      await this.oddzOptionManager.setAdministrator(oddzStaking.address);
      const usdcToken = await this.usdcToken.connect(this.signers.admin);
      const usdcToken1 = await this.usdcToken.connect(this.signers.admin1);

      // Allow for liquidty pool
      await usdcToken.approve(this.oddzLiquidityPoolManager.address, totalSupply);
      await usdcToken1.approve(this.oddzLiquidityPoolManager.address, totalSupply);
      await usdcToken.allowance(this.accounts.admin, this.oddzLiquidityPoolManager.address);
      await usdcToken1.allowance(this.accounts.admin1, this.oddzLiquidityPoolManager.address);

      // Allow for option manager
      await usdcToken.approve(this.oddzOptionManager.address, totalSupply);
      await usdcToken1.approve(this.oddzOptionManager.address, totalSupply);
      await usdcToken.allowance(this.accounts.admin, this.oddzOptionManager.address);
      await usdcToken1.allowance(this.accounts.admin1, this.oddzOptionManager.address);

      // transfer required balance
      await usdcToken.transfer(this.accounts.admin, totalSupply.div(3));
      await usdcToken.transfer(this.accounts.admin1, totalSupply.div(3));

      // Add Black Scholes
      const oddzPremiumBlackScholes = (await deployContract(
        this.signers.admin,
        OddzPremiumBlackScholesArtifact,
        [],
      )) as OddzPremiumBlackScholes;
      await oddzPremiumBlackScholes.transferOwnership(oddzOptionPremiumManager.address);

      await oddzOptionPremiumManager.addOptionPremiumModel(
        utils.formatBytes32String("B_S"),
        oddzPremiumBlackScholes.address,
      );
      await oddzOptionPremiumManager.setManager(this.oddzOptionManager.address);
      await this.oddzDefaultPool.transferOwnership(this.oddzLiquidityPoolManager.address);
      await this.oddzLiquidityPoolManager
        .connect(this.signers.admin)
        .mapPool("0xfcb06d25357ef01726861b30b0b83e51482db417", OptionType.Call, utils.formatBytes32String("B_S"), 1, [
          this.oddzDefaultPool.address,
        ]);
      await this.oddzLiquidityPoolManager
        .connect(this.signers.admin)
        .mapPool("0xfcb06d25357ef01726861b30b0b83e51482db417", OptionType.Call, utils.formatBytes32String("B_S"), 2, [
          this.oddzDefaultPool.address,
        ]);
      await this.oddzLiquidityPoolManager
        .connect(this.signers.admin)
        .mapPool("0xfcb06d25357ef01726861b30b0b83e51482db417", OptionType.Call, utils.formatBytes32String("B_S"), 7, [
          this.oddzDefaultPool.address,
        ]);
      await this.oddzLiquidityPoolManager
        .connect(this.signers.admin)
        .mapPool("0xfcb06d25357ef01726861b30b0b83e51482db417", OptionType.Call, utils.formatBytes32String("B_S"), 14, [
          this.oddzDefaultPool.address,
        ]);
      await this.oddzLiquidityPoolManager
        .connect(this.signers.admin)
        .mapPool("0xfcb06d25357ef01726861b30b0b83e51482db417", OptionType.Call, utils.formatBytes32String("B_S"), 30, [
          this.oddzDefaultPool.address,
        ]);

      // Put
      await this.oddzLiquidityPoolManager
        .connect(this.signers.admin)
        .mapPool("0xfcb06d25357ef01726861b30b0b83e51482db417", OptionType.Put, utils.formatBytes32String("B_S"), 1, [
          this.oddzDefaultPool.address,
        ]);
      await this.oddzLiquidityPoolManager
        .connect(this.signers.admin)
        .mapPool("0xfcb06d25357ef01726861b30b0b83e51482db417", OptionType.Put, utils.formatBytes32String("B_S"), 2, [
          this.oddzDefaultPool.address,
        ]);
      await this.oddzLiquidityPoolManager
        .connect(this.signers.admin)
        .mapPool("0xfcb06d25357ef01726861b30b0b83e51482db417", OptionType.Put, utils.formatBytes32String("B_S"), 7, [
          this.oddzDefaultPool.address,
        ]);
      await this.oddzLiquidityPoolManager
        .connect(this.signers.admin)
        .mapPool("0xfcb06d25357ef01726861b30b0b83e51482db417", OptionType.Put, utils.formatBytes32String("B_S"), 14, [
          this.oddzDefaultPool.address,
        ]);
      await this.oddzLiquidityPoolManager
        .connect(this.signers.admin)
        .mapPool("0xfcb06d25357ef01726861b30b0b83e51482db417", OptionType.Put, utils.formatBytes32String("B_S"), 30, [
          this.oddzDefaultPool.address,
        ]);
    });
    shouldBehaveLikeOddzSDK();
  });
});
