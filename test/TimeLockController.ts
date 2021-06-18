import { Signer } from "@ethersproject/abstract-signer";
import { ethers, waffle } from "hardhat";
import OddzStakingManagerArtifact from "../artifacts/contracts/Staking/OddzStakingManager.sol/OddzStakingManager.json";
import OddzSDKArtifact from "../artifacts/contracts/OddzSDK.sol/OddzSDK.json";
import OddzAssetManagerArtifact from "../artifacts/contracts/Option/OddzAssetManager.sol/OddzAssetManager.json";
import OddzAdministratorArtifact from "../artifacts/contracts/OddzAdministrator.sol/OddzAdministrator.json";
import DexManagerArtifact from "../artifacts/contracts/Swap/DexManager.sol/DexManager.json";
import TimeLockControllerArtifact from "../artifacts/contracts/TimeLockController.sol/TimelockController.json";
import { Accounts, Signers } from "../types";

import {
  MockERC20,
  OddzStakingManager,
  DexManager,
  OddzAssetManager,
  OddzSDK,
  OddzAdministrator,
  TimelockController,
} from "../typechain";
import { shouldBehaveLikeTimeLockController } from "./behaviors/TimeLockController.behavior";
import { MockProvider } from "ethereum-waffle";
import { BigNumber, utils } from "ethers";
import MockERC20Artifact from "../artifacts/contracts/Mocks/MockERC20.sol/MockERC20.json";

const { deployContract } = waffle;

describe("TimeLocker Controller Unit tests", function () {
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

  describe("TimeLocker Controller", function () {
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

      this.oddzStaking = (await deployContract(this.signers.admin, OddzStakingManagerArtifact, [
        this.oddzToken.address,
      ])) as OddzStakingManager;

      const bscForwarder = "0x61456BF1715C1415730076BB79ae118E806E74d2";

      this.oddzSDK = (await deployContract(this.signers.admin, OddzSDKArtifact, [
        this.oddzToken.address, // just to test
        bscForwarder,
        this.oddzToken.address,
      ])) as OddzSDK;
      this.oddzAdministratorAbi = OddzAdministratorArtifact.abi;
      this.oddzAdministrator = (await deployContract(this.signers.admin, OddzAdministratorArtifact, [
        this.usdcToken.address,
        this.oddzToken.address,
        this.oddzStaking.address,
        this.oddzSDK.address,
        this.accounts.admin,
        this.accounts.admin1,
        this.dexManager.address,
      ])) as OddzAdministrator;

      this.timeLockController = (await deployContract(this.signers.admin, TimeLockControllerArtifact, [
        10,
        [this.accounts.admin1],
        [this.accounts.admin1],
      ])) as TimelockController;
      this.oddzAdministrator.removeExecutor(this.accounts.admin);
      this.oddzAdministrator.setExecutor(this.timeLockController.address);
    });

    shouldBehaveLikeTimeLockController();
  });
});
