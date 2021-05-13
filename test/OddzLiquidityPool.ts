import { Signer } from "@ethersproject/abstract-signer";
import { ethers, waffle } from "hardhat";
import { Accounts, Signers } from "../types";
import {
  OddzLiquidityPoolManager,
  OddzDefaultPool,
  OddzEthUsdCallBS1Pool,
  OddzEthUsdCallBS2Pool,
  OddzEthUsdCallBS7Pool,
  OddzEthUsdCallBS14Pool,
  OddzEthUsdCallBS30Pool,
  OddzEthUsdPutBS1Pool,
  OddzEthUsdPutBS2Pool,
  OddzEthUsdPutBS7Pool,
  OddzEthUsdPutBS14Pool,
  OddzEthUsdPutBS30Pool,
  OddzBtcUsdCallBS1Pool,
  OddzBtcUsdCallBS2Pool,
  OddzBtcUsdCallBS7Pool,
  OddzBtcUsdCallBS14Pool,
  OddzBtcUsdCallBS30Pool,
  OddzBtcUsdPutBS1Pool,
  OddzBtcUsdPutBS2Pool,
  OddzBtcUsdPutBS7Pool,
  OddzBtcUsdPutBS14Pool,
  OddzBtcUsdPutBS30Pool,
  MockERC20,
  DexManager,
  OddzAssetManager,
  MockOptionManager,
  MockOddzDex,
} from "../typechain";
import { shouldBehaveLikeOddzLiquidityPool } from "./behaviors/OddzLiquidityPool.behavior";
import { MockProvider } from "ethereum-waffle";
import OddzLiquidityPoolManagerArtifact from "../artifacts/contracts/Pool/OddzLiquidityPoolManager.sol/OddzLiquidityPoolManager.json";
import OddzDefaultPoolArtifact from "../artifacts/contracts/Pool/OddzPools.sol/OddzDefaultPool.json";
import OddzEthUsdCallBS1PoolArtifact from "../artifacts/contracts/Pool/OddzPools.sol/OddzEthUsdCallBS1Pool.json";
import OddzEthUsdCallBS2PoolArtifact from "../artifacts/contracts/Pool/OddzPools.sol/OddzEthUsdCallBS2Pool.json";
import OddzEthUsdCallBS7PoolArtifact from "../artifacts/contracts/Pool/OddzPools.sol/OddzEthUsdCallBS7Pool.json";
import OddzEthUsdCallBS14PoolArtifact from "../artifacts/contracts/Pool/OddzPools.sol/OddzEthUsdCallBS14Pool.json";
import OddzEthUsdCallBS30PoolArtifact from "../artifacts/contracts/Pool/OddzPools.sol/OddzEthUsdPutBS30Pool.json";
import OddzEthUsdPutBS1PoolArtifact from "../artifacts/contracts/Pool/OddzPools.sol/OddzEthUsdPutBS1Pool.json";
import OddzEthUsdPutBS2PoolArtifact from "../artifacts/contracts/Pool/OddzPools.sol/OddzEthUsdPutBS2Pool.json";
import OddzEthUsdPutBS7PoolArtifact from "../artifacts/contracts/Pool/OddzPools.sol/OddzEthUsdPutBS7Pool.json";
import OddzEthUsdPutBS14PoolArtifact from "../artifacts/contracts/Pool/OddzPools.sol/OddzEthUsdPutBS14Pool.json";
import OddzEthUsdPutBS30PoolArtifact from "../artifacts/contracts/Pool/OddzPools.sol/OddzEthUsdPutBS30Pool.json";
import OddzBtcUsdCallBS1PoolArtifact from "../artifacts/contracts/Pool/OddzPools.sol/OddzBtcUsdCallBS1Pool.json";
import OddzBtcUsdCallBS2PoolArtifact from "../artifacts/contracts/Pool/OddzPools.sol/OddzBtcUsdCallBS2Pool.json";
import OddzBtcUsdCallBS7PoolArtifact from "../artifacts/contracts/Pool/OddzPools.sol/OddzBtcUsdCallBS7Pool.json";
import OddzBtcUsdCallBS14PoolArtifact from "../artifacts/contracts/Pool/OddzPools.sol/OddzBtcUsdCallBS14Pool.json";
import OddzBtcUsdCallBS30PoolArtifact from "../artifacts/contracts/Pool/OddzPools.sol/OddzBtcUsdCallBS30Pool.json";
import OddzBtcUsdPutBS1PoolArtifact from "../artifacts/contracts/Pool/OddzPools.sol/OddzBtcUsdPutBS1Pool.json";
import OddzBtcUsdPutBS2PoolArtifact from "../artifacts/contracts/Pool/OddzPools.sol/OddzBtcUsdPutBS2Pool.json";
import OddzBtcUsdPutBS7PoolArtifact from "../artifacts/contracts/Pool/OddzPools.sol/OddzBtcUsdPutBS7Pool.json";
import OddzBtcUsdPutBS14PoolArtifact from "../artifacts/contracts/Pool/OddzPools.sol/OddzBtcUsdPutBS14Pool.json";
import OddzBtcUsdPutBS30PoolArtifact from "../artifacts/contracts/Pool/OddzPools.sol/OddzBtcUsdPutBS30Pool.json";
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

      // ETHUSD Call
      this.oddzEthUsdCallBS1Pool = (await deployContract(
        this.signers.admin,
        OddzEthUsdCallBS1PoolArtifact,
        [],
      )) as OddzEthUsdCallBS1Pool;
      this.oddzEthUsdCallBS2Pool = (await deployContract(
        this.signers.admin,
        OddzEthUsdCallBS2PoolArtifact,
        [],
      )) as OddzEthUsdCallBS2Pool;
      this.oddzEthUsdCallBS7Pool = (await deployContract(
        this.signers.admin,
        OddzEthUsdCallBS7PoolArtifact,
        [],
      )) as OddzEthUsdCallBS7Pool;
      this.oddzEthUsdCallBS14Pool = (await deployContract(
        this.signers.admin,
        OddzEthUsdCallBS14PoolArtifact,
        [],
      )) as OddzEthUsdCallBS14Pool;
      this.oddzEthUsdCallBS30Pool = (await deployContract(
        this.signers.admin,
        OddzEthUsdCallBS30PoolArtifact,
        [],
      )) as OddzEthUsdCallBS30Pool;

      // ETHUSD Put
      this.oddzEthUsdPutBS1Pool = (await deployContract(
        this.signers.admin,
        OddzEthUsdPutBS1PoolArtifact,
        [],
      )) as OddzEthUsdPutBS1Pool;
      this.oddzEthUsdPutBS2Pool = (await deployContract(
        this.signers.admin,
        OddzEthUsdPutBS2PoolArtifact,
        [],
      )) as OddzEthUsdPutBS2Pool;
      this.oddzEthUsdPutBS7Pool = (await deployContract(
        this.signers.admin,
        OddzEthUsdPutBS7PoolArtifact,
        [],
      )) as OddzEthUsdPutBS7Pool;
      this.oddzEthUsdPutBS14Pool = (await deployContract(
        this.signers.admin,
        OddzEthUsdPutBS14PoolArtifact,
        [],
      )) as OddzEthUsdPutBS14Pool;
      this.oddzEthUsdPutBS30Pool = (await deployContract(
        this.signers.admin,
        OddzEthUsdPutBS30PoolArtifact,
        [],
      )) as OddzEthUsdPutBS30Pool;

      // BTCUSD Call
      this.oddzBtcUsdCallBS1Pool = (await deployContract(
        this.signers.admin,
        OddzBtcUsdCallBS1PoolArtifact,
        [],
      )) as OddzBtcUsdCallBS1Pool;
      this.oddzBtcUsdCallBS2Pool = (await deployContract(
        this.signers.admin,
        OddzBtcUsdCallBS2PoolArtifact,
        [],
      )) as OddzBtcUsdCallBS2Pool;
      this.oddzBtcUsdCallBS7Pool = (await deployContract(
        this.signers.admin,
        OddzBtcUsdCallBS7PoolArtifact,
        [],
      )) as OddzBtcUsdCallBS7Pool;
      this.oddzBtcUsdCallBS14Pool = (await deployContract(
        this.signers.admin,
        OddzBtcUsdCallBS14PoolArtifact,
        [],
      )) as OddzBtcUsdCallBS14Pool;
      this.oddzBtcUsdCallBS30Pool = (await deployContract(
        this.signers.admin,
        OddzBtcUsdCallBS30PoolArtifact,
        [],
      )) as OddzBtcUsdCallBS30Pool;

      // BTCUSD Put
      this.oddzBtcUsdPutBS1Pool = (await deployContract(
        this.signers.admin,
        OddzBtcUsdPutBS1PoolArtifact,
        [],
      )) as OddzBtcUsdPutBS1Pool;
      this.oddzBtcUsdPutBS2Pool = (await deployContract(
        this.signers.admin,
        OddzBtcUsdPutBS2PoolArtifact,
        [],
      )) as OddzBtcUsdPutBS2Pool;
      this.oddzBtcUsdPutBS7Pool = (await deployContract(
        this.signers.admin,
        OddzBtcUsdPutBS7PoolArtifact,
        [],
      )) as OddzBtcUsdPutBS7Pool;
      this.oddzBtcUsdPutBS14Pool = (await deployContract(
        this.signers.admin,
        OddzBtcUsdPutBS14PoolArtifact,
        [],
      )) as OddzBtcUsdPutBS14Pool;
      this.oddzBtcUsdPutBS30Pool = (await deployContract(
        this.signers.admin,
        OddzBtcUsdPutBS30PoolArtifact,
        [],
      )) as OddzBtcUsdPutBS30Pool;

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

      await this.oddzDefaultPool.transferOwnership(this.oddzLiquidityPoolManager.address);
      await this.oddzEthUsdCallBS1Pool.transferOwnership(this.oddzLiquidityPoolManager.address);
      await this.oddzEthUsdCallBS2Pool.transferOwnership(this.oddzLiquidityPoolManager.address);
      await this.oddzEthUsdCallBS7Pool.transferOwnership(this.oddzLiquidityPoolManager.address);
      await this.oddzEthUsdCallBS14Pool.transferOwnership(this.oddzLiquidityPoolManager.address);
      await this.oddzEthUsdCallBS30Pool.transferOwnership(this.oddzLiquidityPoolManager.address);
      await this.oddzEthUsdPutBS1Pool.transferOwnership(this.oddzLiquidityPoolManager.address);
      await this.oddzEthUsdPutBS2Pool.transferOwnership(this.oddzLiquidityPoolManager.address);
      await this.oddzEthUsdPutBS7Pool.transferOwnership(this.oddzLiquidityPoolManager.address);
      await this.oddzEthUsdPutBS14Pool.transferOwnership(this.oddzLiquidityPoolManager.address);
      await this.oddzEthUsdPutBS30Pool.transferOwnership(this.oddzLiquidityPoolManager.address);
      await this.oddzBtcUsdCallBS1Pool.transferOwnership(this.oddzLiquidityPoolManager.address);
      await this.oddzBtcUsdCallBS2Pool.transferOwnership(this.oddzLiquidityPoolManager.address);
      await this.oddzBtcUsdCallBS7Pool.transferOwnership(this.oddzLiquidityPoolManager.address);
      await this.oddzBtcUsdCallBS14Pool.transferOwnership(this.oddzLiquidityPoolManager.address);
      await this.oddzBtcUsdCallBS30Pool.transferOwnership(this.oddzLiquidityPoolManager.address);
      await this.oddzBtcUsdPutBS1Pool.transferOwnership(this.oddzLiquidityPoolManager.address);
      await this.oddzBtcUsdPutBS2Pool.transferOwnership(this.oddzLiquidityPoolManager.address);
      await this.oddzBtcUsdPutBS7Pool.transferOwnership(this.oddzLiquidityPoolManager.address);
      await this.oddzBtcUsdPutBS14Pool.transferOwnership(this.oddzLiquidityPoolManager.address);
      await this.oddzBtcUsdPutBS30Pool.transferOwnership(this.oddzLiquidityPoolManager.address);

      // ETH Call
      await this.oddzLiquidityPoolManager
        .connect(this.signers.admin)
        .mapPool("0xfcb06d25357ef01726861b30b0b83e51482db417", OptionType.Call, utils.formatBytes32String("B_S"), 1, [
          this.oddzDefaultPool.address,
          this.oddzEthUsdCallBS1Pool.address,
          this.oddzEthUsdCallBS2Pool.address,
          this.oddzEthUsdCallBS7Pool.address,
          this.oddzEthUsdCallBS14Pool.address,
          this.oddzEthUsdCallBS30Pool.address,
        ]);
      await this.oddzLiquidityPoolManager
        .connect(this.signers.admin)
        .mapPool("0xfcb06d25357ef01726861b30b0b83e51482db417", OptionType.Call, utils.formatBytes32String("B_S"), 2, [
          this.oddzDefaultPool.address,
          this.oddzEthUsdCallBS2Pool.address,
          this.oddzEthUsdCallBS7Pool.address,
          this.oddzEthUsdCallBS14Pool.address,
          this.oddzEthUsdCallBS30Pool.address,
        ]);
      await this.oddzLiquidityPoolManager
        .connect(this.signers.admin)
        .mapPool("0xfcb06d25357ef01726861b30b0b83e51482db417", OptionType.Call, utils.formatBytes32String("B_S"), 7, [
          this.oddzDefaultPool.address,
          this.oddzEthUsdCallBS7Pool.address,
          this.oddzEthUsdCallBS14Pool.address,
          this.oddzEthUsdCallBS30Pool.address,
        ]);
      await this.oddzLiquidityPoolManager
        .connect(this.signers.admin)
        .mapPool("0xfcb06d25357ef01726861b30b0b83e51482db417", OptionType.Call, utils.formatBytes32String("B_S"), 14, [
          this.oddzDefaultPool.address,
          this.oddzEthUsdCallBS14Pool.address,
          this.oddzEthUsdCallBS30Pool.address,
        ]);
      await this.oddzLiquidityPoolManager
        .connect(this.signers.admin)
        .mapPool("0xfcb06d25357ef01726861b30b0b83e51482db417", OptionType.Call, utils.formatBytes32String("B_S"), 30, [
          this.oddzDefaultPool.address,
          this.oddzEthUsdCallBS30Pool.address,
        ]);

      // ETH Put
      await this.oddzLiquidityPoolManager
        .connect(this.signers.admin)
        .mapPool("0xfcb06d25357ef01726861b30b0b83e51482db417", OptionType.Put, utils.formatBytes32String("B_S"), 1, [
          this.oddzDefaultPool.address,
          this.oddzEthUsdPutBS1Pool.address,
          this.oddzEthUsdPutBS2Pool.address,
          this.oddzEthUsdPutBS7Pool.address,
          this.oddzEthUsdPutBS14Pool.address,
          this.oddzEthUsdPutBS30Pool.address,
        ]);
      await this.oddzLiquidityPoolManager
        .connect(this.signers.admin)
        .mapPool("0xfcb06d25357ef01726861b30b0b83e51482db417", OptionType.Put, utils.formatBytes32String("B_S"), 2, [
          this.oddzDefaultPool.address,
          this.oddzEthUsdPutBS2Pool.address,
          this.oddzEthUsdPutBS7Pool.address,
          this.oddzEthUsdPutBS14Pool.address,
          this.oddzEthUsdPutBS30Pool.address,
        ]);
      await this.oddzLiquidityPoolManager
        .connect(this.signers.admin)
        .mapPool("0xfcb06d25357ef01726861b30b0b83e51482db417", OptionType.Put, utils.formatBytes32String("B_S"), 7, [
          this.oddzDefaultPool.address,
          this.oddzEthUsdPutBS7Pool.address,
          this.oddzEthUsdPutBS14Pool.address,
          this.oddzEthUsdPutBS30Pool.address,
        ]);
      await this.oddzLiquidityPoolManager
        .connect(this.signers.admin)
        .mapPool("0xfcb06d25357ef01726861b30b0b83e51482db417", OptionType.Put, utils.formatBytes32String("B_S"), 14, [
          this.oddzDefaultPool.address,
          this.oddzEthUsdPutBS14Pool.address,
          this.oddzEthUsdPutBS30Pool.address,
        ]);
      await this.oddzLiquidityPoolManager
        .connect(this.signers.admin)
        .mapPool("0xfcb06d25357ef01726861b30b0b83e51482db417", OptionType.Put, utils.formatBytes32String("B_S"), 30, [
          this.oddzDefaultPool.address,
          this.oddzEthUsdPutBS30Pool.address,
        ]);

      // BTC Call
      await this.oddzLiquidityPoolManager
        .connect(this.signers.admin)
        .mapPool("0x8c461e897bBE3E4DDf8FD25be25f91Aac161a2f0", OptionType.Call, utils.formatBytes32String("B_S"), 1, [
          this.oddzDefaultPool.address,
          this.oddzBtcUsdCallBS1Pool.address,
          this.oddzBtcUsdCallBS2Pool.address,
          this.oddzBtcUsdCallBS7Pool.address,
          this.oddzBtcUsdCallBS14Pool.address,
          this.oddzBtcUsdCallBS30Pool.address,
        ]);
      await this.oddzLiquidityPoolManager
        .connect(this.signers.admin)
        .mapPool("0x8c461e897bBE3E4DDf8FD25be25f91Aac161a2f0", OptionType.Call, utils.formatBytes32String("B_S"), 2, [
          this.oddzDefaultPool.address,
          this.oddzBtcUsdCallBS2Pool.address,
          this.oddzBtcUsdCallBS7Pool.address,
          this.oddzBtcUsdCallBS14Pool.address,
          this.oddzBtcUsdCallBS30Pool.address,
        ]);
      await this.oddzLiquidityPoolManager
        .connect(this.signers.admin)
        .mapPool("0x8c461e897bBE3E4DDf8FD25be25f91Aac161a2f0", OptionType.Call, utils.formatBytes32String("B_S"), 7, [
          this.oddzDefaultPool.address,
          this.oddzBtcUsdCallBS7Pool.address,
          this.oddzBtcUsdCallBS14Pool.address,
          this.oddzBtcUsdCallBS30Pool.address,
        ]);
      await this.oddzLiquidityPoolManager
        .connect(this.signers.admin)
        .mapPool("0x8c461e897bBE3E4DDf8FD25be25f91Aac161a2f0", OptionType.Call, utils.formatBytes32String("B_S"), 14, [
          this.oddzDefaultPool.address,
          this.oddzBtcUsdCallBS14Pool.address,
          this.oddzBtcUsdCallBS30Pool.address,
        ]);
      await this.oddzLiquidityPoolManager
        .connect(this.signers.admin)
        .mapPool("0x8c461e897bBE3E4DDf8FD25be25f91Aac161a2f0", OptionType.Call, utils.formatBytes32String("B_S"), 30, [
          this.oddzDefaultPool.address,
          this.oddzBtcUsdCallBS30Pool.address,
        ]);

      // BTC Put
      await this.oddzLiquidityPoolManager
        .connect(this.signers.admin)
        .mapPool("0x8c461e897bBE3E4DDf8FD25be25f91Aac161a2f0", OptionType.Put, utils.formatBytes32String("B_S"), 1, [
          this.oddzDefaultPool.address,
          this.oddzBtcUsdPutBS1Pool.address,
          this.oddzBtcUsdPutBS2Pool.address,
          this.oddzBtcUsdPutBS7Pool.address,
          this.oddzBtcUsdPutBS14Pool.address,
          this.oddzBtcUsdPutBS30Pool.address,
        ]);
      await this.oddzLiquidityPoolManager
        .connect(this.signers.admin)
        .mapPool("0x8c461e897bBE3E4DDf8FD25be25f91Aac161a2f0", OptionType.Put, utils.formatBytes32String("B_S"), 2, [
          this.oddzDefaultPool.address,
          this.oddzBtcUsdPutBS2Pool.address,
          this.oddzBtcUsdPutBS7Pool.address,
          this.oddzBtcUsdPutBS14Pool.address,
          this.oddzBtcUsdPutBS30Pool.address,
        ]);
      await this.oddzLiquidityPoolManager
        .connect(this.signers.admin)
        .mapPool("0x8c461e897bBE3E4DDf8FD25be25f91Aac161a2f0", OptionType.Put, utils.formatBytes32String("B_S"), 7, [
          this.oddzDefaultPool.address,
          this.oddzBtcUsdPutBS7Pool.address,
          this.oddzBtcUsdPutBS14Pool.address,
          this.oddzBtcUsdPutBS30Pool.address,
        ]);
      await this.oddzLiquidityPoolManager
        .connect(this.signers.admin)
        .mapPool("0x8c461e897bBE3E4DDf8FD25be25f91Aac161a2f0", OptionType.Put, utils.formatBytes32String("B_S"), 14, [
          this.oddzDefaultPool.address,
          this.oddzBtcUsdPutBS14Pool.address,
          this.oddzBtcUsdPutBS30Pool.address,
        ]);
      await this.oddzLiquidityPoolManager
        .connect(this.signers.admin)
        .mapPool("0x8c461e897bBE3E4DDf8FD25be25f91Aac161a2f0", OptionType.Put, utils.formatBytes32String("B_S"), 30, [
          this.oddzDefaultPool.address,
          this.oddzBtcUsdPutBS30Pool.address,
        ]);
    });
    shouldBehaveLikeOddzLiquidityPool();
  });
});
