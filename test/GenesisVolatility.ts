import { Signer } from "@ethersproject/abstract-signer";
import { ethers, waffle } from "hardhat";
import GenesisVolatilityArtifact from "../artifacts/contracts/Integrations/VolatilityOracle/GenesisVol/GenesisVolatility.sol/GenesisVolatility.json";
import { Accounts, Signers } from "../types";
import { GenesisVolatility } from "../typechain";
import { shouldBehaveLikeGenesisVolatilty } from "./behaviors/GenesisVolatility.behavior";
import { MockProvider } from "ethereum-waffle";

const { deployContract } = waffle;

describe("Genesis Volatility Unit tests", function () {
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

  describe("Genesis Volatility", function () {
    beforeEach(async function () {
      this.genesisVolatility = (await deployContract(
        this.signers.admin,
        GenesisVolatilityArtifact,
        [],
      )) as GenesisVolatility;
      const totalSupply = 1000000000000000;

      
    });
    shouldBehaveLikeGenesisVolatilty();
  });
});
