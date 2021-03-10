import { Signer } from "@ethersproject/abstract-signer";
import { ethers, waffle } from "hardhat";
import OddzOptionManagerArtifact from "../artifacts/contracts/Option/OddzOptionManager.sol/OddzOptionManager.json";
import OddzPriceOracleManagerArtifact from "../artifacts/contracts/Oracle/OddzPriceOracleManager.sol/OddzPriceOracleManager.json";
import MockOddzPriceOracleArtifact from "../artifacts/contracts/Mocks/MockOddzPriceOracle.sol/MockOddzPriceOracle.json";
import MockOddzVolatilityArtifact from "../artifacts/contracts/Mocks/MockOddzVolatility.sol/MockOddzVolatility.json";
import MockOddzStakingArtifact from "../artifacts/contracts/Mocks/MockOddzStaking.sol/MockOddzStaking.json";
import PancakeSwapForUnderlyingAssetArtifact from "../artifacts/contracts/Integrations/Dex/PancakeSwap/PancakeSwapForUnderlyingAsset.sol/PancakeSwapForUnderlyingAsset.json";
import DexManagerArtifact from "../artifacts/contracts/Swap/DexManager.sol/DexManager.json";
import UniswapV2FactoryArtifact from "../mockSwap_artifacts/core/contracts/UniswapV2Factory.sol/UniswapV2Factory.json";
import WETHArtifact from "../mockSwap_artifacts/periphery/contracts/WETH.sol/WETH.json";
import UniswapV2Router02Artifact from "../mockSwap_artifacts/periphery/contracts/UniswapV2Router02.sol/UniswapV2Router02.json";

import { Accounts, Signers } from "../types";

import {
  OddzOptionManager,
  MockOddzPriceOracle,
  MockOddzVolatility,
  MockOddzStaking,
  OddzToken,
  OddzLiquidityPool,
  OddzPriceOracleManager,
  PancakeSwapForUnderlyingAsset,
  DexManager,
} from "../typechain";
import { shouldBehaveLikeOddzOptionManager } from "./behaviors/OddzOptionManager.behavior";
import { MockProvider } from "ethereum-waffle";
import { BigNumber, utils } from "ethers";
import OddzLiquidityPoolArtifact from "../artifacts/contracts/Pool/OddzLiquidityPool.sol/OddzLiquidityPool.json";
import OddzTokenArtifact from "../artifacts/contracts/OddzToken.sol/OddzToken.json";

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

  describe("Oddz Option Manager", function () {
    beforeEach(async function () {
      this.uniswapFactory = await deployContract(this.signers.admin, UniswapV2FactoryArtifact, [this.accounts.admin]);

      const WETH = await deployContract(this.signers.admin, WETHArtifact, []);

      this.uniswapRouter = await deployContract(this.signers.admin, UniswapV2Router02Artifact, [
        this.uniswapFactory.address,
        WETH.address,
      ]);

      this.pancakeSwapForUnderlyingAsset = (await deployContract(
        this.signers.admin,
        PancakeSwapForUnderlyingAssetArtifact,
        [this.uniswapRouter.address],
      )) as PancakeSwapForUnderlyingAsset;

      this.dexManager = (await deployContract(this.signers.admin, DexManagerArtifact, [])) as DexManager;

      this.oddzPriceOracle = (await deployContract(this.signers.admin, MockOddzPriceOracleArtifact, [
        BigNumber.from(161200000000),
      ])) as MockOddzPriceOracle;

      this.oddzPriceOracleManager = (await deployContract(
        this.signers.admin,
        OddzPriceOracleManagerArtifact,
        [],
      )) as OddzPriceOracleManager;
      await this.oddzPriceOracle.transferOwnership(this.oddzPriceOracleManager.address);

      const oddzVolatility = (await deployContract(
        this.signers.admin,
        MockOddzVolatilityArtifact,
      )) as MockOddzVolatility;
      const oddzStaking = (await deployContract(this.signers.admin, MockOddzStakingArtifact)) as MockOddzStaking;

      const totalSupply = BigNumber.from(utils.parseEther("100000000"));
      this.usdcToken = (await deployContract(this.signers.admin, OddzTokenArtifact, [
        "USD coin",
        "USDC",
        totalSupply,
      ])) as OddzToken;

      // USDC prod address 0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48
      this.oddzLiquidityPool = (await deployContract(this.signers.admin, OddzLiquidityPoolArtifact, [
        this.usdcToken.address,
        this.dexManager.address,
      ])) as OddzLiquidityPool;
      this.oddzOptionManager = (await deployContract(this.signers.admin, OddzOptionManagerArtifact, [
        this.oddzPriceOracleManager.address,
        oddzVolatility.address,
        oddzStaking.address,
        this.oddzLiquidityPool.address,
        this.usdcToken.address,
      ])) as OddzOptionManager;
      await this.oddzLiquidityPool.transferOwnership(this.oddzOptionManager.address);

      const usdcToken = await this.usdcToken.connect(this.signers.admin);
      const usdcToken1 = await this.usdcToken.connect(this.signers.admin1);

      // Allow for liquidty pool
      await usdcToken.approve(this.oddzLiquidityPool.address, totalSupply);
      await usdcToken1.approve(this.oddzLiquidityPool.address, totalSupply);
      await usdcToken.allowance(this.accounts.admin, this.oddzLiquidityPool.address);
      await usdcToken1.allowance(this.accounts.admin1, this.oddzLiquidityPool.address);

      // Allow for option manager
      await usdcToken.approve(this.oddzOptionManager.address, totalSupply);
      await usdcToken1.approve(this.oddzOptionManager.address, totalSupply);
      await usdcToken.allowance(this.accounts.admin, this.oddzOptionManager.address);
      await usdcToken1.allowance(this.accounts.admin1, this.oddzOptionManager.address);

      // transfer required balance
      await usdcToken.transfer(this.accounts.admin, totalSupply.div(3));
      await usdcToken.transfer(this.accounts.admin1, totalSupply.div(3));
    });
    shouldBehaveLikeOddzOptionManager();
  });
});
