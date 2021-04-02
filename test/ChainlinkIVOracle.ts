import { Signer } from "@ethersproject/abstract-signer";
import { ethers, waffle } from "hardhat";

import OddzIVOracleManagerArtifact from "../artifacts/contracts/Oracle/OddzIVOracleManager.sol/OddzIVOracleManager.json";
import EthIVOneDayArtifact from "../artifacts/contracts/Mocks/Chainlink/EthIVOneDay.sol/EthIVOneDay.json";
import EthIVTwoDaysArtifact from "../artifacts/contracts/Mocks/Chainlink/EthIVTwoDays.sol/EthIVTwoDays.json";
import EthIVSevenDaysArtifact from "../artifacts/contracts/Mocks/Chainlink/EthIVSevenDays.sol/EthIVSevenDays.json";
import EthIVFourteenDaysArtifact from "../artifacts/contracts/Mocks/Chainlink/EthIVFourteenDays.sol/EthIVFourteenDays.json";
import EthIVTwentyoneDaysArtifact from "../artifacts/contracts/Mocks/Chainlink/EthIVTwentyoneDays.sol/EthIVTwentyoneDays.json";
import EthIVTwentyeightDaysArtifact from "../artifacts/contracts/Mocks/Chainlink/EthIVTwentyeightDays.sol/EthIVTwentyeightDays.json";
import ChainlinkIVOracleArtifact from "../artifacts/contracts/Integrations/VolatilityOracle/Chainlink/ChainlinkIVOracle.sol/ChainlinkIVOracle.json";
import MockIVManagerArtifact from "../artifacts/contracts/Mocks/MockIVManager.sol/MockIVManager.json";

import { Accounts, Signers } from "../types";
import { MockProvider } from "ethereum-waffle";
const { deployContract } = waffle;
import { OddzIVOracleManager } from "../typechain/OddzIVOracleManager";
import { EthIVOneDay } from "../typechain/EthIVOneDay";
import { EthIVTwoDays } from "../typechain/EthIVTwoDays";
import { EthIVSevenDays } from "../typechain/EthIVSevenDays";
import { EthIVFourteenDays } from "../typechain/EthIVFourteenDays";
import { EthIVTwentyoneDays } from "../typechain/EthIVTwentyoneDays";
import { EthIVTwentyeightDays } from "../typechain/EthIVTwentyeightDays";
import { ChainlinkIVOracle } from "../typechain/ChainlinkIVOracle";
import { MockIVManager } from "../typechain/MockIVManager";
import { shouldBehaveLikeChainlinkIVOracle } from "./behaviors/ChainlinkIVOracle.behavior";
import { utils } from "ethers";

describe("Oddz Chainlink IV Unit tests", function () {
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

  describe("Oddz Chainlink IV", function () {
    beforeEach(async function () {
      const ethIVOneDay = (await deployContract(this.signers.admin, EthIVOneDayArtifact, [])) as EthIVOneDay;
      const ethIVTwoDays = (await deployContract(this.signers.admin, EthIVTwoDaysArtifact, [])) as EthIVTwoDays;
      const ethIVSevenDays = (await deployContract(this.signers.admin, EthIVSevenDaysArtifact, [])) as EthIVSevenDays;
      const ethIVFourteenDays = (await deployContract(
        this.signers.admin,
        EthIVFourteenDaysArtifact,
        [],
      )) as EthIVFourteenDays;
      const ethIVTwentyoneDays = (await deployContract(
        this.signers.admin,
        EthIVTwentyoneDaysArtifact,
        [],
      )) as EthIVTwentyoneDays;
      const ethIVTwentyeightDays = (await deployContract(
        this.signers.admin,
        EthIVTwentyeightDaysArtifact,
        [],
      )) as EthIVTwentyeightDays;

      this.oddzIVOracleManager = (await deployContract(
        this.signers.admin,
        OddzIVOracleManagerArtifact,
        [],
      )) as OddzIVOracleManager;

      this.chainlinkIVOracle = (await deployContract(
        this.signers.admin,
        ChainlinkIVOracleArtifact,
        [],
      )) as ChainlinkIVOracle;
      await this.chainlinkIVOracle.setManager(this.oddzIVOracleManager.address);

      const oracleManager = await this.oddzIVOracleManager.connect(this.signers.admin);
      await oracleManager.addIVAggregator(
        utils.formatBytes32String("ETH"),
        utils.formatBytes32String("USD"),
        this.chainlinkIVOracle.address,
        ethIVOneDay.address,
        1,
      );
      await oracleManager.addIVAggregator(
        utils.formatBytes32String("ETH"),
        utils.formatBytes32String("USD"),
        this.chainlinkIVOracle.address,
        ethIVTwoDays.address,
        2,
      );
      await oracleManager.addIVAggregator(
        utils.formatBytes32String("ETH"),
        utils.formatBytes32String("USD"),
        this.chainlinkIVOracle.address,
        ethIVSevenDays.address,
        7,
      );
      await oracleManager.addIVAggregator(
        utils.formatBytes32String("ETH"),
        utils.formatBytes32String("USD"),
        this.chainlinkIVOracle.address,
        ethIVFourteenDays.address,
        14,
      );
      await oracleManager.addIVAggregator(
        utils.formatBytes32String("ETH"),
        utils.formatBytes32String("USD"),
        this.chainlinkIVOracle.address,
        ethIVTwentyoneDays.address,
        21,
      );
      await oracleManager.addIVAggregator(
        utils.formatBytes32String("ETH"),
        utils.formatBytes32String("USD"),
        this.chainlinkIVOracle.address,
        ethIVTwentyeightDays.address,
        28,
      );

      const hash = utils.keccak256(
        utils.defaultAbiCoder.encode(
          ["bytes32", "bytes32", "address"],
          [utils.formatBytes32String("ETH"), utils.formatBytes32String("USD"), this.chainlinkIVOracle.address],
        ),
      );

      await oracleManager.setActiveIVAggregator(hash);

      this.mockIVManager = (await deployContract(this.signers.admin, MockIVManagerArtifact, [
        this.oddzIVOracleManager.address,
      ])) as MockIVManager;
      await this.oddzIVOracleManager.setManager(this.mockIVManager.address);
    });

    shouldBehaveLikeChainlinkIVOracle();
  });
});
