import { Signer } from "@ethersproject/abstract-signer";
import { ethers, waffle } from "hardhat";
import OddzAssetManagerArtifact from "../artifacts/contracts/Option/OddzAssetManager.sol/OddzAssetManager.json";
import DexManagerArtifact from "../artifacts/contracts/Swap/DexManager.sol/DexManager.json";
import MockOddzDexArtifact from "../artifacts/contracts/Mocks/MockOddzDex.sol/MockOddzDex.json";
import MockLiquidityPoolArtifact from "../artifacts/contracts/Mocks/MockLiquidityPool.sol/MockLiquidityPool.json";
import { Accounts, Signers } from "../types";

import { MockERC20, OddzAssetManager, DexManager, MockOddzDex, MockLiquidityPool } from "../typechain";
import { shouldBehaveLikeOddzDexManager } from "./behaviors/OddzDexManager.behavior";
import { MockProvider } from "ethereum-waffle";
import { BigNumber, utils } from "ethers";
import MockERC20Artifact from "../artifacts/contracts/Mocks/MockERC20.sol/MockERC20.json";

const { deployContract } = waffle;

describe("Oddz Dex Manager Unit tests", function () {
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

  describe("Oddz Dex Manager", function () {
    beforeEach(async function () {
      this.oddzAssetManager = (await deployContract(
        this.signers.admin,
        OddzAssetManagerArtifact,
        [],
      )) as OddzAssetManager;

      this.dexManager = (await deployContract(this.signers.admin, DexManagerArtifact, [])) as DexManager;

      this.mockOddzDex = (await deployContract(this.signers.admin, MockOddzDexArtifact, [
        this.oddzAssetManager.address,
      ])) as MockOddzDex;

      this.mockLiquidityPool = (await deployContract(this.signers.admin, MockLiquidityPoolArtifact, [
        this.dexManager.address,
      ])) as MockLiquidityPool;
      await this.dexManager.setSwapper(this.mockLiquidityPool.address);
      const totalSupply = BigNumber.from(utils.parseEther("100000000"));
      this.usdcToken = (await deployContract(this.signers.admin, MockERC20Artifact, [
        "USD coin",
        "USDC",
        totalSupply,
      ])) as MockERC20;

      this.ethToken = (await deployContract(this.signers.admin, MockERC20Artifact, [
        "ETH Token",
        "ETH",
        totalSupply,
      ])) as MockERC20;
    });
    shouldBehaveLikeOddzDexManager();
  });
});
