import { Signer } from "@ethersproject/abstract-signer";
import { ethers, waffle } from "hardhat";
import OddzStrategyManagerArtifact from "../artifacts/contracts/Pool/OddzStrategyManager.sol/OddzStrategyManager.json";
import OddzLiquidityPoolManagerArtifact from "../artifacts/contracts/Pool/OddzLiquidityPoolManager.sol/OddzLiquidityPoolManager.json";
import DexManagerArtifact from "../artifacts/contracts/Swap/DexManager.sol/DexManager.json";
import OddzAssetManagerArtifact from "../artifacts/contracts/Option/OddzAssetManager.sol/OddzAssetManager.json";
import OddzDefaultPoolArtifact from "../artifacts/contracts/Pool/OddzPools.sol/OddzDefaultPool.json";
import OddzWriteStrategyArtifact from "../artifacts/contracts/Pool/OddzWriteStrategy.sol/OddzWriteStrategy.json";

import { Accounts, Signers } from "../types";

import {
  MockERC20,
  OddzStrategyManager,
  DexManager,
  OddzLiquidityPoolManager,
  OddzAssetManager,
  OddzDefaultPool,
} from "../typechain";
import { MockProvider } from "ethereum-waffle";
import { BigNumber, utils } from "ethers";
import MockERC20Artifact from "../artifacts/contracts/Mocks/MockERC20.sol/MockERC20.json";
import { shouldBehaveLikeOddzStrategyManager } from "./behaviors/OddzStrategyManager.behavior";
import { OptionType } from "../test-utils";

const { deployContract } = waffle;

describe("Oddz Strategy Manager Unit tests", function () {
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

  describe("Oddz Strategy Manager", function () {
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

      this.dexManager = (await deployContract(this.signers.admin, DexManagerArtifact, [
        this.oddzAssetManager.address,
      ])) as DexManager;

      this.oddzLiquidityPoolManager = (await deployContract(this.signers.admin, OddzLiquidityPoolManagerArtifact, [
        this.usdcToken.address,
        this.dexManager.address,
      ])) as OddzLiquidityPoolManager;

      this.oddzStrategyManager = (await deployContract(this.signers.admin, OddzStrategyManagerArtifact, [
        this.oddzLiquidityPoolManager.address,
        this.usdcToken.address,
      ])) as OddzStrategyManager;

      this.oddzDefaultPool = (await deployContract(this.signers.admin, OddzDefaultPoolArtifact, [])) as OddzDefaultPool;
      await this.oddzDefaultPool.transferOwnership(this.oddzLiquidityPoolManager.address);

      this.oddzWriteStrategyAbi = OddzWriteStrategyArtifact.abi;

      // ETH Call
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
    });

    shouldBehaveLikeOddzStrategyManager();
  });
});
