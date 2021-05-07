import { Signer } from "@ethersproject/abstract-signer";
import { ethers, waffle } from "hardhat";

import OddzIVOracleManagerArtifact from "../artifacts/contracts/Oracle/OddzIVOracleManager.sol/OddzIVOracleManager.json";
import MockIVManagerArtifact from "../artifacts/contracts/Mocks/MockIVManager.sol/MockIVManager.json";


import MockOddzVolatilityArtifact from "../artifacts/contracts/Mocks/MockOddzVolatility.sol/MockOddzVolatility.json";


import { Accounts, Signers } from "../types";
import { MockProvider } from "ethereum-waffle";
const { deployContract } = waffle;
import { OddzIVOracleManager } from "../typechain/OddzIVOracleManager";
import { OddzVolatility } from "../typechain/OddzVolatility";
import { MockIVManager } from "../typechain/MockIVManager";
import { shouldBehaveLikeOddzIVOracleManager } from "./behaviors/OddzIVOracleManager.behavior";

describe("Oddz IV Oracle Manager Unit tests", function () {
  const [wallet, walletTo] = new MockProvider().getWallets();
  before(async function () {
    this.accounts = {} as Accounts;
    this.signers = {} as Signers;

    const signers: Signer[] = await ethers.getSigners();
    this.signers.admin = signers[0];
    this.signers.admin1 = signers[1];
    this.accounts.admin = await signers[0].getAddress();
    this.wallet = wallet;
    this.walletTo = walletTo;
  });

  describe("Oddz IV oracle", function () {
    beforeEach(async function () {
      this.oddzIVOracle = (await deployContract(this.signers.admin, MockOddzVolatilityArtifact, [])) as OddzVolatility;

      this.oddzIVOracleManager = (await deployContract(
        this.signers.admin,
        OddzIVOracleManagerArtifact,
        [],
      )) as OddzIVOracleManager;

      this.mockIVManager = (await deployContract(this.signers.admin, MockIVManagerArtifact, [
        this.oddzIVOracleManager.address,
      ])) as MockIVManager;
      await this.oddzIVOracleManager.setManager(this.mockIVManager.address);

      await this.oddzIVOracle
        .connect(this.signers.admin)
        .setIv(180000, 5);
    });

    shouldBehaveLikeOddzIVOracleManager();
  });
});
