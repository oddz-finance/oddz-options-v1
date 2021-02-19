import { Signer } from "@ethersproject/abstract-signer";
import { ethers, waffle } from "hardhat";
import OddzTokenArtifact from "../artifacts/contracts/OddzToken.sol/OddzToken.json";
import { Accounts, Signers } from "../types";
import { OddzToken } from "../typechain/OddzToken";
import { shouldBehaveLikeOddzToken } from "./behaviors/OddzToken.behavior";
import { MockProvider } from "ethereum-waffle";

const { deployContract } = waffle;

describe("Unit tests", function () {
  const [wallet, walletTo] = new MockProvider().getWallets();
  before(async function () {
    this.accounts = {} as Accounts;
    this.signers = {} as Signers;
    this.delegators = {} as Signers;
    this.delegatorAccounts = {} as Accounts;

    const signers: Signer[] = await ethers.getSigners();

    this.signers.admin = signers[0];
    this.accounts.admin = await signers[0].getAddress();
    this.signers.admin1 = signers[1];
    this.accounts.admin1 = await signers[1].getAddress();
    this.delegators.admin = signers[2];
    this.delegatorAccounts.admin = await signers[2].getAddress();

    this.wallet = wallet;
    this.walletTo = walletTo;

    this.mnemonic = process.env.MNEMONIC;
    this.privatekey = process.env.PRIVATE_KEY;
  });

  describe("Oddz token", function () {
    beforeEach(async function () {
      const totalSupply = 100000000;

      this.oddzToken = (await deployContract(this.signers.admin, OddzTokenArtifact, [
        "OddzToken",
        "ODDZ",
        totalSupply,
      ])) as OddzToken;
      this.usdcToken = (await deployContract(this.signers.admin, OddzTokenArtifact, [
        "USD coin",
        "USDC",
        totalSupply,
      ])) as OddzToken;
    });

    shouldBehaveLikeOddzToken();
  });
});
