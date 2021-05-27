import { Signer } from "@ethersproject/abstract-signer";
import { ethers, waffle } from "hardhat";
import OddzStakingManagerArtifact from "../artifacts/contracts/Staking/OddzStakingManager.sol/OddzStakingManager.json";
import OddzSDKArtifact from "../artifacts/contracts/OddzSDK.sol/OddzSDK.json";
import OddzAssetManagerArtifact from "../artifacts/contracts/Option/OddzAssetManager.sol/OddzAssetManager.json";
import OddzLiquidityPoolManagerArtifact from "../artifacts/contracts/Pool/OddzLiquidityPoolManager.sol/OddzLiquidityPoolManager.json";
import OddzAdministratorArtifact from "../artifacts/contracts/OddzAdministrator.sol/OddzAdministrator.json";
import DexManagerArtifact from "../artifacts/contracts/Swap/DexManager.sol/DexManager.json";
import OddzOptionPremiumManagerArtifact from "../artifacts/contracts/Option/OddzOptionPremiumManager.sol/OddzOptionPremiumManager.json";
import OddzIVOracleManagerArtifact from "../artifacts/contracts/Oracle/OddzIVOracleManager.sol/OddzIVOracleManager.json";
import OddzOptionManagerArtifact from "../artifacts/contracts/Option/OddzOptionManager.sol/OddzOptionManager.json";
import OddzFeeManagerArtifact from "../artifacts/contracts/Option/OddzFeeManager.sol/OddzFeeManager.json";
import OddzPriceOracleManagerArtifact from "../artifacts/contracts/Oracle/OddzPriceOracleManager.sol/OddzPriceOracleManager.json";

import { Accounts, Signers } from "../types";

import { 
    MockERC20, 
    OddzStakingManager, 
    DexManager, 
    OddzAssetManager,
    OddzLiquidityPoolManager, 
    OddzSDK, 
    OddzAdministrator,
    OddzIVOracleManager,
    OddzFeeManager,
    OddzOptionManager,
    OddzOptionPremiumManager,
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
            "USDC",
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

      this.dexManager = (await deployContract(this.signers.admin, DexManagerArtifact, [
        this.oddzAssetManager.address,
      ])) as DexManager;

      this.oddzStaking = (await deployContract(this.signers.admin, OddzStakingManagerArtifact, [
        this.usdcToken.address,
      ])) as OddzStakingManager;

      this.oddzLiquidityPoolManager = (await deployContract(this.signers.admin, OddzLiquidityPoolManagerArtifact, [
        this.usdcToken.address,
        this.dexManager.address,
      ])) as OddzLiquidityPoolManager;

      const oddzIVOracleManager = (await deployContract(
        this.signers.admin,
        OddzIVOracleManagerArtifact,
        [],
      )) as OddzIVOracleManager;

        this.oddzPriceOracleManager = (await deployContract(
            this.signers.admin,
            OddzPriceOracleManagerArtifact,
            [],
          )) as OddzPriceOracleManager;

      const oddzOptionPremiumManager = (await deployContract(
        this.signers.admin,
        OddzOptionPremiumManagerArtifact,
        [],
      )) as OddzOptionPremiumManager;

      const oddzFeeManager = (await deployContract(this.signers.admin, OddzFeeManagerArtifact, [])) as OddzFeeManager;
      
      this.oddzOptionManager = (await deployContract(this.signers.admin, OddzOptionManagerArtifact, [
        this.oddzPriceOracleManager.address,
        oddzIVOracleManager.address,
        this.oddzStaking.address,
        this.oddzLiquidityPoolManager.address,
        this.usdcToken.address,
        this.oddzAssetManager.address,
        oddzOptionPremiumManager.address,
        oddzFeeManager.address,
      ])) as OddzOptionManager;

      const bscForwarder = "0x61456BF1715C1415730076BB79ae118E806E74d2";

      this.oddzSDK = (await deployContract(this.signers.admin, OddzSDKArtifact, [
        this.oddzOptionManager.address,
        this.oddzLiquidityPoolManager.address,
        bscForwarder,
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
    });
    shouldBehaveLikeOddzAdministrator();
  });
});
