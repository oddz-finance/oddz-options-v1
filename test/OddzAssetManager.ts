import { Signer } from "@ethersproject/abstract-signer";
import { ethers, waffle } from "hardhat";
import OddzAssetManagerArtifact from "../artifacts/contracts/Option/OddzAssetManager.sol/OddzAssetManager.json";
import MockERC20Artifact from "../artifacts/contracts/Mocks/MockERC20.sol/MockERC20.json";
import { Accounts, Signers } from "../types";
import { OddzAssetManager, MockERC20 } from "../typechain";
import { shouldBehaveLikeOddzAssetManager } from "./behaviors/OddzAssetManager.behavior";
import { MockProvider } from "ethereum-waffle";

const { deployContract } = waffle;

describe("Oddz Asset Manager Unit tests", function () {
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

  describe("Oddz Asset Manager", function () {
    beforeEach(async function () {
      this.oddzAssetManager = (await deployContract(
        this.signers.admin,
        OddzAssetManagerArtifact,
        [],
      )) as OddzAssetManager;
      const totalSupply = 1000000000000000;

      this.usdcToken = (await deployContract(this.signers.admin, MockERC20Artifact, [
        "USD coin",
        "USDC",
        totalSupply,
      ])) as MockERC20;

      this.ethToken = (await deployContract(this.signers.admin, MockERC20Artifact, [
        "Eth Token",
        "ETH",
        totalSupply,
      ])) as MockERC20;

      this.btcToken = (await deployContract(this.signers.admin, MockERC20Artifact, [
        "BTC Token",
        "BTC",
        totalSupply,
      ])) as MockERC20;
    });
    shouldBehaveLikeOddzAssetManager();
  });
});
