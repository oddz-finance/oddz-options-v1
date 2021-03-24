import { Signer } from "@ethersproject/abstract-signer";
import { ethers, waffle } from "hardhat";

import OddzIVOracleManagerArtifact from "../artifacts/contracts/Oracle/OddzIVOracleManager.sol/OddzIVOracleManager.json";
import OddzVolatilityArtifact from "../artifacts/contracts/Integrations/VolatilityOracle/Oddz/OddzVolatility.sol/OddzVolatility.json";

import { Accounts, Signers } from "../types";
import { MockProvider } from "ethereum-waffle";
const { deployContract } = waffle;
import { OddzIVOracleManager } from "../typechain/OddzIVOracleManager";
import { OddzVolatility } from "../typechain/OddzVolatility";
import { shouldBehaveLikeOddzIVOracleManager } from "./behaviors/OddzIVOracleManager.behavior";
import { utils } from "ethers";

describe("Oddz IV Oracle Manager Unit tests", function () {
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

  describe("Oddz IV oracle", function () {
    beforeEach(async function () {
      this.oddzIVOracle = (await deployContract(this.signers.admin, OddzVolatilityArtifact, [])) as OddzVolatility;

      this.oddzIVOracleManager = (await deployContract(
        this.signers.admin,
        OddzIVOracleManagerArtifact,
        [],
      )) as OddzIVOracleManager;

      await this.oddzIVOracle
        .connect(this.signers.admin)
        .setIv(utils.formatBytes32String("ETH"), utils.formatBytes32String("USD"), 180000, 5);
    });

    shouldBehaveLikeOddzIVOracleManager();
  });
});
