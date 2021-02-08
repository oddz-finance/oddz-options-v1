import { Signer } from "@ethersproject/abstract-signer";
import { ethers, waffle } from "hardhat";

import OddzPriceOracleArtifact from "../artifacts/contracts/Oracle/OddzPriceOracle.sol/OddzPriceOracle.json";
import MockAggregatorArtifact from "../artifacts/contracts/Mocks/MockAggregator.sol/MockAggregatorV3.json";

import { Accounts, Signers } from "../types";
import { MockProvider } from "ethereum-waffle";
const { deployContract } = waffle;
import { OddzPriceOracle } from "../typechain/OddzPriceOracle";
import { MockOddzPriceOracle } from "../typechain";
import { shouldBehaveLikeOddzPriceOracle } from "./behaviors/OddzPriceOracle.behavior";
import { AssetIds } from "../test-utils";
import { utils } from "ethers";

describe("Unit tests", function () {
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
      this.MockAggregator = (await deployContract(this.signers.admin, MockAggregatorArtifact, [
        AssetIds.ETH,
        AssetIds.USDT,
        8,
        utils.formatBytes32String("Mock"),
        8,
      ])) as MockOddzPriceOracle;
      this.oddzPriceOracle = (await deployContract(this.signers.admin, OddzPriceOracleArtifact, [])) as OddzPriceOracle;
    });

    shouldBehaveLikeOddzPriceOracle();
  });
});
