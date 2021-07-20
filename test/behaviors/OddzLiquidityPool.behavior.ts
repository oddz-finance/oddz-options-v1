import { expect } from "chai";
import { BigNumber, utils, constants } from "ethers";
import { OptionType, getExpiry, addDaysAndGetSeconds, addSnapshotCount, PoolTransfer } from "../../test-utils";
import { waffle } from "hardhat";
import OddzEthUsdCallBS1PoolArtifact from "../../artifacts/contracts/Pool/OddzPools.sol/OddzEthUsdCallBS1Pool.json";
import OddzEthUsdCallBS2PoolArtifact from "../../artifacts/contracts/Pool/OddzPools.sol/OddzEthUsdCallBS2Pool.json";
import OddzEthUsdCallBS7PoolArtifact from "../../artifacts/contracts/Pool/OddzPools.sol/OddzEthUsdCallBS7Pool.json";
import OddzEthUsdCallBS14PoolArtifact from "../../artifacts/contracts/Pool/OddzPools.sol/OddzEthUsdCallBS14Pool.json";
import OddzEthUsdCallBS30PoolArtifact from "../../artifacts/contracts/Pool/OddzPools.sol/OddzEthUsdPutBS30Pool.json";
import OddzEthUsdPutBS1PoolArtifact from "../../artifacts/contracts/Pool/OddzPools.sol/OddzEthUsdPutBS1Pool.json";
import OddzEthUsdPutBS2PoolArtifact from "../../artifacts/contracts/Pool/OddzPools.sol/OddzEthUsdPutBS2Pool.json";
import OddzEthUsdPutBS7PoolArtifact from "../../artifacts/contracts/Pool/OddzPools.sol/OddzEthUsdPutBS7Pool.json";
import OddzEthUsdPutBS14PoolArtifact from "../../artifacts/contracts/Pool/OddzPools.sol/OddzEthUsdPutBS14Pool.json";
import OddzEthUsdPutBS30PoolArtifact from "../../artifacts/contracts/Pool/OddzPools.sol/OddzEthUsdPutBS30Pool.json";
import OddzBtcUsdCallBS1PoolArtifact from "../../artifacts/contracts/Pool/OddzPools.sol/OddzBtcUsdCallBS1Pool.json";
import OddzBtcUsdCallBS2PoolArtifact from "../../artifacts/contracts/Pool/OddzPools.sol/OddzBtcUsdCallBS2Pool.json";
import OddzBtcUsdCallBS7PoolArtifact from "../../artifacts/contracts/Pool/OddzPools.sol/OddzBtcUsdCallBS7Pool.json";
import OddzBtcUsdCallBS14PoolArtifact from "../../artifacts/contracts/Pool/OddzPools.sol/OddzBtcUsdCallBS14Pool.json";
import OddzBtcUsdCallBS30PoolArtifact from "../../artifacts/contracts/Pool/OddzPools.sol/OddzBtcUsdCallBS30Pool.json";
import OddzBtcUsdPutBS1PoolArtifact from "../../artifacts/contracts/Pool/OddzPools.sol/OddzBtcUsdPutBS1Pool.json";
import OddzBtcUsdPutBS2PoolArtifact from "../../artifacts/contracts/Pool/OddzPools.sol/OddzBtcUsdPutBS2Pool.json";
import OddzBtcUsdPutBS7PoolArtifact from "../../artifacts/contracts/Pool/OddzPools.sol/OddzBtcUsdPutBS7Pool.json";
import OddzBtcUsdPutBS14PoolArtifact from "../../artifacts/contracts/Pool/OddzPools.sol/OddzBtcUsdPutBS14Pool.json";
import OddzBtcUsdPutBS30PoolArtifact from "../../artifacts/contracts/Pool/OddzPools.sol/OddzBtcUsdPutBS30Pool.json";

import {
  OddzEthUsdCallBS1Pool,
  OddzEthUsdCallBS2Pool,
  OddzEthUsdCallBS7Pool,
  OddzEthUsdCallBS14Pool,
  OddzEthUsdCallBS30Pool,
  OddzEthUsdPutBS1Pool,
  OddzEthUsdPutBS2Pool,
  OddzEthUsdPutBS7Pool,
  OddzEthUsdPutBS14Pool,
  OddzEthUsdPutBS30Pool,
  OddzBtcUsdCallBS1Pool,
  OddzBtcUsdCallBS2Pool,
  OddzBtcUsdCallBS7Pool,
  OddzBtcUsdCallBS14Pool,
  OddzBtcUsdCallBS30Pool,
  OddzBtcUsdPutBS1Pool,
  OddzBtcUsdPutBS2Pool,
  OddzBtcUsdPutBS7Pool,
  OddzBtcUsdPutBS14Pool,
  OddzBtcUsdPutBS30Pool,
} from "../../typechain";

const { deployContract, provider } = waffle;

const date = Date.parse(new Date().toISOString().slice(0, 10)) / 1000;

const addAllPoolsWithLiquidity = async (
  admin: any,
  poolManager: any,
  oddzDefaultPoolAddress: any,
  amount: BigNumber,
) => {
  // ETHUSD Call
  const oddzEthUsdCallBS1Pool = (await deployContract(
    admin,
    OddzEthUsdCallBS1PoolArtifact,
    [],
  )) as OddzEthUsdCallBS1Pool;
  const oddzEthUsdCallBS2Pool = (await deployContract(
    admin,
    OddzEthUsdCallBS2PoolArtifact,
    [],
  )) as OddzEthUsdCallBS2Pool;
  const oddzEthUsdCallBS7Pool = (await deployContract(
    admin,
    OddzEthUsdCallBS7PoolArtifact,
    [],
  )) as OddzEthUsdCallBS7Pool;
  const oddzEthUsdCallBS14Pool = (await deployContract(
    admin,
    OddzEthUsdCallBS14PoolArtifact,
    [],
  )) as OddzEthUsdCallBS14Pool;
  const oddzEthUsdCallBS30Pool = (await deployContract(
    admin,
    OddzEthUsdCallBS30PoolArtifact,
    [],
  )) as OddzEthUsdCallBS30Pool;

  // ETHUSD Put
  const oddzEthUsdPutBS1Pool = (await deployContract(admin, OddzEthUsdPutBS1PoolArtifact, [])) as OddzEthUsdPutBS1Pool;
  const oddzEthUsdPutBS2Pool = (await deployContract(admin, OddzEthUsdPutBS2PoolArtifact, [])) as OddzEthUsdPutBS2Pool;
  const oddzEthUsdPutBS7Pool = (await deployContract(admin, OddzEthUsdPutBS7PoolArtifact, [])) as OddzEthUsdPutBS7Pool;
  const oddzEthUsdPutBS14Pool = (await deployContract(
    admin,
    OddzEthUsdPutBS14PoolArtifact,
    [],
  )) as OddzEthUsdPutBS14Pool;
  const oddzEthUsdPutBS30Pool = (await deployContract(
    admin,
    OddzEthUsdPutBS30PoolArtifact,
    [],
  )) as OddzEthUsdPutBS30Pool;

  // BTCUSD Call
  const oddzBtcUsdCallBS1Pool = (await deployContract(
    admin,
    OddzBtcUsdCallBS1PoolArtifact,
    [],
  )) as OddzBtcUsdCallBS1Pool;
  const oddzBtcUsdCallBS2Pool = (await deployContract(
    admin,
    OddzBtcUsdCallBS2PoolArtifact,
    [],
  )) as OddzBtcUsdCallBS2Pool;
  const oddzBtcUsdCallBS7Pool = (await deployContract(
    admin,
    OddzBtcUsdCallBS7PoolArtifact,
    [],
  )) as OddzBtcUsdCallBS7Pool;
  const oddzBtcUsdCallBS14Pool = (await deployContract(
    admin,
    OddzBtcUsdCallBS14PoolArtifact,
    [],
  )) as OddzBtcUsdCallBS14Pool;
  const oddzBtcUsdCallBS30Pool = (await deployContract(
    admin,
    OddzBtcUsdCallBS30PoolArtifact,
    [],
  )) as OddzBtcUsdCallBS30Pool;

  // BTCUSD Put
  const oddzBtcUsdPutBS1Pool = (await deployContract(admin, OddzBtcUsdPutBS1PoolArtifact, [])) as OddzBtcUsdPutBS1Pool;
  const oddzBtcUsdPutBS2Pool = (await deployContract(admin, OddzBtcUsdPutBS2PoolArtifact, [])) as OddzBtcUsdPutBS2Pool;
  const oddzBtcUsdPutBS7Pool = (await deployContract(admin, OddzBtcUsdPutBS7PoolArtifact, [])) as OddzBtcUsdPutBS7Pool;
  const oddzBtcUsdPutBS14Pool = (await deployContract(
    admin,
    OddzBtcUsdPutBS14PoolArtifact,
    [],
  )) as OddzBtcUsdPutBS14Pool;
  const oddzBtcUsdPutBS30Pool = (await deployContract(
    admin,
    OddzBtcUsdPutBS30PoolArtifact,
    [],
  )) as OddzBtcUsdPutBS30Pool;

  await oddzEthUsdCallBS1Pool.transferOwnership(poolManager.address);
  await oddzEthUsdCallBS2Pool.transferOwnership(poolManager.address);
  await oddzEthUsdCallBS7Pool.transferOwnership(poolManager.address);
  await oddzEthUsdCallBS14Pool.transferOwnership(poolManager.address);
  await oddzEthUsdCallBS30Pool.transferOwnership(poolManager.address);
  await oddzEthUsdPutBS1Pool.transferOwnership(poolManager.address);
  await oddzEthUsdPutBS2Pool.transferOwnership(poolManager.address);
  await oddzEthUsdPutBS7Pool.transferOwnership(poolManager.address);
  await oddzEthUsdPutBS14Pool.transferOwnership(poolManager.address);
  await oddzEthUsdPutBS30Pool.transferOwnership(poolManager.address);
  await oddzBtcUsdCallBS1Pool.transferOwnership(poolManager.address);
  await oddzBtcUsdCallBS2Pool.transferOwnership(poolManager.address);
  await oddzBtcUsdCallBS7Pool.transferOwnership(poolManager.address);
  await oddzBtcUsdCallBS14Pool.transferOwnership(poolManager.address);
  await oddzBtcUsdCallBS30Pool.transferOwnership(poolManager.address);
  await oddzBtcUsdPutBS1Pool.transferOwnership(poolManager.address);
  await oddzBtcUsdPutBS2Pool.transferOwnership(poolManager.address);
  await oddzBtcUsdPutBS7Pool.transferOwnership(poolManager.address);
  await oddzBtcUsdPutBS14Pool.transferOwnership(poolManager.address);
  await oddzBtcUsdPutBS30Pool.transferOwnership(poolManager.address);

  // ETH Call
  await poolManager
    .connect(admin)
    .mapPool("0xfcb06d25357ef01726861b30b0b83e51482db417", OptionType.Call, utils.formatBytes32String("B_S"), 1, [
      oddzDefaultPoolAddress,
      oddzEthUsdCallBS1Pool.address,
      oddzEthUsdCallBS2Pool.address,
      oddzEthUsdCallBS7Pool.address,
      oddzEthUsdCallBS14Pool.address,
      oddzEthUsdCallBS30Pool.address,
    ]);
  await poolManager
    .connect(admin)
    .mapPool("0xfcb06d25357ef01726861b30b0b83e51482db417", OptionType.Call, utils.formatBytes32String("B_S"), 2, [
      oddzDefaultPoolAddress,
      oddzEthUsdCallBS2Pool.address,
      oddzEthUsdCallBS7Pool.address,
      oddzEthUsdCallBS14Pool.address,
      oddzEthUsdCallBS30Pool.address,
    ]);
  await poolManager
    .connect(admin)
    .mapPool("0xfcb06d25357ef01726861b30b0b83e51482db417", OptionType.Call, utils.formatBytes32String("B_S"), 7, [
      oddzDefaultPoolAddress,
      oddzEthUsdCallBS7Pool.address,
      oddzEthUsdCallBS14Pool.address,
      oddzEthUsdCallBS30Pool.address,
    ]);
  await poolManager
    .connect(admin)
    .mapPool("0xfcb06d25357ef01726861b30b0b83e51482db417", OptionType.Call, utils.formatBytes32String("B_S"), 14, [
      oddzDefaultPoolAddress,
      oddzEthUsdCallBS14Pool.address,
      oddzEthUsdCallBS30Pool.address,
    ]);
  await poolManager
    .connect(admin)
    .mapPool("0xfcb06d25357ef01726861b30b0b83e51482db417", OptionType.Call, utils.formatBytes32String("B_S"), 30, [
      oddzDefaultPoolAddress,
      oddzEthUsdCallBS30Pool.address,
    ]);

  // ETH Put
  await poolManager
    .connect(admin)
    .mapPool("0xfcb06d25357ef01726861b30b0b83e51482db417", OptionType.Put, utils.formatBytes32String("B_S"), 1, [
      oddzDefaultPoolAddress,
      oddzEthUsdPutBS1Pool.address,
      oddzEthUsdPutBS2Pool.address,
      oddzEthUsdPutBS7Pool.address,
      oddzEthUsdPutBS14Pool.address,
      oddzEthUsdPutBS30Pool.address,
    ]);
  await poolManager
    .connect(admin)
    .mapPool("0xfcb06d25357ef01726861b30b0b83e51482db417", OptionType.Put, utils.formatBytes32String("B_S"), 2, [
      oddzDefaultPoolAddress,
      oddzEthUsdPutBS2Pool.address,
      oddzEthUsdPutBS7Pool.address,
      oddzEthUsdPutBS14Pool.address,
      oddzEthUsdPutBS30Pool.address,
    ]);
  await poolManager
    .connect(admin)
    .mapPool("0xfcb06d25357ef01726861b30b0b83e51482db417", OptionType.Put, utils.formatBytes32String("B_S"), 7, [
      oddzDefaultPoolAddress,
      oddzEthUsdPutBS7Pool.address,
      oddzEthUsdPutBS14Pool.address,
      oddzEthUsdPutBS30Pool.address,
    ]);
  await poolManager
    .connect(admin)
    .mapPool("0xfcb06d25357ef01726861b30b0b83e51482db417", OptionType.Put, utils.formatBytes32String("B_S"), 14, [
      oddzDefaultPoolAddress,
      oddzEthUsdPutBS14Pool.address,
      oddzEthUsdPutBS30Pool.address,
    ]);
  await poolManager
    .connect(admin)
    .mapPool("0xfcb06d25357ef01726861b30b0b83e51482db417", OptionType.Put, utils.formatBytes32String("B_S"), 30, [
      oddzDefaultPoolAddress,
      oddzEthUsdPutBS30Pool.address,
    ]);

  // BTC Call
  await poolManager
    .connect(admin)
    .mapPool("0x8c461e897bBE3E4DDf8FD25be25f91Aac161a2f0", OptionType.Call, utils.formatBytes32String("B_S"), 1, [
      oddzDefaultPoolAddress,
      oddzBtcUsdCallBS1Pool.address,
      oddzBtcUsdCallBS2Pool.address,
      oddzBtcUsdCallBS7Pool.address,
      oddzBtcUsdCallBS14Pool.address,
      oddzBtcUsdCallBS30Pool.address,
    ]);
  await poolManager
    .connect(admin)
    .mapPool("0x8c461e897bBE3E4DDf8FD25be25f91Aac161a2f0", OptionType.Call, utils.formatBytes32String("B_S"), 2, [
      oddzDefaultPoolAddress,
      oddzBtcUsdCallBS2Pool.address,
      oddzBtcUsdCallBS7Pool.address,
      oddzBtcUsdCallBS14Pool.address,
      oddzBtcUsdCallBS30Pool.address,
    ]);
  await poolManager
    .connect(admin)
    .mapPool("0x8c461e897bBE3E4DDf8FD25be25f91Aac161a2f0", OptionType.Call, utils.formatBytes32String("B_S"), 7, [
      oddzDefaultPoolAddress,
      oddzBtcUsdCallBS7Pool.address,
      oddzBtcUsdCallBS14Pool.address,
      oddzBtcUsdCallBS30Pool.address,
    ]);
  await poolManager
    .connect(admin)
    .mapPool("0x8c461e897bBE3E4DDf8FD25be25f91Aac161a2f0", OptionType.Call, utils.formatBytes32String("B_S"), 14, [
      oddzDefaultPoolAddress,
      oddzBtcUsdCallBS14Pool.address,
      oddzBtcUsdCallBS30Pool.address,
    ]);
  await poolManager
    .connect(admin)
    .mapPool("0x8c461e897bBE3E4DDf8FD25be25f91Aac161a2f0", OptionType.Call, utils.formatBytes32String("B_S"), 30, [
      oddzDefaultPoolAddress,
      oddzBtcUsdCallBS30Pool.address,
    ]);

  // BTC Put
  await poolManager
    .connect(admin)
    .mapPool("0x8c461e897bBE3E4DDf8FD25be25f91Aac161a2f0", OptionType.Put, utils.formatBytes32String("B_S"), 1, [
      oddzDefaultPoolAddress,
      oddzBtcUsdPutBS1Pool.address,
      oddzBtcUsdPutBS2Pool.address,
      oddzBtcUsdPutBS7Pool.address,
      oddzBtcUsdPutBS14Pool.address,
      oddzBtcUsdPutBS30Pool.address,
    ]);
  await poolManager
    .connect(admin)
    .mapPool("0x8c461e897bBE3E4DDf8FD25be25f91Aac161a2f0", OptionType.Put, utils.formatBytes32String("B_S"), 2, [
      oddzDefaultPoolAddress,
      oddzBtcUsdPutBS2Pool.address,
      oddzBtcUsdPutBS7Pool.address,
      oddzBtcUsdPutBS14Pool.address,
      oddzBtcUsdPutBS30Pool.address,
    ]);
  await poolManager
    .connect(admin)
    .mapPool("0x8c461e897bBE3E4DDf8FD25be25f91Aac161a2f0", OptionType.Put, utils.formatBytes32String("B_S"), 7, [
      oddzDefaultPoolAddress,
      oddzBtcUsdPutBS7Pool.address,
      oddzBtcUsdPutBS14Pool.address,
      oddzBtcUsdPutBS30Pool.address,
    ]);
  await poolManager
    .connect(admin)
    .mapPool("0x8c461e897bBE3E4DDf8FD25be25f91Aac161a2f0", OptionType.Put, utils.formatBytes32String("B_S"), 14, [
      oddzDefaultPoolAddress,
      oddzBtcUsdPutBS14Pool.address,
      oddzBtcUsdPutBS30Pool.address,
    ]);
  await poolManager
    .connect(admin)
    .mapPool("0x8c461e897bBE3E4DDf8FD25be25f91Aac161a2f0", OptionType.Put, utils.formatBytes32String("B_S"), 30, [
      oddzDefaultPoolAddress,
      oddzBtcUsdPutBS30Pool.address,
    ]);

  await poolManager.addLiquidity(await admin.getAddress(), oddzEthUsdCallBS1Pool.address, amount);
  await poolManager.addLiquidity(await admin.getAddress(), oddzEthUsdCallBS2Pool.address, amount);
  await poolManager.addLiquidity(await admin.getAddress(), oddzEthUsdCallBS7Pool.address, amount);
  await poolManager.addLiquidity(await admin.getAddress(), oddzEthUsdCallBS14Pool.address, amount);
  await poolManager.addLiquidity(await admin.getAddress(), oddzEthUsdCallBS30Pool.address, amount);
  await poolManager.addLiquidity(await admin.getAddress(), oddzEthUsdPutBS1Pool.address, amount);
  await poolManager.addLiquidity(await admin.getAddress(), oddzEthUsdPutBS2Pool.address, amount);
  await poolManager.addLiquidity(await admin.getAddress(), oddzEthUsdPutBS7Pool.address, amount);
  await poolManager.addLiquidity(await admin.getAddress(), oddzEthUsdPutBS14Pool.address, amount);
  await poolManager.addLiquidity(await admin.getAddress(), oddzEthUsdPutBS30Pool.address, amount);
  await poolManager.addLiquidity(await admin.getAddress(), oddzBtcUsdCallBS1Pool.address, amount);
  await poolManager.addLiquidity(await admin.getAddress(), oddzBtcUsdCallBS2Pool.address, amount);
  await poolManager.addLiquidity(await admin.getAddress(), oddzBtcUsdCallBS7Pool.address, amount);
  await poolManager.addLiquidity(await admin.getAddress(), oddzBtcUsdCallBS14Pool.address, amount);
  await poolManager.addLiquidity(await admin.getAddress(), oddzBtcUsdCallBS30Pool.address, amount);
  await poolManager.addLiquidity(await admin.getAddress(), oddzBtcUsdPutBS1Pool.address, amount);
  await poolManager.addLiquidity(await admin.getAddress(), oddzBtcUsdPutBS2Pool.address, amount);
  await poolManager.addLiquidity(await admin.getAddress(), oddzBtcUsdPutBS7Pool.address, amount);
  await poolManager.addLiquidity(await admin.getAddress(), oddzBtcUsdPutBS14Pool.address, amount);
  await poolManager.addLiquidity(await admin.getAddress(), oddzBtcUsdPutBS30Pool.address, amount);

  return {
    oddzEthUsdCallBS1Pool: oddzEthUsdCallBS1Pool,
    oddzEthUsdCallBS2Pool: oddzEthUsdCallBS2Pool,
    oddzEthUsdCallBS7Pool: oddzEthUsdCallBS7Pool,
    oddzEthUsdCallBS14Pool: oddzEthUsdCallBS14Pool,
    oddzEthUsdCallBS30Pool: oddzEthUsdCallBS30Pool,
    oddzEthUsdPutBS1Pool: oddzEthUsdPutBS1Pool,
    oddzEthUsdPutBS2Pool: oddzEthUsdPutBS2Pool,
    oddzEthUsdPutBS7Pool: oddzEthUsdPutBS7Pool,
    oddzEthUsdPutBS14Pool: oddzEthUsdPutBS14Pool,
    oddzEthUsdPutBS30Pool: oddzEthUsdPutBS30Pool,
    oddzBtcUsdCallBS1Pool: oddzBtcUsdCallBS1Pool,
    oddzBtcUsdCallBS2Pool: oddzBtcUsdCallBS2Pool,
    oddzBtcUsdCallBS7Pool: oddzBtcUsdCallBS7Pool,
    oddzBtcUsdCallBS14Pool: oddzBtcUsdCallBS14Pool,
    oddzBtcUsdCallBS30Pool: oddzBtcUsdCallBS30Pool,
    oddzBtcUsdPutBS1Pool: oddzBtcUsdPutBS1Pool,
    oddzBtcUsdPutBS2Pool: oddzBtcUsdPutBS2Pool,
    oddzBtcUsdPutBS7Pool: oddzBtcUsdPutBS7Pool,
    oddzBtcUsdPutBS14Pool: oddzBtcUsdPutBS14Pool,
    oddzBtcUsdPutBS30Pool: oddzBtcUsdPutBS30Pool,
  };
};

const addMultiLiquidityPools = async (admin: any, poolManager: any, oddzDefaultPoolAddress: any) => {
  const oddzEthUsdCallBS1Pool = (await deployContract(
    admin,
    OddzEthUsdCallBS1PoolArtifact,
    [],
  )) as OddzEthUsdCallBS1Pool;
  const oddzEthUsdCallBS30Pool = (await deployContract(
    admin,
    OddzEthUsdCallBS30PoolArtifact,
    [],
  )) as OddzEthUsdCallBS30Pool;

  await oddzEthUsdCallBS1Pool.transferOwnership(poolManager.address);
  await oddzEthUsdCallBS30Pool.transferOwnership(poolManager.address);

  await poolManager
    .connect(admin)
    .mapPool("0xfcb06d25357ef01726861b30b0b83e51482db417", OptionType.Call, utils.formatBytes32String("B_S"), 1, [
      oddzDefaultPoolAddress,
      oddzEthUsdCallBS1Pool.address,
      oddzEthUsdCallBS30Pool.address,
    ]);
  await poolManager
    .connect(admin)
    .mapPool("0xfcb06d25357ef01726861b30b0b83e51482db417", OptionType.Call, utils.formatBytes32String("B_S"), 2, [
      oddzDefaultPoolAddress,
      oddzEthUsdCallBS30Pool.address,
    ]);
  await poolManager
    .connect(admin)
    .mapPool("0xfcb06d25357ef01726861b30b0b83e51482db417", OptionType.Call, utils.formatBytes32String("B_S"), 7, [
      oddzDefaultPoolAddress,
      oddzEthUsdCallBS30Pool.address,
    ]);
  await poolManager
    .connect(admin)
    .mapPool("0xfcb06d25357ef01726861b30b0b83e51482db417", OptionType.Call, utils.formatBytes32String("B_S"), 14, [
      oddzDefaultPoolAddress,
      oddzEthUsdCallBS30Pool.address,
    ]);
  await poolManager
    .connect(admin)
    .mapPool("0xfcb06d25357ef01726861b30b0b83e51482db417", OptionType.Call, utils.formatBytes32String("B_S"), 30, [
      oddzDefaultPoolAddress,
      oddzEthUsdCallBS30Pool.address,
    ]);

  return { oddzEthUsdCallBS1Pool: oddzEthUsdCallBS1Pool, oddzEthUsdCallBS30Pool: oddzEthUsdCallBS30Pool };
};

const addBTCLiquidityPool = async (admin: any, poolManager: any, oddzDefaultPoolAddress: any) => {
  const oddzBtcUsdCallBS1Pool = (await deployContract(
    admin,
    OddzBtcUsdCallBS1PoolArtifact,
    [],
  )) as OddzEthUsdCallBS1Pool;

  await oddzBtcUsdCallBS1Pool.transferOwnership(poolManager.address);

  await poolManager
    .connect(admin)
    .mapPool("0x8c461e897bBE3E4DDf8FD25be25f91Aac161a2f0", OptionType.Call, utils.formatBytes32String("B_S"), 1, [
      oddzDefaultPoolAddress,
      oddzBtcUsdCallBS1Pool.address,
    ]);

  return { oddzBtcUsdCallBS1Pool: oddzBtcUsdCallBS1Pool };
};

const getPoolTransferStruct = (source: any[], destination: any[], sAmount: BigNumber[], dAmount: BigNumber[]) => {
  const poolTransfer: PoolTransfer = {
    _source: source,
    _destination: destination,
    _sAmount: sAmount,
    _dAmount: dAmount,
  };

  return poolTransfer;
};

export function shouldBehaveLikeOddzLiquidityPool(): void {
  it("should return available balance and total balance. Both of them should be set to 0", async function () {
    const defaultPool = await this.oddzDefaultPool.connect(this.signers.admin);
    const totalBalance = await defaultPool.totalBalance();
    const availableBalance = await defaultPool.availableBalance();
    expect(availableBalance.toNumber()).to.equal(totalBalance.toNumber());
  });

  it("should allow deposit, emit AddLiquidity event and should update available balance", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    const defaultPool = await this.oddzDefaultPool.connect(this.signers.admin);
    const depositAmount = 1000;
    await expect(
      liquidityManager.addLiquidity(this.accounts.admin, this.oddzDefaultPool.address, depositAmount),
    ).to.emit(defaultPool, "AddLiquidity");
    const availableBalance = await defaultPool.availableBalance();
    expect(availableBalance.toNumber()).to.equal(depositAmount);

    await expect(
      liquidityManager.addLiquidity(this.accounts.admin, this.oddzDefaultPool.address, depositAmount),
    ).to.emit(defaultPool, "AddLiquidity");

    const newavailableBalance = await defaultPool.availableBalance();
    expect(newavailableBalance.toNumber()).to.equal(depositAmount + depositAmount);
    expect(await defaultPool.daysActiveLiquidity(BigNumber.from(date))).to.equal(2000);
    expect((await defaultPool.liquidityProvider(this.accounts.admin))._amount.toNumber()).to.equal(depositAmount * 2);
  });

  it("should not allow withdraw when the pool does not have sufficient balance", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    const mockOptionManager = await this.mockOptionManager.connect(this.signers.admin);
    await liquidityManager.addLiquidity(
      this.accounts.admin,
      this.oddzDefaultPool.address,
      BigNumber.from(utils.parseEther(this.transferTokenAmout)),
    );
    await liquidityManager.setManager(this.mockOptionManager.address);
    await expect(mockOptionManager.lock(0)).to.be.ok;
    await expect(
      liquidityManager.removeLiquidity(
        this.accounts.admin,
        this.oddzDefaultPool.address,
        BigNumber.from(utils.parseEther(this.transferTokenAmout)),
      ),
    ).to.be.revertedWith("LP Error: Not enough funds in the pool. Please lower the amount.");
  });

  it("should allow withdraw when the pool has sufficient balance", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    const depositAmount = 1000;
    await expect(
      liquidityManager.addLiquidity(this.accounts.admin, this.oddzDefaultPool.address, depositAmount),
    ).to.emit(this.oddzDefaultPool, "AddLiquidity");
    const withdrawalAmount = 800;
    await expect(
      liquidityManager.removeLiquidity(
        this.accounts.admin,
        this.oddzDefaultPool.address,
        BigNumber.from(withdrawalAmount),
      ),
    ).to.emit(this.oddzDefaultPool, "RemoveLiquidity");
    expect(await this.oddzDefaultPool.connect(this.signers.admin).daysActiveLiquidity(BigNumber.from(date))).to.equal(
      200,
    );
  });

  it("should be able to successfully set Manager", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    await expect(liquidityManager.setManager(this.mockOptionManager.address)).to.emit(liquidityManager, "RoleGranted");
  });

  it("should revert invalid manager address while set Manager", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    await expect(liquidityManager.setManager(this.accounts.admin)).to.be.revertedWith("Invalid manager address");
  });

  it("should revert sender must be an admin to grant while set Manager", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin1);
    await expect(liquidityManager.setManager(this.mockOptionManager.address)).to.be.revertedWith(
      "sender must be an admin to grant",
    );
  });

  it("should be able to successfully remove Manager", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    await liquidityManager.setManager(this.mockOptionManager.address);
    await expect(liquidityManager.removeManager(this.mockOptionManager.address)).to.emit(
      liquidityManager,
      "RoleRevoked",
    );
  });

  it("should revert sender must be an admin to grant while remove Manager", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin1);
    await expect(liquidityManager.removeManager(this.mockOptionManager.address)).to.be.revertedWith(
      "sender must be an admin to revoke",
    );
  });

  it("should revert caller is not the owner while updating premium lockup duration", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin1);
    await expect(liquidityManager.updatePremiumLockupDuration(100)).to.be.revertedWith(
      "LP Error: caller has no access to the method",
    );
  });

  it("should revert invalid lockup duration while updating premium lockup duration for lower than expected", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    await expect(liquidityManager.updatePremiumLockupDuration(getExpiry(1) - 1)).to.be.revertedWith(
      "LP Error: invalid premium lockup duration",
    );
  });

  it("should revert invalid lockup duration while updating premium lockup duration for higher than expected", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    await expect(liquidityManager.updatePremiumLockupDuration(getExpiry(30) + 1)).to.be.revertedWith(
      "LP Error: invalid premium lockup duration",
    );
  });

  it("should successdully update premium lockup duration", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    await expect(liquidityManager.updatePremiumLockupDuration(getExpiry(7))).to.be.ok;

    expect(await liquidityManager.premiumLockupDuration()).to.equal(getExpiry(7));
  });

  it("should revert caller is not the owner while updating move lockup duration", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin1);
    await expect(liquidityManager.updateMoveLockupDuration(100)).to.be.revertedWith(
      "LP Error: caller has no access to the method",
    );
  });

  it("should revert invalid lockup duration while updating move lockup duration for lower than expected", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    await expect(liquidityManager.updateMoveLockupDuration(getExpiry(3) - 1)).to.be.revertedWith(
      "LP Error: invalid move lockup duration",
    );
  });

  it("should revert invalid lockup duration while updating move lockup duration for higher than expected", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    await expect(liquidityManager.updateMoveLockupDuration(getExpiry(30) + 1)).to.be.revertedWith(
      "LP Error: invalid move lockup duration",
    );
  });

  it("should successdully update move lockup duration", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    await expect(liquidityManager.updateMoveLockupDuration(getExpiry(4))).to.be.ok;

    expect(await liquidityManager.moveLockupDuration()).to.equal(getExpiry(4));
  });

  it("should be able to successfully lock pool", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    const mockOptionManager = await this.mockOptionManager.connect(this.signers.admin);
    await liquidityManager.addLiquidity(
      this.accounts.admin,
      this.oddzDefaultPool.address,
      BigNumber.from(utils.parseEther(this.transferTokenAmout)),
    );
    await liquidityManager.setManager(this.mockOptionManager.address);
    await expect(mockOptionManager.lock(0)).to.be.ok;
  });

  it("should revert caller has no access to the method while lock pool", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    const mockOptionManager = await this.mockOptionManager.connect(this.signers.admin);
    await liquidityManager.addLiquidity(
      this.accounts.admin,
      this.oddzDefaultPool.address,
      BigNumber.from(utils.parseEther(this.transferTokenAmout)),
    );
    await expect(mockOptionManager.lock(0)).to.be.revertedWith("LP Error: caller has no access to the method");
  });

  it("should be able to successfully unlock pool", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    const mockOptionManager = await this.mockOptionManager.connect(this.signers.admin);
    await liquidityManager.addLiquidity(
      this.accounts.admin,
      this.oddzDefaultPool.address,
      BigNumber.from(utils.parseEther(this.transferTokenAmout)),
    );
    await liquidityManager.setManager(this.mockOptionManager.address);
    await mockOptionManager.lock(0);
    await expect(mockOptionManager.unlock(0)).to.be.ok;
  });

  it("should revert caller has no access to the method while unlock pool", async function () {
    const mockOptionManager = await this.mockOptionManager.connect(this.signers.admin);
    await expect(mockOptionManager.unlock(0)).to.be.revertedWith("LP Error: caller has no access to the method");
  });

  it("should be able to successfully send token to user", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    const mockOptionManager = await this.mockOptionManager.connect(this.signers.admin);
    await liquidityManager.addLiquidity(
      this.accounts.admin,
      this.oddzDefaultPool.address,
      BigNumber.from(utils.parseEther(this.transferTokenAmout)),
    );
    await liquidityManager.setManager(this.mockOptionManager.address);
    await expect(mockOptionManager.send(this.accounts.admin, 10000000000, 0)).to.emit(this.oddzDefaultPool, "Profit");
  });

  it("should be able to successfully send and emit loss event", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    const mockOptionManager = await this.mockOptionManager.connect(this.signers.admin);
    await liquidityManager.addLiquidity(
      this.accounts.admin,
      this.oddzDefaultPool.address,
      BigNumber.from(utils.parseEther(this.transferTokenAmout)),
    );
    await liquidityManager.setManager(this.mockOptionManager.address);
    await expect(mockOptionManager.send(this.accounts.admin, 10000000000000, 0)).to.emit(this.oddzDefaultPool, "Loss");
  });

  it("should revert caller has no access to the method while send token to user", async function () {
    const mockOptionManager = await this.mockOptionManager.connect(this.signers.admin);
    await expect(mockOptionManager.send(this.accounts.admin, 10000000000, 0)).to.be.revertedWith(
      "LP Error: caller has no access to the method",
    );
  });

  it("should be able to successfully send UA token to user", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    const mockOptionManager = await this.mockOptionManager.connect(this.signers.admin);
    await liquidityManager.addLiquidity(
      this.accounts.admin,
      this.oddzDefaultPool.address,
      BigNumber.from(utils.parseEther(this.transferTokenAmout)),
    );
    await liquidityManager.setManager(this.mockOptionManager.address);
    await expect(mockOptionManager.sendUA(this.accounts.admin, 10000000000, 0)).to.emit(this.oddzDefaultPool, "Profit");
  });

  it("should revert caller has no access to the method while send UA token to user", async function () {
    const mockOptionManager = await this.mockOptionManager.connect(this.signers.admin);
    await expect(mockOptionManager.sendUA(this.accounts.admin, 10000000000, 0)).to.be.revertedWith(
      "LP Error: caller has no access to the method",
    );
  });

  it("should revert for underflow operation while locking without add liquidty", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    const mockOptionManager = await this.mockOptionManager.connect(this.signers.admin);
    await liquidityManager.setManager(this.mockOptionManager.address);
    await expect(mockOptionManager.lock(0)).to.be.revertedWith("revert");
  });

  it("should revert for underflow operation while unlocking again", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    const mockOptionManager = await this.mockOptionManager.connect(this.signers.admin);
    await liquidityManager.addLiquidity(
      this.accounts.admin,
      this.oddzDefaultPool.address,
      BigNumber.from(utils.parseEther(this.transferTokenAmout)),
    );
    await liquidityManager.setManager(this.mockOptionManager.address);
    await mockOptionManager.lock(0);
    await expect(mockOptionManager.unlock(0)).to.be.ok;
    await expect(mockOptionManager.unlock(0)).to.be.revertedWith("revert");
  });

  it("should revert add liquidity for zero amount", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    const depositAmount = 0;
    await expect(
      liquidityManager.addLiquidity(this.accounts.admin, this.oddzDefaultPool.address, depositAmount),
    ).to.be.revertedWith("LP Error: Amount is too small");
  });

  it("should revert remove liquidity for more than deposited", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    let depositAmount = 1000;
    await liquidityManager.addLiquidity(this.accounts.admin, this.oddzDefaultPool.address, depositAmount);
    depositAmount = 10000;
    await liquidityManager
      .connect(this.signers.admin1)
      .addLiquidity(this.accounts.admin1, this.oddzDefaultPool.address, depositAmount);
    const withdrawalAmount = 1001;
    await expect(
      liquidityManager.removeLiquidity(
        this.accounts.admin,
        this.oddzDefaultPool.address,
        BigNumber.from(withdrawalAmount),
      ),
    ).to.be.revertedWith("LP Error: Amount exceeds oUSD balance");
  });

  it("should revert remove liquidity for invalid amount", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    let depositAmount = 1000;
    await liquidityManager.addLiquidity(this.accounts.admin, this.oddzDefaultPool.address, depositAmount);
    depositAmount = 10000;
    await liquidityManager
      .connect(this.signers.admin1)
      .addLiquidity(this.accounts.admin1, this.oddzDefaultPool.address, depositAmount);
    const withdrawalAmount = 0;
    await expect(
      liquidityManager.removeLiquidity(
        this.accounts.admin,
        this.oddzDefaultPool.address,
        BigNumber.from(withdrawalAmount),
      ),
    ).to.be.revertedWith("LP Error: Amount is too small");
  });

  it("should revert lock liquidity with invalid id", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    const mockOptionManager = await this.mockOptionManager.connect(this.signers.admin);
    await liquidityManager.addLiquidity(
      this.accounts.admin,
      this.oddzDefaultPool.address,
      BigNumber.from(utils.parseEther(this.transferTokenAmout)),
    );
    await liquidityManager.setManager(this.mockOptionManager.address);
    await expect(mockOptionManager.lock(1)).to.be.revertedWith("LP Error: Invalid id");
  });

  it("should revert send for invalid address", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    const mockOptionManager = await this.mockOptionManager.connect(this.signers.admin);
    await liquidityManager.addLiquidity(
      this.accounts.admin,
      this.oddzDefaultPool.address,
      BigNumber.from(utils.parseEther(this.transferTokenAmout)),
    );
    await liquidityManager.setManager(this.mockOptionManager.address);
    await expect(mockOptionManager.send(constants.AddressZero, 10000000000, 0)).to.be.revertedWith(
      "LP Error: Invalid address",
    );
  });

  it("should revert setReqBalance for non owner", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin1);
    await expect(liquidityManager.setReqBalance(5)).to.be.revertedWith("caller has no access to the method");
  });

  it("should revert setReqBalance for invalid value", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    await expect(liquidityManager.setReqBalance(5)).to.be.revertedWith("LP Error: required balance valid range");
  });

  it("should set setReqBalance", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    await liquidityManager.setReqBalance(6);
    expect(await liquidityManager.reqBalance()).to.equal(6);
  });

  it("should successfully remove liquidity while some part of premium will be forfeited", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    await liquidityManager.addLiquidity(
      this.accounts.admin,
      this.oddzDefaultPool.address,
      BigNumber.from(utils.parseEther(this.transferTokenAmout)),
    );
    await liquidityManager.setManager(this.mockOptionManager.address);
    await this.mockOptionManager.lock(0);
    await provider.send("evm_snapshot", []);
    //execution day +2
    await provider.send("evm_increaseTime", [getExpiry(2)]);
    await this.mockOptionManager.unlock(0);
    await provider.send("evm_snapshot", []);
    //execution day +(2 +1)
    await provider.send("evm_increaseTime", [getExpiry(1)]);
    await expect(
      liquidityManager.addLiquidity(
        this.accounts.admin,
        this.oddzDefaultPool.address,
        BigNumber.from(utils.parseEther(this.transferTokenAmout)),
      ),
    ).to.emit(this.oddzDefaultPool, "AddLiquidity");
    expect(
      (await this.oddzDefaultPool.connect(this.signers.admin).liquidityProvider(this.accounts.admin))._premiumAllocated,
    ).to.equal("10000000000");
    await this.oddzDefaultPool.connect(this.signers.admin).getDaysActiveLiquidity(addDaysAndGetSeconds(3));
    const removeAmount = BigNumber.from(utils.parseEther(this.transferTokenAmout)).div(1000);
    await expect(liquidityManager.removeLiquidity(this.accounts.admin, this.oddzDefaultPool.address, removeAmount))
      .to.emit(this.oddzDefaultPool, "PremiumForfeited")
      .withArgs(this.accounts.admin, "5000000")
      .to.emit(this.oddzDefaultPool, "RemoveLiquidity")
      .withArgs(this.accounts.admin, "10000000000000000000000", "10000000000000000000000");
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);

    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);
  });

  it("should successfully get premium, remove liquidity after lockup", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    const amount = BigNumber.from(utils.parseEther(this.transferTokenAmout));
    await liquidityManager.addLiquidity(this.accounts.admin, this.oddzDefaultPool.address, amount);
    await liquidityManager.setManager(this.mockOptionManager.address);
    await this.mockOptionManager.connect(this.signers.admin1).lock(0);
    await provider.send("evm_snapshot", []);
    //execution day +2
    await provider.send("evm_increaseTime", [getExpiry(2)]);
    await this.mockOptionManager.connect(this.signers.admin1).unlock(0);
    await provider.send("evm_snapshot", []);
    //execution day +(2 +15)
    await provider.send("evm_increaseTime", [getExpiry(15)]);
    await expect(
      liquidityManager
        .connect(this.signers.admin1)
        .addLiquidity(
          this.accounts.admin1,
          this.oddzDefaultPool.address,
          BigNumber.from(utils.parseEther(this.transferTokenAmout)),
        ),
    ).to.emit(this.oddzDefaultPool, "AddLiquidity");
    expect((await this.oddzDefaultPool.connect(this.signers.admin).getPremium(this.accounts.admin)).rewards).to.equal(
      "10000000000",
    );
    await expect(liquidityManager.removeLiquidity(this.accounts.admin, this.oddzDefaultPool.address, amount))
      .to.emit(this.oddzDefaultPool, "RemoveLiquidity")
      .withArgs(this.accounts.admin, "10000000000000000000000000", "10000000000000000000000000");
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);

    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);
  });

  it("should not add duplicate pool to pool mapper", async function () {
    const hash = utils.keccak256(
      utils.defaultAbiCoder.encode(
        ["address", "uint256", "bytes32", "uint256"],
        ["0xfcb06d25357ef01726861b30b0b83e51482db417", 0, utils.formatBytes32String("B_S"), 7],
      ),
    );
    const oddzLiquidityPoolManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    expect(await oddzLiquidityPoolManager.poolMapper(hash, 0)).to.equal(this.oddzDefaultPool.address);
    const { oddzEthUsdCallBS30Pool } = await addMultiLiquidityPools(
      this.signers.admin,
      this.oddzLiquidityPoolManager,
      this.oddzDefaultPool.address,
    );

    await oddzLiquidityPoolManager.mapPool(
      "0xfcb06d25357ef01726861b30b0b83e51482db417",
      OptionType.Call,
      utils.formatBytes32String("B_S"),
      7,
      [this.oddzDefaultPool.address, oddzEthUsdCallBS30Pool.address, this.oddzDefaultPool.address],
    );
    expect(await oddzLiquidityPoolManager.poolMapper(hash, 0)).to.equal(this.oddzDefaultPool.address);
    expect(await oddzLiquidityPoolManager.poolMapper(hash, 1)).to.equal(oddzEthUsdCallBS30Pool.address);
    await expect(oddzLiquidityPoolManager.poolMapper(hash, 2)).to.be.reverted;
  });

  it("should revert pools length should be <= 10 while map pools", async function () {
    const { oddzEthUsdCallBS30Pool } = await addMultiLiquidityPools(
      this.signers.admin,
      this.oddzLiquidityPoolManager,
      this.oddzDefaultPool.address,
    );
    await expect(
      this.oddzLiquidityPoolManager
        .connect(this.signers.admin)
        .mapPool("0xfcb06d25357ef01726861b30b0b83e51482db417", OptionType.Call, utils.formatBytes32String("B_S"), 30, [
          this.oddzDefaultPool.address,
          oddzEthUsdCallBS30Pool.address,
          this.oddzDefaultPool.address,
          this.oddzDefaultPool.address,
          this.oddzDefaultPool.address,
          this.oddzDefaultPool.address,
          this.oddzDefaultPool.address,
          this.oddzDefaultPool.address,
          this.oddzDefaultPool.address,
          this.oddzDefaultPool.address,
          this.oddzDefaultPool.address,
        ]),
    ).to.be.revertedWith("LP Error: pools length should be <= 10");
  });

  it("should successfully get premium, remove liquidity after lockup for multiple pools", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    await liquidityManager.addLiquidity(
      this.accounts.admin,
      this.oddzDefaultPool.address,
      BigNumber.from(utils.parseEther(this.transferTokenAmout)),
    );
    const { oddzEthUsdCallBS1Pool, oddzEthUsdCallBS30Pool } = await addMultiLiquidityPools(
      this.signers.admin,
      this.oddzLiquidityPoolManager,
      this.oddzDefaultPool.address,
    );
    await liquidityManager.addLiquidity(
      this.accounts.admin,
      oddzEthUsdCallBS1Pool.address,
      BigNumber.from(utils.parseEther(this.transferTokenAmout)),
    );
    await liquidityManager.addLiquidity(
      this.accounts.admin,
      oddzEthUsdCallBS30Pool.address,
      BigNumber.from(utils.parseEther(this.transferTokenAmout)),
    );
    await liquidityManager.setManager(this.mockOptionManager.address);
    await this.mockOptionManager.connect(this.signers.admin1).lock(0);
    await provider.send("evm_snapshot", []);
    //execution day +2
    await provider.send("evm_increaseTime", [getExpiry(2)]);
    await this.mockOptionManager.connect(this.signers.admin1).unlock(0);
    await provider.send("evm_snapshot", []);
    //execution day +(2 +15)
    await provider.send("evm_increaseTime", [getExpiry(15)]);
    await this.oddzDefaultPool.connect(this.signers.admin).getDaysActiveLiquidity(addDaysAndGetSeconds(17));
    await oddzEthUsdCallBS1Pool.connect(this.signers.admin).getDaysActiveLiquidity(addDaysAndGetSeconds(17));
    await oddzEthUsdCallBS30Pool.connect(this.signers.admin).getDaysActiveLiquidity(addDaysAndGetSeconds(17));

    expect((await this.oddzDefaultPool.connect(this.signers.admin).getPremium(this.accounts.admin)).rewards).to.equal(
      "3333333333",
    );
    expect((await oddzEthUsdCallBS1Pool.connect(this.signers.admin).getPremium(this.accounts.admin)).rewards).to.equal(
      "3333333333",
    );
    expect((await oddzEthUsdCallBS30Pool.connect(this.signers.admin).getPremium(this.accounts.admin)).rewards).to.equal(
      "3333333333",
    );

    await liquidityManager.setReqBalance(10);

    await this.oddzDefaultPool.connect(this.signers.admin).getDaysActiveLiquidity(addDaysAndGetSeconds(3));
    const removeAmount = BigNumber.from(utils.parseEther(this.transferTokenAmout));
    await expect(liquidityManager.removeLiquidity(this.accounts.admin, this.oddzDefaultPool.address, removeAmount))
      .to.emit(this.oddzDefaultPool, "RemoveLiquidity")
      .withArgs(this.accounts.admin, "10000000000000000000000000", "10000000000000000000000000");

    await expect(liquidityManager.removeLiquidity(this.accounts.admin, oddzEthUsdCallBS1Pool.address, removeAmount))
      .to.emit(oddzEthUsdCallBS1Pool, "RemoveLiquidity")
      .withArgs(this.accounts.admin, "10000000000000000000000000", "10000000000000000000000000");

    await expect(liquidityManager.removeLiquidity(this.accounts.admin, oddzEthUsdCallBS30Pool.address, removeAmount))
      .to.emit(oddzEthUsdCallBS30Pool, "RemoveLiquidity")
      .withArgs(this.accounts.admin, "10000000000000000000000000", "10000000000000000000000000");

    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);

    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);
  });

  it("should successfully move liquidity between pools", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    await liquidityManager.addLiquidity(
      this.accounts.admin,
      this.oddzDefaultPool.address,
      BigNumber.from(utils.parseEther(this.transferTokenAmout)),
    );
    const { oddzEthUsdCallBS1Pool, oddzEthUsdCallBS30Pool } = await addMultiLiquidityPools(
      this.signers.admin,
      this.oddzLiquidityPoolManager,
      this.oddzDefaultPool.address,
    );
    const { oddzBtcUsdCallBS1Pool } = await addBTCLiquidityPool(
      this.signers.admin,
      this.oddzLiquidityPoolManager,
      this.oddzDefaultPool.address,
    );
    await liquidityManager.addLiquidity(
      this.accounts.admin,
      oddzEthUsdCallBS30Pool.address,
      BigNumber.from(utils.parseEther(this.transferTokenAmout)),
    );

    const poolTransfer = await getPoolTransferStruct(
      [this.oddzDefaultPool.address, oddzEthUsdCallBS30Pool.address],
      [oddzEthUsdCallBS1Pool.address, oddzEthUsdCallBS30Pool.address, oddzBtcUsdCallBS1Pool.address],
      [BigNumber.from(utils.parseEther("8000000")), BigNumber.from(utils.parseEther("5000000"))],
      [
        BigNumber.from(utils.parseEther("5000000")),
        BigNumber.from(utils.parseEther("6000000")),
        BigNumber.from(utils.parseEther("2000000")),
      ],
    );

    await liquidityManager.move(this.accounts.admin, poolTransfer);

    expect(await oddzEthUsdCallBS1Pool.connect(this.signers.admin).totalBalance()).to.be.equal(
      BigNumber.from(utils.parseEther("5000000")),
    );
    expect(await oddzBtcUsdCallBS1Pool.connect(this.signers.admin).totalBalance()).to.be.equal(
      BigNumber.from(utils.parseEther("2000000")),
    );
    expect(await this.oddzDefaultPool.connect(this.signers.admin).totalBalance()).to.be.equal(
      BigNumber.from(utils.parseEther("2000000")),
    );
    expect(await oddzEthUsdCallBS30Pool.connect(this.signers.admin).totalBalance()).to.be.equal(
      BigNumber.from(utils.parseEther("11000000")),
    );
  });

  it("should revert while moving liquidity between pools", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    await liquidityManager.addLiquidity(
      this.accounts.admin,
      this.oddzDefaultPool.address,
      BigNumber.from(utils.parseEther(this.transferTokenAmout)),
    );

    const { oddzEthUsdCallBS1Pool } = await addMultiLiquidityPools(
      this.signers.admin,
      this.oddzLiquidityPoolManager,
      this.oddzDefaultPool.address,
    );

    const poolTransfer = await getPoolTransferStruct(
      [this.oddzDefaultPool.address],
      [oddzEthUsdCallBS1Pool.address],
      [BigNumber.from(utils.parseEther("1000000"))],
      [BigNumber.from(utils.parseEther("1000000"))],
    );

    await liquidityManager.move(this.accounts.admin, poolTransfer);

    await expect(liquidityManager.move(this.accounts.admin, poolTransfer)).to.be.revertedWith(
      "LP Error: Pool transfer not allowed",
    );

    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(7) + 1]);
    await this.oddzDefaultPool.connect(this.signers.admin).getDaysActiveLiquidity(addDaysAndGetSeconds(7));
    expect(await liquidityManager.move(this.accounts.admin, poolTransfer)).to.be.ok;

    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);
  });

  it("should revert with not enough funds while move liquidity between pools", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    await liquidityManager.addLiquidity(
      this.accounts.admin,
      this.oddzDefaultPool.address,
      BigNumber.from(utils.parseEther(this.transferTokenAmout)),
    );

    const { oddzEthUsdCallBS1Pool } = await addMultiLiquidityPools(
      this.signers.admin,
      this.oddzLiquidityPoolManager,
      this.oddzDefaultPool.address,
    );

    const poolTransfer = await getPoolTransferStruct(
      [this.oddzDefaultPool.address],
      [oddzEthUsdCallBS1Pool.address],
      [BigNumber.from(utils.parseEther(this.transferTokenAmout))],
      [BigNumber.from(utils.parseEther(this.transferTokenAmout))],
    );

    await expect(liquidityManager.move(this.accounts.admin, poolTransfer)).to.be.revertedWith(
      "LP Error: Not enough funds in the pool. Please lower the amount.",
    );
  });

  it("should revert while moving liquidity to invalid pool address", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    await liquidityManager.addLiquidity(
      this.accounts.admin,
      this.oddzDefaultPool.address,
      BigNumber.from(utils.parseEther(this.transferTokenAmout)),
    );

    const fakePool = (await deployContract(
      this.signers.admin,
      OddzBtcUsdCallBS1PoolArtifact,
      [],
    )) as OddzEthUsdCallBS1Pool;

    await fakePool.transferOwnership(this.oddzLiquidityPoolManager.address);

    const poolTransfer = await getPoolTransferStruct(
      [this.oddzDefaultPool.address],
      [fakePool.address],
      [BigNumber.from(utils.parseEther("10000"))],
      [BigNumber.from(utils.parseEther("10000"))],
    );

    await expect(liquidityManager.move(this.accounts.admin, poolTransfer)).to.be.revertedWith("LP Error: Invalid pool");
  });

  it("should allow move liquidity from disable pool", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);

    const { oddzEthUsdCallBS1Pool, oddzEthUsdCallBS30Pool } = await addMultiLiquidityPools(
      this.signers.admin,
      this.oddzLiquidityPoolManager,
      this.oddzDefaultPool.address,
    );

    expect(await liquidityManager.poolExposure(oddzEthUsdCallBS1Pool.address)).to.equal(1);
    expect(await liquidityManager.poolExposure(oddzEthUsdCallBS30Pool.address)).to.equal(5);
    expect(await liquidityManager.poolExposure(this.oddzDefaultPool.address)).to.equal(5);
    expect(await liquidityManager.disabledPools(oddzEthUsdCallBS1Pool.address)).to.equal(false);

    await liquidityManager.addLiquidity(
      this.accounts.admin,
      oddzEthUsdCallBS1Pool.address,
      BigNumber.from(utils.parseEther("10000")),
    );

    await liquidityManager.addLiquidity(
      this.accounts.admin,
      oddzEthUsdCallBS30Pool.address,
      BigNumber.from(utils.parseEther("10000")),
    );

    await liquidityManager.mapPool(
      "0xfcb06d25357ef01726861b30b0b83e51482db417",
      OptionType.Call,
      utils.formatBytes32String("B_S"),
      1,
      [this.oddzDefaultPool.address, oddzEthUsdCallBS30Pool.address],
    );

    expect(await liquidityManager.poolExposure(oddzEthUsdCallBS1Pool.address)).to.equal(0);
    expect(await liquidityManager.poolExposure(oddzEthUsdCallBS30Pool.address)).to.equal(5);
    expect(await liquidityManager.poolExposure(this.oddzDefaultPool.address)).to.equal(5);
    expect(await liquidityManager.disabledPools(oddzEthUsdCallBS1Pool.address)).to.equal(true);

    const poolTransfer = await getPoolTransferStruct(
      [oddzEthUsdCallBS1Pool.address],
      [this.oddzDefaultPool.address],
      [BigNumber.from(utils.parseEther("10000"))],
      [BigNumber.from(utils.parseEther("10000"))],
    );

    await expect(liquidityManager.move(this.accounts.admin, poolTransfer)).to.be.ok;
  });

  it("should distribute negative premium to LPs", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    const mockOptionManager = await this.mockOptionManager.connect(this.signers.admin);
    await liquidityManager.addLiquidity(
      this.accounts.admin,
      this.oddzDefaultPool.address,
      BigNumber.from(utils.parseEther(this.transferTokenAmout)),
    );
    await liquidityManager.setManager(this.mockOptionManager.address);
    await expect(mockOptionManager.send(this.accounts.admin, 10000000000000, 0)).to.emit(this.oddzDefaultPool, "Loss");

    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(2)]);
    await this.oddzDefaultPool.connect(this.signers.admin).getDaysActiveLiquidity(addDaysAndGetSeconds(2));

    await expect(
      liquidityManager.removeLiquidity(
        this.accounts.admin,
        this.oddzDefaultPool.address,
        BigNumber.from(utils.parseEther(this.transferTokenAmout)),
      ),
    ).to.be.revertedWith("LP Error: Not enough funds in the pool. Please lower the amount.");

    const { rewards, isNegative } = await this.oddzDefaultPool
      .connect(this.signers.admin)
      .getPremium(this.accounts.admin);

    expect(rewards).to.equal("990000000000");
    expect(isNegative).to.equal(true);

    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);
  });

  it("should distribute negative premium to LPs while user has less existing premiums", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    const mockOptionManager = await this.mockOptionManager.connect(this.signers.admin);
    await liquidityManager.addLiquidity(
      this.accounts.admin,
      this.oddzDefaultPool.address,
      BigNumber.from(utils.parseEther(this.transferTokenAmout)),
    );
    await liquidityManager.setManager(this.mockOptionManager.address);
    await mockOptionManager.lock(0);
    await mockOptionManager.unlock(0);

    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(1)]);

    // loss
    await mockOptionManager.send(this.accounts.admin, 10000000000000, 1);

    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(2)]);

    await this.oddzDefaultPool.connect(this.signers.admin).getDaysActiveLiquidity(addDaysAndGetSeconds(3));
    const { rewards, isNegative } = await this.oddzDefaultPool
      .connect(this.signers.admin)
      .getPremium(this.accounts.admin);

    expect(rewards).to.equal("980000000000");
    expect(isNegative).to.equal(true);

    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);
  });

  it("should distribute negative premium to LPs while user has more existing premiums", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    const mockOptionManager = await this.mockOptionManager.connect(this.signers.admin);
    await liquidityManager.addLiquidity(
      this.accounts.admin,
      this.oddzDefaultPool.address,
      BigNumber.from(utils.parseEther(this.transferTokenAmout)),
    );
    await liquidityManager.setManager(this.mockOptionManager.address);
    await mockOptionManager.lock(0);
    await mockOptionManager.unlock(0);

    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(2)]);
    // loss
    await mockOptionManager.send(this.accounts.admin, 1000000000, 1);

    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(1)]);

    await this.oddzDefaultPool.connect(this.signers.admin).getDaysActiveLiquidity(addDaysAndGetSeconds(3));
    const { rewards, isNegative } = await this.oddzDefaultPool
      .connect(this.signers.admin)
      .getPremium(this.accounts.admin);

    expect(rewards).to.equal("19000000000");
    expect(isNegative).to.equal(false);

    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);
  });

  it("should withdraw premium successfully", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    const amount = BigNumber.from(utils.parseEther(this.transferTokenAmout));
    await liquidityManager.addLiquidity(this.accounts.admin, this.oddzDefaultPool.address, amount);
    await liquidityManager.setManager(this.mockOptionManager.address);
    await this.mockOptionManager.connect(this.signers.admin1).lock(0);
    await provider.send("evm_snapshot", []);
    //execution day +2
    await provider.send("evm_increaseTime", [getExpiry(2)]);
    await this.mockOptionManager.connect(this.signers.admin1).unlock(0);
    await provider.send("evm_snapshot", []);
    //execution day +(2 +15)
    await provider.send("evm_increaseTime", [getExpiry(15)]);
    await expect(
      liquidityManager
        .connect(this.signers.admin1)
        .addLiquidity(
          this.accounts.admin1,
          this.oddzDefaultPool.address,
          BigNumber.from(utils.parseEther(this.transferTokenAmout)),
        ),
    ).to.emit(this.oddzDefaultPool, "AddLiquidity");
    expect((await this.oddzDefaultPool.connect(this.signers.admin).getPremium(this.accounts.admin)).rewards).to.equal(
      "10000000000",
    );
    await expect(liquidityManager.withdrawProfits(this.oddzDefaultPool.address))
      .to.emit(this.oddzDefaultPool, "PremiumCollected")
      .withArgs(this.accounts.admin, "10000000000");

    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);

    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);
  });

  it("should withdraw premium successfully while add liquidity", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    const amount = BigNumber.from(utils.parseEther(this.transferTokenAmout));
    await liquidityManager.addLiquidity(this.accounts.admin, this.oddzDefaultPool.address, amount);
    await liquidityManager.setManager(this.mockOptionManager.address);
    await this.mockOptionManager.connect(this.signers.admin1).lock(0);
    await provider.send("evm_snapshot", []);
    //execution day +2
    await provider.send("evm_increaseTime", [getExpiry(2)]);
    await this.mockOptionManager.connect(this.signers.admin1).unlock(0);
    await provider.send("evm_snapshot", []);
    //execution day +(2 +15)
    await provider.send("evm_increaseTime", [getExpiry(15)]);
    await expect(
      liquidityManager
        .connect(this.signers.admin1)
        .addLiquidity(
          this.accounts.admin1,
          this.oddzDefaultPool.address,
          BigNumber.from(utils.parseEther(this.transferTokenAmout)),
        ),
    ).to.emit(this.oddzDefaultPool, "AddLiquidity");
    expect((await this.oddzDefaultPool.connect(this.signers.admin).getPremium(this.accounts.admin)).rewards).to.equal(
      "10000000000",
    );
    await expect(
      liquidityManager.addLiquidity(this.accounts.admin, this.oddzDefaultPool.address, utils.parseEther("1000000")),
    )
      .to.emit(this.oddzDefaultPool, "PremiumCollected")
      .withArgs(this.accounts.admin, "10000000000");
    expect((await this.oddzDefaultPool.connect(this.signers.admin).getPremium(this.accounts.admin)).rewards).to.equal(
      "0",
    );

    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);

    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);
  });

  it("should add liquidity & buy option with lock liquidity across all 21 pools successfully", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    const amount = BigNumber.from(utils.parseEther("10000"));
    await liquidityManager.addLiquidity(this.accounts.admin, this.oddzDefaultPool.address, amount);
    await liquidityManager.setManager(this.mockOptionManager.address);

    const {
      oddzEthUsdCallBS1Pool,
      oddzEthUsdCallBS2Pool,
      oddzEthUsdCallBS7Pool,
      oddzEthUsdCallBS14Pool,
      oddzEthUsdCallBS30Pool,
      oddzEthUsdPutBS1Pool,
      oddzEthUsdPutBS2Pool,
      oddzEthUsdPutBS7Pool,
      oddzEthUsdPutBS14Pool,
      oddzEthUsdPutBS30Pool,
      oddzBtcUsdCallBS1Pool,
      oddzBtcUsdCallBS2Pool,
      oddzBtcUsdCallBS7Pool,
      oddzBtcUsdCallBS14Pool,
      oddzBtcUsdCallBS30Pool,
      oddzBtcUsdPutBS1Pool,
      oddzBtcUsdPutBS2Pool,
      oddzBtcUsdPutBS7Pool,
      oddzBtcUsdPutBS14Pool,
      oddzBtcUsdPutBS30Pool,
    } = await addAllPoolsWithLiquidity(
      this.signers.admin,
      this.oddzLiquidityPoolManager,
      this.oddzDefaultPool.address,
      amount,
    );
    await this.mockOptionManager
      .connect(this.signers.admin1)
      .lockWithParams(0, "0xfcb06d25357ef01726861b30b0b83e51482db417", OptionType.Call);
    await this.mockOptionManager
      .connect(this.signers.admin1)
      .lockWithParams(1, "0xfcb06d25357ef01726861b30b0b83e51482db417", OptionType.Put);
    await this.mockOptionManager
      .connect(this.signers.admin1)
      .lockWithParams(2, "0x8c461e897bBE3E4DDf8FD25be25f91Aac161a2f0", OptionType.Call);
    await this.mockOptionManager
      .connect(this.signers.admin1)
      .lockWithParams(3, "0x8c461e897bBE3E4DDf8FD25be25f91Aac161a2f0", OptionType.Put);

    expect(await this.oddzDefaultPool.connect(this.signers.admin).lockedAmount()).to.be.equal(666666666664);
    expect(await oddzEthUsdCallBS1Pool.connect(this.signers.admin).lockedAmount()).to.be.equal(166666666666);
    expect(await oddzEthUsdCallBS2Pool.connect(this.signers.admin).lockedAmount()).to.be.equal(166666666667);
    expect(await oddzEthUsdCallBS7Pool.connect(this.signers.admin).lockedAmount()).to.be.equal(166666666667);
    expect(await oddzEthUsdCallBS14Pool.connect(this.signers.admin).lockedAmount()).to.be.equal(166666666667);
    expect(await oddzEthUsdCallBS30Pool.connect(this.signers.admin).lockedAmount()).to.be.equal(166666666667);
    expect(await oddzEthUsdPutBS1Pool.connect(this.signers.admin).lockedAmount()).to.be.equal(166666666666);
    expect(await oddzEthUsdPutBS2Pool.connect(this.signers.admin).lockedAmount()).to.be.equal(166666666667);
    expect(await oddzEthUsdPutBS7Pool.connect(this.signers.admin).lockedAmount()).to.be.equal(166666666667);
    expect(await oddzEthUsdPutBS14Pool.connect(this.signers.admin).lockedAmount()).to.be.equal(166666666667);
    expect(await oddzEthUsdPutBS30Pool.connect(this.signers.admin).lockedAmount()).to.be.equal(166666666667);
    expect(await oddzBtcUsdCallBS1Pool.connect(this.signers.admin).lockedAmount()).to.be.equal(166666666666);
    expect(await oddzBtcUsdCallBS2Pool.connect(this.signers.admin).lockedAmount()).to.be.equal(166666666667);
    expect(await oddzBtcUsdCallBS7Pool.connect(this.signers.admin).lockedAmount()).to.be.equal(166666666667);
    expect(await oddzBtcUsdCallBS14Pool.connect(this.signers.admin).lockedAmount()).to.be.equal(166666666667);
    expect(await oddzBtcUsdCallBS30Pool.connect(this.signers.admin).lockedAmount()).to.be.equal(166666666667);
    expect(await oddzBtcUsdPutBS1Pool.connect(this.signers.admin).lockedAmount()).to.be.equal(166666666666);
    expect(await oddzBtcUsdPutBS2Pool.connect(this.signers.admin).lockedAmount()).to.be.equal(166666666667);
    expect(await oddzBtcUsdPutBS7Pool.connect(this.signers.admin).lockedAmount()).to.be.equal(166666666667);
    expect(await oddzBtcUsdPutBS14Pool.connect(this.signers.admin).lockedAmount()).to.be.equal(166666666667);
    expect(await oddzBtcUsdPutBS30Pool.connect(this.signers.admin).lockedAmount()).to.be.equal(166666666667);
  });

  it("should revert add liquidity for invalid caller", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    const depositAmount = 1000;
    await expect(
      liquidityManager.addLiquidity(this.accounts.admin1, this.oddzDefaultPool.address, depositAmount),
    ).to.be.revertedWith("LP Error: invalid caller");
  });

  it("should be able to successfully set Timelocker", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    await expect(liquidityManager.setTimeLocker(this.mockOptionManager.address)).to.emit(
      liquidityManager,
      "RoleGranted",
    );
  });

  it("should revert sender must be an admin to grant while set Timelocker", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin1);
    await expect(liquidityManager.setTimeLocker(this.mockOptionManager.address)).to.be.revertedWith(
      "sender must be an admin to grant",
    );
  });

  it("should revert invalid address used to set Timelocker", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin1);
    await expect(liquidityManager.setTimeLocker(constants.AddressZero)).to.be.revertedWith(
      "Invalid timelocker address",
    );
  });

  it("should be able to successfully remove Timelocker", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    await liquidityManager.setTimeLocker(this.accounts.admin1);
    await expect(liquidityManager.removeTimeLocker(this.accounts.admin1)).to.emit(liquidityManager, "RoleRevoked");
  });

  it("should revert sender must be an admin to grant while remove Timelocker", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin1);
    await expect(liquidityManager.removeTimeLocker(this.accounts.admin1)).to.be.revertedWith(
      "sender must be an admin to revoke",
    );
  });

  it("should revert if the method addAllowedMaxExpiration is not invoked by the owner", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin1);
    await expect(liquidityManager.addAllowedMaxExpiration(10)).to.be.revertedWith("caller has no access to the method");
  });

  it("should revert if we don't have valid mapPeriod", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    await expect(liquidityManager.mapPeriod(10, 11)).to.be.revertedWith("invalid maximum expiration");
  });

  it("should revert if the liquidity pool is not exposed to any options", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    const amount = BigNumber.from(utils.parseEther("10000"));

    const fp = (await deployContract(this.signers.admin, OddzEthUsdCallBS1PoolArtifact, [])) as OddzEthUsdCallBS1Pool;

    await expect(liquidityManager.addLiquidity(this.accounts.admin, fp.address, amount)).to.be.revertedWith(
      "Invalid pool",
    );
  });

  it("should revert if trying to withdraw liquidity from liquidity pool which is not exposed to any options", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    const amount = BigNumber.from(utils.parseEther("10000"));

    const fp = (await deployContract(this.signers.admin, OddzEthUsdCallBS1PoolArtifact, [])) as OddzEthUsdCallBS1Pool;

    await expect(liquidityManager.removeLiquidity(this.accounts.admin, fp.address, amount)).to.be.revertedWith(
      "Invalid pool",
    );
  });

  it("should revert if premium is equal to 0 while withdrawing profits", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    const amount = BigNumber.from(utils.parseEther(this.transferTokenAmout));
    await liquidityManager.addLiquidity(this.accounts.admin, this.oddzDefaultPool.address, amount);
    await liquidityManager.setManager(this.mockOptionManager.address);

    await expect(liquidityManager.withdrawProfits(this.oddzDefaultPool.address)).to.be.revertedWith(
      "No premium allocated",
    );
  });

  it("should be able to assign the contract address as the strategy manager if the contract is assigned as a strategy manager", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    await expect(liquidityManager.setStrategyManager(liquidityManager.address)).to.ok;
  });

  it("should revert if we try to assign any wallet address as the strategy manager", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    await expect(liquidityManager.setStrategyManager(this.accounts.admin)).to.be.revertedWith(
      "invalid strategy manager",
    );
  });

  it("should revert if the liquidity amount provide is larger than the size of the liquidity pool", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    const amount1 = BigNumber.from(utils.parseEther("0.01"));

    await liquidityManager.addLiquidity(this.accounts.admin, this.oddzDefaultPool.address, amount1);
    await liquidityManager.setManager(this.mockOptionManager.address);

    const amount2 = BigNumber.from(utils.parseEther("0.1"));
    await expect(
      this.mockOptionManager
        .connect(this.signers.admin1)
        .lockWithCustomParams(
          0,
          "0xfcb06d25357ef01726861b30b0b83e51482db417",
          OptionType.Call,
          amount2,
          179000,
          utils.formatBytes32String("B_S"),
        ),
    ).to.be.revertedWith("Amount is too large");
  });

  it("should successfully be able to lock liquidity as low as 1 wei", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);

    const amount1 = BigNumber.from(utils.parseEther("10"));

    const { oddzEthUsdCallBS1Pool, oddzEthUsdCallBS30Pool } = await addMultiLiquidityPools(
      this.signers.admin,
      this.oddzLiquidityPoolManager,
      this.oddzDefaultPool.address,
    );
    await liquidityManager.addLiquidity(this.accounts.admin, oddzEthUsdCallBS1Pool.address, amount1);
    await liquidityManager.addLiquidity(this.accounts.admin, oddzEthUsdCallBS30Pool.address, amount1);
    const { oddzBtcUsdCallBS1Pool } = await addBTCLiquidityPool(
      this.signers.admin,
      this.oddzLiquidityPoolManager,
      this.oddzDefaultPool.address,
    );
    await liquidityManager.addLiquidity(this.accounts.admin, oddzBtcUsdCallBS1Pool.address, amount1);

    const amount2 = BigNumber.from(utils.parseEther("50"));
    await liquidityManager.addLiquidity(this.accounts.admin, this.oddzDefaultPool.address, amount2);
    await liquidityManager.setManager(this.mockOptionManager.address);

    await this.mockOptionManager
      .connect(this.signers.admin1)
      .lockWithCustomParams(
        0,
        "0xfcb06d25357ef01726861b30b0b83e51482db417",
        OptionType.Call,
        1,
        179000,
        utils.formatBytes32String("B_S"),
      );
  });

  it("should distribute the negative reward to the LPs", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    const mockOptionManager = await this.mockOptionManager.connect(this.signers.admin);
    await liquidityManager.addLiquidity(
      this.accounts.admin,
      this.oddzDefaultPool.address,
      BigNumber.from(utils.parseEther(this.transferTokenAmout)),
    );
    await liquidityManager.setManager(this.mockOptionManager.address);

    // First loss to the LPool.
    await expect(mockOptionManager.send(this.accounts.admin, 10000000000000, 0)).to.emit(this.oddzDefaultPool, "Loss");

    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(2)]);
    await this.oddzDefaultPool.connect(this.signers.admin).getDaysActiveLiquidity(addDaysAndGetSeconds(2));

    await liquidityManager.addLiquidity(
      this.accounts.admin,
      this.oddzDefaultPool.address,
      BigNumber.from(utils.parseEther(this.transferTokenAmout)),
    );

    // Second loss to the LPool.
    await expect(mockOptionManager.send(this.accounts.admin, 10000000000000, 1)).to.emit(this.oddzDefaultPool, "Loss");

    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(2)]);
    await this.oddzDefaultPool.connect(this.signers.admin).getDaysActiveLiquidity(addDaysAndGetSeconds(2));

    const { rewards, isNegative } = await this.oddzDefaultPool
      .connect(this.signers.admin)
      .getPremium(this.accounts.admin);

    expect(rewards).to.equal("1980000000000");
    expect(isNegative).to.equal(true);

    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);
  });

  it("should revert with invalid day active liquidity if we try to query for wrong day liquidity", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    const mockOptionManager = await this.mockOptionManager.connect(this.signers.admin);
    await liquidityManager.addLiquidity(
      this.accounts.admin,
      this.oddzDefaultPool.address,
      BigNumber.from(utils.parseEther(this.transferTokenAmout)),
    );
    await liquidityManager.setManager(this.mockOptionManager.address);

    // First loss to the LPool.
    await expect(mockOptionManager.send(this.accounts.admin, 10000000000000, 0)).to.emit(this.oddzDefaultPool, "Loss");

    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(2)]);
    await this.oddzDefaultPool.connect(this.signers.admin).getDaysActiveLiquidity(addDaysAndGetSeconds(2));

    await liquidityManager.addLiquidity(
      this.accounts.admin,
      this.oddzDefaultPool.address,
      BigNumber.from(utils.parseEther(this.transferTokenAmout)),
    );

    // Second loss to the LPool.
    await expect(mockOptionManager.send(this.accounts.admin, 10000000000000, 1)).to.emit(this.oddzDefaultPool, "Loss");

    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(2)]);
    await this.oddzDefaultPool.connect(this.signers.admin).getDaysActiveLiquidity(addDaysAndGetSeconds(2));

    // third loss to the LPool.
    await expect(mockOptionManager.send(this.accounts.admin, 10000000000000, 2)).to.emit(this.oddzDefaultPool, "Loss");

    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(2)]);
    await this.oddzDefaultPool.connect(this.signers.admin).getDaysActiveLiquidity(addDaysAndGetSeconds(2));

    await expect(this.oddzDefaultPool.connect(this.signers.admin).getPremium(this.accounts.admin)).to.be.revertedWith(
      "invalid day active liquidity",
    );

    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);
  });

  it("should successfully get the balance of the liquidity provider", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    await liquidityManager.addLiquidity(
      this.accounts.admin,
      this.oddzDefaultPool.address,
      BigNumber.from(utils.parseEther("0.000000001")),
    );
    await liquidityManager.setManager(this.mockOptionManager.address);

    const amount = await this.oddzDefaultPool.connect(this.signers.admin).getBalance(this.accounts.admin);
    expect(amount).to.equal(1000000000);
  });

  it("should be able to successfully remove the liquidity", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    const mockOptionManager = await this.mockOptionManager.connect(this.signers.admin);
    await liquidityManager.addLiquidity(
      this.accounts.admin,
      this.oddzDefaultPool.address,
      BigNumber.from(utils.parseEther(this.transferTokenAmout)),
    );
    await liquidityManager.setManager(this.mockOptionManager.address);
    await expect(mockOptionManager.send(this.accounts.admin, 10000000000000, 0)).to.emit(this.oddzDefaultPool, "Loss");

    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(2)]);
    await this.oddzDefaultPool.connect(this.signers.admin).getDaysActiveLiquidity(addDaysAndGetSeconds(2));

    await liquidityManager.removeLiquidity(
      this.accounts.admin,
      this.oddzDefaultPool.address,
      BigNumber.from(utils.parseEther("0.000001")),
    );

    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);
  });

  it("should be successfully able to distribute negative premium with less reward", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    const mockOptionManager = await this.mockOptionManager.connect(this.signers.admin);

    await liquidityManager.addLiquidity(
      this.accounts.admin,
      this.oddzDefaultPool.address,
      BigNumber.from(utils.parseEther("1000000")),
    );

    await liquidityManager.setManager(this.mockOptionManager.address);

    await mockOptionManager.lock(0);
    await mockOptionManager.lock(1);
    await mockOptionManager.lock(2);

    await expect(mockOptionManager.send(this.accounts.admin, 50000000000, 3)).to.emit(this.oddzDefaultPool, "Loss");

    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(1)]);

    await this.oddzDefaultPool.connect(this.signers.admin).getDaysActiveLiquidity(addDaysAndGetSeconds(1));

    let rewards, negative;

    [rewards, negative] = await this.oddzDefaultPool.getPremium(this.accounts.admin);

    expect(rewards).to.equal("40000000000");
    expect(negative).to.equal(true);

    await mockOptionManager.unlock(0);
    await mockOptionManager.unlock(1);
    await mockOptionManager.unlock(2);
    await expect(mockOptionManager.send(this.accounts.admin, 2000000, 4)).to.emit(this.oddzDefaultPool, "Profit");
    await expect(mockOptionManager.send(this.accounts.admin, 2000000, 5)).to.emit(this.oddzDefaultPool, "Profit");

    await liquidityManager.addLiquidity(
      this.accounts.admin,
      this.oddzDefaultPool.address,
      BigNumber.from(utils.parseEther("500000")),
    );

    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(1)]);

    await this.oddzDefaultPool.connect(this.signers.admin).getDaysActiveLiquidity(addDaysAndGetSeconds(1));

    [rewards, negative] = await this.oddzDefaultPool.getPremium(this.accounts.admin);

    expect(rewards).to.equal("9996000000");
    expect(negative).to.equal(false);

    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);
  });

  it("should successfully be able to distribute negative premium with more reward", async function () {
    const liquidityManager = await this.oddzLiquidityPoolManager.connect(this.signers.admin);
    const mockOptionManager = await this.mockOptionManager.connect(this.signers.admin);

    await liquidityManager.addLiquidity(
      this.accounts.admin,
      this.oddzDefaultPool.address,
      BigNumber.from(utils.parseEther("5000")),
    );

    await liquidityManager.setManager(this.mockOptionManager.address);

    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(1)]);

    await this.oddzDefaultPool.connect(this.signers.admin).getDaysActiveLiquidity(addDaysAndGetSeconds(1));

    await expect(mockOptionManager.send(this.accounts.admin, 1000000000, 0)).to.emit(this.oddzDefaultPool, "Profit");
    await expect(mockOptionManager.send(this.accounts.admin, 1000000000, 1)).to.emit(this.oddzDefaultPool, "Profit");
    await expect(mockOptionManager.send(this.accounts.admin, 1000000000, 2)).to.emit(this.oddzDefaultPool, "Profit");
    await expect(mockOptionManager.send(this.accounts.admin, 1000000000, 3)).to.emit(this.oddzDefaultPool, "Profit");
    await expect(mockOptionManager.send(this.accounts.admin, 1000000000, 4)).to.emit(this.oddzDefaultPool, "Profit");
    await expect(mockOptionManager.send(this.accounts.admin, 1000000000, 5)).to.emit(this.oddzDefaultPool, "Profit");
    await expect(mockOptionManager.send(this.accounts.admin, 1000000000, 6)).to.emit(this.oddzDefaultPool, "Profit");
    await expect(mockOptionManager.send(this.accounts.admin, 1000000000, 7)).to.emit(this.oddzDefaultPool, "Profit");
    await expect(mockOptionManager.send(this.accounts.admin, 1000000000, 8)).to.emit(this.oddzDefaultPool, "Profit");
    await expect(mockOptionManager.send(this.accounts.admin, 1000000000, 9)).to.emit(this.oddzDefaultPool, "Profit");

    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(1)]);

    await this.oddzDefaultPool.connect(this.signers.admin).getDaysActiveLiquidity(addDaysAndGetSeconds(1));

    await liquidityManager.addLiquidity(
      this.accounts.admin,
      this.oddzDefaultPool.address,
      BigNumber.from(utils.parseEther("500000")),
    );

    await expect(mockOptionManager.send(this.accounts.admin, 100000000000, 10)).to.emit(this.oddzDefaultPool, "Loss");

    await provider.send("evm_snapshot", []);
    await provider.send("evm_increaseTime", [getExpiry(1)]);

    await liquidityManager.addLiquidity(
      this.accounts.admin,
      this.oddzDefaultPool.address,
      BigNumber.from(utils.parseEther("500000")),
    );

    const { rewards, isNegative } = await this.oddzDefaultPool.getPremium(this.accounts.admin);

    expect(rewards).to.equal("0");
    expect(isNegative).to.equal(false);

    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);
    await provider.send("evm_revert", [utils.hexStripZeros(utils.hexlify(addSnapshotCount()))]);
  });
}
