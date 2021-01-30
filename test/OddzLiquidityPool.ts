import { Signer } from "@ethersproject/abstract-signer";
import { ethers, waffle } from "hardhat";
import OddzLiquidityPoolArtifact from "../artifacts/contracts/Pool/OddzLiquidityPool.sol/OddzLiquidityPool.json";
import { Accounts, Signers } from "../types";
import { OddzLiquidityPool } from "../typechain";
import { shouldBehaveLikeOddzLiquidityPool } from './behaviors/OddzLiquidityPool.behavior';
import { MockProvider } from "ethereum-waffle";

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

  describe("Oddz Liquidity Pool", function () {
    beforeEach(async function () {

      this.oddzLiquidityPool = (await deployContract(this.signers.admin, OddzLiquidityPoolArtifact, [
      ])) as OddzLiquidityPool;
    });
    shouldBehaveLikeOddzLiquidityPool();
  });
});
