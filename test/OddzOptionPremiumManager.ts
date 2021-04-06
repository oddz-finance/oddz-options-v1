import { Signer } from "@ethersproject/abstract-signer";
import { ethers, waffle } from "hardhat";
import OddzOptionPremiumManagerArtifact from "../artifacts/contracts/Option/OddzOptionPremiumManager.sol/OddzOptionPremiumManager.json";
import OddzPremiumBlackScholesArtifact from "../artifacts/contracts/Option/OddzPremiumBlackScholes.sol/OddzPremiumBlackScholes.json";
import MockPremiumManagerArtifact from "../artifacts/contracts/Mocks/MockPremiumManager.sol/MockPremiumManager.json";
import { Accounts, Signers } from "../types";
import { MockProvider } from "ethereum-waffle";
const { deployContract } = waffle;
import { OddzOptionPremiumManager } from "../typechain/OddzOptionPremiumManager";
import { OddzPremiumBlackScholes } from "../typechain/OddzPremiumBlackScholes";
import { MockPremiumManager } from "../typechain/MockPremiumManager";
import { shouldBehaveLikeOddzOptionPremiumManager } from "./behaviors/OddzOptionPremiumManager.behavior";

describe("Oddz Option Premium Manager Unit tests", function () {
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

  describe("Oddz Option Premium", function () {
    beforeEach(async function () {
      this.oddzOptionPremiumManager = (await deployContract(
        this.signers.admin,
        OddzOptionPremiumManagerArtifact,
        [],
      )) as OddzOptionPremiumManager;

      this.oddzPremiumBlackScholes = (await deployContract(
        this.signers.admin,
        OddzPremiumBlackScholesArtifact,
        [],
      )) as OddzPremiumBlackScholes;

      await this.oddzPremiumBlackScholes.transferOwnership(this.oddzOptionPremiumManager.address);

      this.mockPremiumManager = (await deployContract(this.signers.admin, MockPremiumManagerArtifact, [
        this.oddzOptionPremiumManager.address,
      ])) as MockPremiumManager;
    });

    shouldBehaveLikeOddzOptionPremiumManager();
  });
});
