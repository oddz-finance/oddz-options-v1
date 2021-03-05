import { Signer } from "@ethersproject/abstract-signer";
import { ethers, waffle } from "hardhat";
import OddzLiquidityPoolArtifact from "../artifacts/contracts/Pool/OddzLiquidityPool.sol/OddzLiquidityPool.json";
import { Accounts, Signers } from "../types";
import { OddzLiquidityPool, OddzToken, SwapUnderlyingAsset } from "../typechain";
import { shouldBehaveLikeOddzLiquidityPool } from "./behaviors/OddzLiquidityPool.behavior";
import { MockProvider } from "ethereum-waffle";
import OddzTokenArtifact from "../artifacts/contracts/OddzToken.sol/OddzToken.json";
import SwapUnderlyingAssetArtifact from "../artifacts/contracts/Integrations/Dex/PancakeSwap/SwapUnderlyingAsset.sol/SwapUnderlyingAsset.json";
import UniswapV2FactoryArtifact from "../mockSwap_artifacts/core/contracts/UniswapV2Factory.sol/UniswapV2Factory.json";
import WETHArtifact from "../mockSwap_artifacts/periphery/contracts/WETH.sol/WETH.json";
import UniswapV2Router02Artifact from "../mockSwap_artifacts/periphery/contracts/UniswapV2Router02.sol/UniswapV2Router02.json";

const { deployContract } = waffle;

describe("Oddz Option Manager Unit tests", function () {
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

  describe("Oddz Liquidity Pool", function () {
    beforeEach(async function () {
      this.uniswapFactory = await deployContract(this.signers.admin, UniswapV2FactoryArtifact, [this.accounts.admin]);

      const WETH = await deployContract(this.signers.admin, WETHArtifact, []);

      this.uniswapRouter = await deployContract(this.signers.admin, UniswapV2Router02Artifact, [
        this.uniswapFactory.address,
        WETH.address,
      ]);

      this.swapUnderlyingAsset = (await deployContract(this.signers.admin, SwapUnderlyingAssetArtifact, [
        this.uniswapRouter.address,
      ])) as SwapUnderlyingAsset;

      const totalSupply = 1000000000000000;

      this.usdcToken = (await deployContract(this.signers.admin, OddzTokenArtifact, [
        "USD coin",
        "USDC",
        totalSupply,
      ])) as OddzToken;

      const usdcToken = await this.usdcToken.connect(this.signers.admin);
      const usdcToken1 = await this.usdcToken.connect(this.signers.admin1);

      this.oddzLiquidityPool = (await deployContract(this.signers.admin, OddzLiquidityPoolArtifact, [
        this.usdcToken.address,
        this.swapUnderlyingAsset.address,
      ])) as OddzLiquidityPool;

      await usdcToken.approve(this.oddzLiquidityPool.address, totalSupply);
      await usdcToken1.approve(this.oddzLiquidityPool.address, totalSupply);
      await usdcToken.allowance(this.accounts.admin, this.oddzLiquidityPool.address);
      await usdcToken1.allowance(this.accounts.admin1, this.oddzLiquidityPool.address);
      await usdcToken.transfer(this.accounts.admin, totalSupply * 0.1);
      await usdcToken.transfer(this.accounts.admin1, totalSupply * 0.1);
    });
    shouldBehaveLikeOddzLiquidityPool();
  });
});
