import { Signer } from "@ethersproject/abstract-signer";
import { ethers, waffle } from "hardhat";
import OddzOptionManagerArtifact from "../artifacts/contracts/Option/OddzOptionManager.sol/OddzOptionManager.json";
import { Accounts, Signers } from "../types";

import {OddzOptionManager} from "../typechain";
import {shouldBehaveLikeOddzOptionManager} from './behaviors/OddzOptionManager.behavior';
import {MockProvider} from 'ethereum-waffle';
const { deployContract } = waffle;

describe("Oddz Option Manager Unit tests", function () {
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

  describe("Oddz Option Manager", function () {
    beforeEach(async function () {
      this.oddzOptionManager = (await deployContract(this.signers.admin, OddzOptionManagerArtifact)) as OddzOptionManager;
    });
    shouldBehaveLikeOddzOptionManager();
  });
});

