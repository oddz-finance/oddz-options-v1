import { Signer } from "@ethersproject/abstract-signer";
import { ethers, waffle } from "hardhat";
import { Accounts, Signers } from "../types";
import {
  OddzLiquidityPoolManager,
  OddzDefaultPool,
  MockERC20,
  DexManager,
  OddzAssetManager,
  MockOptionManager,
  MockOddzDex,
} from "../typechain";
import { shouldBehaveLikeOddzLiquidityPool } from "./behaviors/OddzLiquidityPool.behavior";
import { MockProvider } from "ethereum-waffle";
import OddzLiquidityPoolManagerArtifact from "../artifacts/contracts/Pool/OddzLiquidityPoolManager.sol/OddzLiquidityPoolManager.json";
import OddzDefaultPoolArtifact from "../artifacts/contracts/Pool/OddzDefaultPool.sol/OddzDefaultPool.json";
import MockERC20Artifact from "../artifacts/contracts/Mocks/MockERC20.sol/MockERC20.json";
import MockOddzDexArtifact from "../artifacts/contracts/Mocks/MockOddzDex.sol/MockOddzDex.json";
import MockOptionManagerArtifact from "../artifacts/contracts/Mocks/MockOptionManager.sol/MockOptionManager.json";
import OddzAssetManagerArtifact from "../artifacts/contracts/Option/OddzAssetManager.sol/OddzAssetManager.json";
import DexManagerArtifact from "../artifacts/contracts/Swap/DexManager.sol/DexManager.json";
import { BigNumber, utils } from "ethers";
import { OptionType } from "../test-utils";

const { deployContract } = waffle;

describe("Oddz Liquidity Pool Unit tests", function () {
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
      this.oddzAssetManager = (await deployContract(
        this.signers.admin,
        OddzAssetManagerArtifact,
        [],
      )) as OddzAssetManager;

      const totalSupply = "100000000";
      this.transferTokenAmout = "10000000";
      this.usdcToken = (await deployContract(this.signers.admin, MockERC20Artifact, [
        "USD coin",
        "USDC",
        BigNumber.from(utils.parseEther(totalSupply)),
      ])) as MockERC20;

      const ethToken = (await deployContract(this.signers.admin, MockERC20Artifact, [
        "Eth Token",
        "ETH",
        totalSupply,
      ])) as MockERC20;

      await this.oddzAssetManager.addAsset(utils.formatBytes32String("ETH"), ethToken.address, 8);
      await this.oddzAssetManager.addAsset(utils.formatBytes32String("USD"), this.usdcToken.address, 8);

      const mockOddzDex = (await deployContract(this.signers.admin, MockOddzDexArtifact, [])) as MockOddzDex;

      this.dexManager = (await deployContract(this.signers.admin, DexManagerArtifact, [
        this.oddzAssetManager.address,
      ])) as DexManager;

      await this.dexManager.addExchange(
        utils.formatBytes32String("ETH"),
        utils.formatBytes32String("USD"),
        mockOddzDex.address,
      );

      const hash = utils.keccak256(
        utils.defaultAbiCoder.encode(
          ["bytes32", "bytes32", "address"],
          [utils.formatBytes32String("ETH"), utils.formatBytes32String("USD"), mockOddzDex.address],
        ),
      );

      await this.dexManager.setActiveExchange(hash);

      this.usdcToken = await this.usdcToken.connect(this.signers.admin);
      const usdcToken1 = await this.usdcToken.connect(this.signers.admin1);

      this.oddzDefaultPool = (await deployContract(this.signers.admin, OddzDefaultPoolArtifact, [])) as OddzDefaultPool;

      this.oddzLiquidityPoolManager = (await deployContract(this.signers.admin, OddzLiquidityPoolManagerArtifact, [
        this.usdcToken.address,
        this.dexManager.address,
      ])) as OddzLiquidityPoolManager;
      this.dexManager.setSwapper(this.oddzLiquidityPoolManager.address);

      this.mockOptionManager = (await deployContract(this.signers.admin, MockOptionManagerArtifact, [
        this.oddzLiquidityPoolManager.address,
      ])) as MockOptionManager;

      await this.usdcToken.approve(
        this.oddzLiquidityPoolManager.address,
        BigNumber.from(utils.parseEther(totalSupply)),
      );
      await usdcToken1.approve(this.oddzLiquidityPoolManager.address, BigNumber.from(utils.parseEther(totalSupply)));
      await this.usdcToken.allowance(this.accounts.admin, this.oddzLiquidityPoolManager.address);
      await usdcToken1.allowance(this.accounts.admin1, this.oddzLiquidityPoolManager.address);
      await this.usdcToken.transfer(this.accounts.admin, BigNumber.from(utils.parseEther(this.transferTokenAmout)));
      await this.usdcToken.transfer(this.accounts.admin1, BigNumber.from(utils.parseEther(this.transferTokenAmout)));

      await this.oddzDefaultPool.setManager(this.oddzLiquidityPoolManager.address);
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
    shouldBehaveLikeOddzLiquidityPool();
  });
});
