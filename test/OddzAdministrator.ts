import { Signer } from "@ethersproject/abstract-signer";
import { ethers, waffle } from "hardhat";
import OddzStakingManagerArtifact from "../artifacts/contracts/Staking/OddzStakingManager.sol/OddzStakingManager.json";
import OddzSDKArtifact from "../artifacts/contracts/OddzSDK.sol/OddzSDK.json";
import OddzAssetManagerArtifact from "../artifacts/contracts/Option/OddzAssetManager.sol/OddzAssetManager.json";
import OddzLiquidityPoolManagerArtifact from "../artifacts/contracts/Pool/OddzLiquidityPoolManager.sol/OddzLiquidityPoolManager.json";
import OddzAdministratorArtifact from "../artifacts/contracts/OddzAdministrator.sol/OddzAdministrator.json";
import DexManagerArtifact from "../artifacts/contracts/Swap/DexManager.sol/DexManager.json";
import OddzOptionManagerArtifact from "../artifacts/contracts/Mocks/MockOptionManager.sol/MockOptionManager.json";
import MockSwapArtifact from "../artifacts/contracts/Mocks/MockSwap.sol/MockSwap.json";
import OddzTokenStakingArtifact from "../artifacts/contracts/Staking/OddzTokenStaking.sol/OddzTokenStaking.json";
import OddzPriceOracleManagerArtifact from "../artifacts/contracts/Oracle/OddzPriceOracleManager.sol/OddzPriceOracleManager.json";
import MockOddzPriceOracleArtifact from "../artifacts/contracts/Mocks/MockOddzPriceOracle.sol/MockOddzPriceOracle.json";

import { Accounts, Signers } from "../types";

import {
  MockERC20,
  OddzStakingManager,
  DexManager,
  OddzAssetManager,
  OddzLiquidityPoolManager,
  OddzSDK,
  OddzAdministrator,
  OddzOptionManager,
  MockSwap,
  OddzTokenStaking,
  MockOddzPriceOracle,
  OddzPriceOracleManager,
} from "../typechain";
import { shouldBehaveLikeOddzAdministrator } from "./behaviors/OddzAdministrator.behavior";
import { MockProvider } from "ethereum-waffle";
import { BigNumber, utils } from "ethers";
import MockERC20Artifact from "../artifacts/contracts/Mocks/MockERC20.sol/MockERC20.json";

const { deployContract } = waffle;

describe("Oddz Administrator Unit tests", function () {
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

  describe("Oddz Administrator", function () {
    beforeEach(async function () {
      const totalSupply = BigNumber.from(utils.parseEther("100000000"));

      this.usdcToken = (await deployContract(this.signers.admin, MockERC20Artifact, [
        "USD coin",
        "USD",
        totalSupply,
      ])) as MockERC20;

      this.oddzToken = (await deployContract(this.signers.admin, MockERC20Artifact, [
        "ODDZ Token",
        "ODDZ",
        totalSupply,
      ])) as MockERC20;

      this.oddzAssetManager = (await deployContract(
        this.signers.admin,
        OddzAssetManagerArtifact,
        [],
      )) as OddzAssetManager;

      this.oddzPriceOracle = (await deployContract(this.signers.admin, MockOddzPriceOracleArtifact, [
        BigNumber.from(161200000000),
      ])) as MockOddzPriceOracle;

      this.oddzPriceOracleManager = (await deployContract(
        this.signers.admin,
        OddzPriceOracleManagerArtifact,
        [],
      )) as OddzPriceOracleManager;
      await this.oddzPriceOracle.setManager(this.oddzPriceOracleManager.address);

      this.dexManager = (await deployContract(this.signers.admin, DexManagerArtifact, [
        this.oddzAssetManager.address,
      ])) as DexManager;

      this.mockOddzDex = (await deployContract(this.signers.admin, MockSwapArtifact, [
        this.oddzPriceOracleManager.address,
        [utils.formatBytes32String("ETH"), utils.formatBytes32String("BTC")],
        [this.usdcToken.address, this.usdcToken.address],
      ])) as MockSwap;

      await this.dexManager.addExchange(
        utils.formatBytes32String("ODDZ"),
        utils.formatBytes32String("USD"),
        this.mockOddzDex.address,
      );

      const dexHash = utils.keccak256(
        utils.defaultAbiCoder.encode(
          ["bytes32", "bytes32", "address"],
          [utils.formatBytes32String("ODDZ"), utils.formatBytes32String("USD"), this.mockOddzDex.address],
        ),
      );

      await this.dexManager.setActiveExchange(dexHash);
      await this.mockOddzDex.setManager(this.dexManager.address);

      this.oddzStaking = (await deployContract(this.signers.admin, OddzStakingManagerArtifact, [
        this.oddzToken.address,
      ])) as OddzStakingManager;

      this.oddzLiquidityPoolManager = (await deployContract(this.signers.admin, OddzLiquidityPoolManagerArtifact, [
        this.usdcToken.address,
        this.dexManager.address,
      ])) as OddzLiquidityPoolManager;

      const bscForwarder = "0x61456BF1715C1415730076BB79ae118E806E74d2";

      this.oddzOptionManager = (await deployContract(this.signers.admin, OddzOptionManagerArtifact, [
        this.oddzLiquidityPoolManager.address,
        this.usdcToken.address,
      ])) as OddzOptionManager;

      this.oddzSDK = (await deployContract(this.signers.admin, OddzSDKArtifact, [
        this.oddzOptionManager.address,
        bscForwarder,
        this.oddzToken.address,
        this.usdcToken.address,
      ])) as OddzSDK;

      this.oddzAdministrator = (await deployContract(this.signers.admin, OddzAdministratorArtifact, [
        this.usdcToken.address,
        this.oddzToken.address,
        this.oddzStaking.address,
        this.oddzSDK.address,
        this.accounts.admin,
        this.accounts.admin1,
        this.dexManager.address,
      ])) as OddzAdministrator;

      this.oddzTokenStaking = (await deployContract(this.signers.admin, OddzTokenStakingArtifact, [
        this.oddzToken.address,
      ])) as OddzTokenStaking;

      await this.oddzTokenStaking.transferOwnership(this.oddzStaking.address);

      await this.oddzStaking.addToken(
        this.oddzToken.address,
        this.oddzTokenStaking.address,
        86400,
        86400,
        100,
        100,
        100,
      );

      await this.dexManager.setSwapper(this.oddzAdministrator.address);
    });

    shouldBehaveLikeOddzAdministrator();
  });
});
