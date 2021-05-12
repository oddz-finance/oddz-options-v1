import { Signer } from "@ethersproject/abstract-signer";
import { ethers, waffle } from "hardhat";

import OddzStakingManagerArtifact from "../artifacts/contracts/Staking/OddzStakingManager.sol/OddzStakingManager.json";
import OddzTokenStakingArtifact from "../artifacts/contracts/Staking/OddzTokenStaking.sol/OddzTokenStaking.json";
import ODevTokenStakingArtifact from "../artifacts/contracts/Staking/ODevTokenStaking.sol/ODevTokenStaking.json";
import OUsdTokenStakingArtifact from "../artifacts/contracts/Staking/OUsdTokenStaking.sol/OUsdTokenStaking.json";
import MockERC20Artifact from "../artifacts/contracts/Mocks/MockERC20.sol/MockERC20.json";

import { Accounts, Signers } from "../types";
import { MockProvider } from "ethereum-waffle";
const { deployContract } = waffle;
import { OddzStakingManager, OddzTokenStaking, OUsdTokenStaking, ODevTokenStaking, MockERC20 } from "../typechain";
import { shouldBehaveLikeOddzStakingManager } from "./behaviors/OddzStakingManager.behavior";
import { BigNumber, utils } from "ethers";
import { getExpiry } from "../test-utils";

describe("Oddz Staking Manager Unit tests", function () {
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

  describe("Oddz Staking Manager", function () {
    beforeEach(async function () {
      const totalSupply = BigNumber.from(utils.parseEther("100000000"));
      this.usdcToken = (await deployContract(this.signers.admin, MockERC20Artifact, [
        "USD coin",
        "USDC",
        totalSupply,
      ])) as MockERC20;

      this.oddzToken = (await deployContract(this.signers.admin, MockERC20Artifact, [
        "oddz coin",
        "ODDZ",
        totalSupply,
      ])) as MockERC20;

      this.oUsdToken = (await deployContract(this.signers.admin, MockERC20Artifact, [
        "oUsd coin",
        "oUsd",
        totalSupply,
      ])) as MockERC20;

      this.oDevToken = (await deployContract(this.signers.admin, MockERC20Artifact, [
        "oDev coin",
        "oDev",
        totalSupply,
      ])) as MockERC20;

      this.oddzStakingManager = (await deployContract(this.signers.admin, OddzStakingManagerArtifact, [
        this.usdcToken.address,
      ])) as OddzStakingManager;

      this.oddzTokenStaking = (await deployContract(
        this.signers.admin,
        OddzTokenStakingArtifact,
        [],
      )) as OddzTokenStaking;

      this.oUsdTokenStaking = (await deployContract(
        this.signers.admin,
        OUsdTokenStakingArtifact,
        [],
      )) as OUsdTokenStaking;

      this.oDevTokenStaking = (await deployContract(
        this.signers.admin,
        ODevTokenStakingArtifact,
        [],
      )) as ODevTokenStaking;

      await this.oddzTokenStaking.transferOwnership(this.oddzStakingManager.address);
      await this.oUsdTokenStaking.transferOwnership(this.oddzStakingManager.address);
      await this.oDevTokenStaking.transferOwnership(this.oddzStakingManager.address);

      await this.oddzStakingManager.addToken(
        utils.formatBytes32String("ODDZ"),
        this.oddzToken.address,
        this.oddzTokenStaking.address,
        getExpiry(1),
        getExpiry(1),
        50,
        70,
      );
      await this.oddzStakingManager.addToken(
        utils.formatBytes32String("oUsd"),
        this.oUsdToken.address,
        this.oUsdTokenStaking.address,
        getExpiry(1),
        getExpiry(1),
        30,
        30,
      );
      await this.oddzStakingManager.addToken(
        utils.formatBytes32String("oDev"),
        this.oDevToken.address,
        this.oDevTokenStaking.address,
        getExpiry(1),
        getExpiry(1),
        20,
        0,
      );
    });

    shouldBehaveLikeOddzStakingManager();
  });
});
