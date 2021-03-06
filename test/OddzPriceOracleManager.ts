import { Signer } from "@ethersproject/abstract-signer";
import { ethers, waffle } from "hardhat";

import OddzPriceOracleManagerArtifact from "../artifacts/contracts/Oracle/OddzPriceOracleManager.sol/OddzPriceOracleManager.json";
import MockOddzPriceOracleArtifact from "../artifacts/contracts/Mocks/MockOddzPriceOracle.sol/MockOddzPriceOracle.json";
import MockPriceOracleUserArtifact from "../artifacts/contracts/Mocks/MockPriceOracleUser.sol/MockPriceOracleUser.json";

import { Accounts, Signers } from "../types";
import { MockProvider } from "ethereum-waffle";
const { deployContract } = waffle;
import { MockOddzPriceOracle, MockPriceOracleUser, OddzPriceOracleManager } from "../typechain";
import { shouldBehaveLikeOddzPriceOracleManager } from "./behaviors/OddzPriceOracleManager.behavior";
import { BigNumber } from "ethers";

describe("Oddz Price Oracle Manager Unit tests", function () {
  const [wallet, walletTo] = new MockProvider().getWallets();
  before(async function () {
    this.accounts = {} as Accounts;
    this.signers = {} as Signers;

    const signers: Signer[] = await ethers.getSigners();
    this.signers.admin = signers[0];
    this.accounts.admin = await signers[0].getAddress();
    this.wallet = wallet;
    this.walletTo = walletTo;
  });

  describe("Oddz Price oracle", function () {
    beforeEach(async function () {
      this.oddzPriceOracle = (await deployContract(this.signers.admin, MockOddzPriceOracleArtifact, [
        BigNumber.from(161200000000),
      ])) as MockOddzPriceOracle;

      this.oddzPriceOracleManager = (await deployContract(
        this.signers.admin,
        OddzPriceOracleManagerArtifact,
        [],
      )) as OddzPriceOracleManager;

      this.mockPriceOracleUser = (await deployContract(this.signers.admin, MockPriceOracleUserArtifact, [
        this.oddzPriceOracleManager.address,
      ])) as MockPriceOracleUser;

      await this.oddzPriceOracle.setManager(this.oddzPriceOracleManager.address);
    });

    shouldBehaveLikeOddzPriceOracleManager();
  });
});
