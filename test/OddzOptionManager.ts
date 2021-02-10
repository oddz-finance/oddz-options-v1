import { Signer } from "@ethersproject/abstract-signer";
import { ethers, waffle } from "hardhat";
import OddzOptionManagerArtifact from "../artifacts/contracts/Option/OddzOptionManager.sol/OddzOptionManager.json";
import MockOddzPriceOracleArtifact from "../artifacts/contracts/Mocks/MockOddzPriceOracle.sol/MockOddzPriceOracle.json";
import MockOddzVolatilityArtifact from "../artifacts/contracts/Mocks/MockOddzVolatility.sol/MockOddzVolatility.json";
import MockOddzStakingArtifact from "../artifacts/contracts/Mocks/MockOddzStaking.sol/MockOddzStaking.json";

import { Accounts, Signers } from "../types";

import { OddzOptionManager, MockOddzPriceOracle, MockOddzVolatility, MockOddzStaking } from "../typechain";
import { shouldBehaveLikeOddzOptionManager } from "./behaviors/OddzOptionManager.behavior";
import { MockProvider } from "ethereum-waffle";
import { BigNumber } from "ethers";
import OddzLiquidityPoolArtifact from "../artifacts/contracts/Pool/OddzLiquidityPool.sol/OddzLiquidityPool.json";

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
      this.oddzPriceOracle = (await deployContract(this.signers.admin, MockOddzPriceOracleArtifact, [
        BigNumber.from(161200000000),
      ])) as MockOddzPriceOracle;
      const oddzVolatility = (await deployContract(
        this.signers.admin,
        MockOddzVolatilityArtifact,
      )) as MockOddzVolatility;
      const oddzStaking = (await deployContract(this.signers.admin, MockOddzStakingArtifact)) as MockOddzStaking;

      this.oddzOptionManager = (await deployContract(this.signers.admin, OddzOptionManagerArtifact, [
        this.oddzPriceOracle.address,
        oddzVolatility.address,
        oddzStaking.address,
      ])) as OddzOptionManager;
      const poolAddress = await this.oddzOptionManager.pool();
      this.oddzLiquidityPool = new ethers.Contract(poolAddress, OddzLiquidityPoolArtifact.abi, this.signers.admin);
    });
    shouldBehaveLikeOddzOptionManager();
  });
});
