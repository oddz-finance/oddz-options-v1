import { Signer } from "@ethersproject/abstract-signer";
import { ethers, waffle } from "hardhat";

import OddzFeeManagerArtifact from "../artifacts/contracts/Option/OddzFeeManager.sol/OddzFeeManager.json";
import MockERC20Artifact from "../artifacts/contracts/Mocks/MockERC20.sol/MockERC20.json";

import { Accounts, Signers } from "../types";
import { MockProvider } from "ethereum-waffle";
const { deployContract } = waffle;
import { OddzFeeManager, MockERC20 } from "../typechain";
import { shouldBehaveLikeOddzFeeManager } from "./behaviors/OddzFeeManager.behavior";
import { BigNumber, utils } from "ethers";

describe("Oddz Fee Manager Unit tests", function () {
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

  describe("Oddz Fee Manager", function () {
    beforeEach(async function () {
      const totalSupply = BigNumber.from(utils.parseEther("100000000"));
      this.oddzToken = (await deployContract(this.signers.admin, MockERC20Artifact, [
        "Oddz Token",
        "ODDZ",
        totalSupply,
      ])) as MockERC20;

      this.oUsdToken = (await deployContract(this.signers.admin, MockERC20Artifact, [
        "oUSD Token",
        "oUSD",
        totalSupply,
      ])) as MockERC20;

      this.random1Token = (await deployContract(this.signers.admin, MockERC20Artifact, [
        "Random 1 Token",
        "rand1",
        totalSupply,
      ])) as MockERC20;

      this.random2Token = (await deployContract(this.signers.admin, MockERC20Artifact, [
        "Random 2 Token",
        "rand2",
        totalSupply,
      ])) as MockERC20;

      this.oddzFeeManager = (await deployContract(this.signers.admin, OddzFeeManagerArtifact, [])) as OddzFeeManager;

      await this.oddzFeeManager.addTxnTokens(this.oddzToken.address);
      await this.oddzFeeManager.addTxnTokens(this.random1Token.address);

      await this.oddzFeeManager.addSettlementTokens(this.oUsdToken.address);
      await this.oddzFeeManager.addSettlementTokens(this.random2Token.address);

      await this.oddzFeeManager.addTokenDiscounts(this.oddzToken.address, 3, 10);
      await this.oddzFeeManager.addTokenDiscounts(this.oddzToken.address, 4, 20);
      await this.oddzFeeManager.addTokenDiscounts(this.oddzToken.address, 5, 40);
      await this.oddzFeeManager.addTokenDiscounts(this.oddzToken.address, 6, 60);
      await this.oddzFeeManager.addTokenDiscounts(this.oddzToken.address, 7, 80);

      await this.oddzFeeManager.addTokenDiscounts(this.random1Token.address, 4, 40);
      await this.oddzFeeManager.addTokenDiscounts(this.random1Token.address, 5, 60);
      await this.oddzFeeManager.addTokenDiscounts(this.random1Token.address, 6, 80);
      await this.oddzFeeManager.addTokenDiscounts(this.random1Token.address, 7, 100);

      await this.oddzFeeManager.addTokenDiscounts(this.oUsdToken.address, 3, 10);
      await this.oddzFeeManager.addTokenDiscounts(this.oUsdToken.address, 4, 20);
      await this.oddzFeeManager.addTokenDiscounts(this.oUsdToken.address, 5, 40);
      await this.oddzFeeManager.addTokenDiscounts(this.oUsdToken.address, 6, 60);
      await this.oddzFeeManager.addTokenDiscounts(this.oUsdToken.address, 7, 80);

      await this.oddzFeeManager.addTokenDiscounts(this.random2Token.address, 4, 40);
      await this.oddzFeeManager.addTokenDiscounts(this.random2Token.address, 5, 60);
      await this.oddzFeeManager.addTokenDiscounts(this.random2Token.address, 6, 80);
      await this.oddzFeeManager.addTokenDiscounts(this.random2Token.address, 7, 100);
    });

    shouldBehaveLikeOddzFeeManager();
  });
});
