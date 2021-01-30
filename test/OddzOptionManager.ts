import { Signer } from "@ethersproject/abstract-signer";
import { ethers, waffle } from "hardhat";
import OddzOptionManagerArtifact from "../artifacts/contracts/Option/OddzOptionManager.sol/OddzOptionManager.json";
import MockOddzPriceOracleArtifact from "../artifacts/contracts/Mocks/MockOddzPriceOracle.sol/MockOddzPriceOracle.json";
import MockOddzVolatilityArtifact from "../artifacts/contracts/Mocks/MockOddzVolatility.sol/MockOddzVolatility.json";

import { Accounts, Signers } from "../types";

import { OddzOptionManager, MockOddzPriceOracle, MockOddzVolatility } from "../typechain";
import { shouldBehaveLikeOddzOptionManager } from "./behaviors/OddzOptionManager.behavior";
import { MockProvider } from "ethereum-waffle";
import { BigNumber } from "ethers";
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
      const oddzPriceOracle = (await deployContract(this.signers.admin, MockOddzPriceOracleArtifact, [
        BigNumber.from(1200),
      ])) as MockOddzPriceOracle;
      const oddzVolatility = (await deployContract(
        this.signers.admin,
        MockOddzVolatilityArtifact,
      )) as MockOddzVolatility;
      this.oddzOptionManager = (await deployContract(this.signers.admin, OddzOptionManagerArtifact, [
        oddzPriceOracle.address,
        oddzVolatility.address,
      ])) as OddzOptionManager;
    });
    shouldBehaveLikeOddzOptionManager();
  });
});
