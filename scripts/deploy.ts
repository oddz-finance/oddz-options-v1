import { ethers, waffle } from "hardhat";
import { BigNumber, Contract, utils } from "ethers";
import MockERC20Artifact from "../artifacts/contracts/Mocks/MockERC20.sol/MockERC20.json"
import MockOddzDexArtifact from "../artifacts/contracts/Mocks/MockOddzDex.sol/MockOddzDex.json";
import OddzOptionManagerArtifact from "../artifacts/contracts/Option/OddzOptionManager.sol/OddzOptionManager.json";
import OddzPriceOracleManagerArtifact from "../artifacts/contracts/Oracle/OddzPriceOracleManager.sol/OddzPriceOracleManager.json";
import OddzIVOracleManagerArtifact from "../artifacts/contracts/Oracle/OddzIVOracleManager.sol/OddzIVOracleManager.json";
import ChainlinkPriceOracleArtifact from "../artifacts/contracts/Integrations/PriceOracle/Chainlink/ChainlinkPriceOracle.sol/ChainlinkPriceOracle.json";
import ChainlinkVolatilityArtifact from "../artifacts/contracts/Integrations/VolatilityOracle/Chainlink/ChainlinkIVOracle.sol/ChainlinkIVOracle.json";
import MockOddzStakingArtifact from "../artifacts/contracts/Mocks/MockOddzStaking.sol/MockOddzStaking.json";
import OddzAssetManagerArtifact from "../artifacts/contracts/Option/OddzAssetManager.sol/OddzAssetManager.json";
import DexManagerArtifact from "../artifacts/contracts/Swap/DexManager.sol/DexManager.json";
import OddzOptionPremiumManagerArtifact from "../artifacts/contracts/Option/OddzOptionPremiumManager.sol/OddzOptionPremiumManager.json";
import OddzPremiumBlackScholesArtifact from "../artifacts/contracts/Option/OddzPremiumBlackScholes.sol/OddzPremiumBlackScholes.json";
import OddzLiquidityPoolArtifact from "../artifacts/contracts/Pool/OddzLiquidityPool.sol/OddzLiquidityPool.json";
import MockOddzVolatilityArtifact from "../artifacts/contracts/Mocks/MockOddzVolatility.sol/MockOddzVolatility.json";
import OddzSdkArtifact from "../artifacts/contracts/OddzSDK.sol/OddzSDK.json";

function sleep(ms: any) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  try {
    const { deployContract } = waffle;
    const [owner] = await ethers.getSigners();
    const oddzAssetManager = (await deployContract(
      owner,
      OddzAssetManagerArtifact,
      [],
    ));
    console.log("asset manager: ",oddzAssetManager.address)

    console.log("Taking a break...");
    await sleep(5000);
    console.log("Five seconds later, showing sleep in a loop...");

    const dexManager = (await deployContract(owner, DexManagerArtifact, [
      oddzAssetManager.address,
    ])); 
    console.log("dex manager: ",dexManager.address)
    console.log("Taking a break...");
    await sleep(5000);
    console.log("Five seconds later, showing sleep in a loop...");

    const chainlinkOddzPriceOracle = (await deployContract(owner, ChainlinkPriceOracleArtifact, [
      
    ])); 
    console.log("chainlinkOddzPriceOracle: ",chainlinkOddzPriceOracle.address)
    console.log("Taking a break...");
    await sleep(5000);
    console.log("Five seconds later, showing sleep in a loop...");

    const oddzPriceOracleManager = (await deployContract(
      owner,
      OddzPriceOracleManagerArtifact,
      [],
    )); 
    console.log("oddzPriceOracleManager: ",oddzPriceOracleManager.address)
    console.log("Taking a break...");
    await sleep(5000);
    console.log("Five seconds later, showing sleep in a loop...");

    await chainlinkOddzPriceOracle.transferOwnership(oddzPriceOracleManager.address);

    const chainlinkOddzVolatility = (await deployContract(owner, ChainlinkVolatilityArtifact));
   
    console.log("chainlinkOddzVolatility: ",chainlinkOddzVolatility.address)
    
    console.log("Taking a break...");
    await sleep(5000);
    console.log("Five seconds later, showing sleep in a loop...");

  

   
    const oddzIVOracleManager = (await deployContract(
      owner,
      OddzIVOracleManagerArtifact,
      [],
    ));
    console.log("oddzIVOracleManager: ",oddzIVOracleManager.address)
    console.log("Taking a break...");
    await sleep(5000);
    console.log("Five seconds later, showing sleep in a loop...");
    
    await chainlinkOddzVolatility.setManager(oddzIVOracleManager.address);
   
    console.log("Taking a break...");
    await sleep(15000);
    console.log("Five seconds later, showing sleep in a loop...");

    const mockOddzVolatility = (await deployContract(
      owner,
      MockOddzVolatilityArtifact,
    )) 
    console.log("mock oddz volatility: ",mockOddzVolatility.address)
    console.log("Taking a break...");
    await sleep(15000);
    console.log("Five seconds later, showing sleep in a loop...");
    // ETH IV aggregators
    await oddzIVOracleManager.addIVAggregator(
      utils.formatBytes32String("ETH"),
      utils.formatBytes32String("USD"),
      mockOddzVolatility.address,
      mockOddzVolatility.address,
      1,
    );

    
    console.log("Taking a break...");
    await sleep(5000);
    console.log("Five seconds later, showing sleep in a loop...");


    // BTC IV aggregators
    await oddzIVOracleManager.addIVAggregator(
        utils.formatBytes32String("BTC"),
        utils.formatBytes32String("USD"),
        mockOddzVolatility.address,
        mockOddzVolatility.address,
        1,
      );
  
     
    console.log("Taking a break...");
    await sleep(5000);
    console.log("Five seconds later, showing sleep in a loop...");

    const ivhash1 = utils.keccak256(
      utils.defaultAbiCoder.encode(
        ["bytes32", "bytes32", "address"],
        [utils.formatBytes32String("ETH"), utils.formatBytes32String("USD"), mockOddzVolatility.address],
      ),
    );

    const ivhash2 = utils.keccak256(
        utils.defaultAbiCoder.encode(
          ["bytes32", "bytes32", "address"],
          [utils.formatBytes32String("BTC"), utils.formatBytes32String("USD"), mockOddzVolatility.address],
        ),
      );

    await oddzIVOracleManager.setActiveIVAggregator(ivhash1);

    await oddzIVOracleManager.setActiveIVAggregator(ivhash2);

    console.log("Taking a break...");
    await sleep(5000);
    console.log("Five seconds later, showing sleep in a loop...");


    const oddzStaking = (await deployContract(owner, MockOddzStakingArtifact));
    console.log("oddzStaking: ",oddzStaking.address)
    console.log("Taking a break...");
    await sleep(5000);
    console.log("Five seconds later, showing sleep in a loop...");


    const totalSupply = 1e8;
    const usdcToken = (await deployContract(owner, MockERC20Artifact, [
      "USD coin",
      "USDC",
      totalSupply,
    ]));
    console.log("usdcToken: ",usdcToken.address)
    console.log("Taking a break...");
    await sleep(5000);
    console.log("Five seconds later, showing sleep in a loop...");


    const ethToken = (await deployContract(owner, MockERC20Artifact, [
      "ETH Token",
      "ETH",
      totalSupply,
    ]));

    const btcToken = (await deployContract(owner, MockERC20Artifact, [
        "BTC Token",
        "BTC",
        totalSupply,
      ]));

  await oddzAssetManager.addAsset(utils.formatBytes32String("USD"), usdcToken.address, 8);
  console.log("Taking a break...");
    await sleep(15000);
    console.log("Five seconds later, showing sleep in a loop...");
  await oddzAssetManager.addAsset(utils.formatBytes32String("ETH"), ethToken.address, 8);
  console.log("Taking a break...");
    await sleep(15000);
    console.log("Five seconds later, showing sleep in a loop...");
  await oddzAssetManager.addAsset(utils.formatBytes32String("BTC"), btcToken.address, 8);
  console.log("Taking a break...");
    await sleep(15000);
    console.log("Five seconds later, showing sleep in a loop...");
  await oddzAssetManager.addAssetPair( 
            utils.formatBytes32String("ETH"),
            utils.formatBytes32String("USD"),
            BigNumber.from(utils.parseEther("0.01")),
            2592000,
            86400,);
  console.log("Taking a break...");
    await sleep(5000);
    console.log("Five seconds later, showing sleep in a loop...");
    await oddzAssetManager.addAssetPair( 
      utils.formatBytes32String("BTC"),
      utils.formatBytes32String("USD"),
      BigNumber.from(utils.parseEther("0.01")),
      2592000,
      86400,);
  console.log("Taking a break...");
    await sleep(5000);
    console.log("Five seconds later, showing sleep in a loop...");
  await oddzPriceOracleManager
    .addAggregator(
      utils.formatBytes32String("ETH"),
      utils.formatBytes32String("USD"),
      chainlinkOddzPriceOracle.address,
      "0x143db3CEEfbdfe5631aDD3E50f7614B6ba708BA7",
    );
    await oddzPriceOracleManager
    .addAggregator(
      utils.formatBytes32String("BTC"),
      utils.formatBytes32String("USD"),
      chainlinkOddzPriceOracle.address,
      "0x5741306c21795FdCBb9b265Ea0255F499DFe515C",
    ); 
    console.log("Taking a break...");
    await sleep(5000);
    console.log("Five seconds later, showing sleep in a loop...");
  const oracleHash1 = utils.keccak256(
    utils.defaultAbiCoder.encode(
      ["bytes32", "bytes32", "address"],
      [utils.formatBytes32String("ETH"), utils.formatBytes32String("USD"), chainlinkOddzPriceOracle.address],
    ),
  );
  const oracleHash2 = utils.keccak256(
    utils.defaultAbiCoder.encode(
      ["bytes32", "bytes32", "address"],
      [utils.formatBytes32String("BTC"), utils.formatBytes32String("USD"), chainlinkOddzPriceOracle.address],
    ),
  );
  await oddzPriceOracleManager.setActiveAggregator(oracleHash1);
  await oddzPriceOracleManager.setActiveAggregator(oracleHash2);

  console.log("Taking a break...");
  await sleep(5000);
  console.log("Five seconds later, showing sleep in a loop...");
    // USDC prod address 0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48
    const oddzLiquidityPool = (await deployContract(owner, OddzLiquidityPoolArtifact, [
      usdcToken.address,
      dexManager.address,
    ])); 
    console.log("oddzLiquidityPool: ",oddzLiquidityPool.address)
    console.log("Taking a break...");
    await sleep(5000);
    console.log("Five seconds later, showing sleep in a loop...");

    const oddzOptionPremiumManager = (await deployContract(
      owner,
      OddzOptionPremiumManagerArtifact,
      [],
    ));
    console.log("oddzOptionPremiumManager: ",oddzOptionPremiumManager.address)
    console.log("Taking a break...");
    await sleep(5000);
    console.log("Five seconds later, showing sleep in a loop...");

    const bscForwarder = "0x9399BB24DBB5C4b782C70c2969F58716Ebbd6a3b";
   
    const oddzOptionManager = (await deployContract(owner, OddzOptionManagerArtifact, [
      oddzPriceOracleManager.address,
      oddzIVOracleManager.address,
      oddzStaking.address,
      oddzLiquidityPool.address,
      usdcToken.address,
      oddzAssetManager.address,
      oddzOptionPremiumManager.address,
    ]));
    console.log("oddzOptionManager: ",oddzOptionManager.address)

    console.log("Taking a break...");
    await sleep(5000);
    console.log("Five seconds later, showing sleep in a loop...");

    await oddzLiquidityPool.setManager(oddzOptionManager.address);
    await oddzIVOracleManager.setManager(oddzOptionManager.address);

    console.log("Taking a break...");
    await sleep(5000);
    console.log("Five seconds later, showing sleep in a loop...");

    const oddzSDK = (await deployContract(owner, OddzSdkArtifact, [
      oddzOptionManager.address,
      oddzLiquidityPool.address,
      bscForwarder
    ]));

    console.log("oddzSDK :", oddzSDK.address);
 
		await oddzOptionManager.setSdk(oddzSDK.address);
    await oddzLiquidityPool.setSdk(oddzSDK.address);

    // Add Black Scholes
    const oddzPremiumBlackScholes = (await deployContract(
      owner,
      OddzPremiumBlackScholesArtifact,
      [],
    )) 
    console.log("oddzPremiumBlackScholes: ",oddzPremiumBlackScholes.address)
    console.log("Taking a break...");
    await sleep(5000);
    console.log("Five seconds later, showing sleep in a loop...");
    await oddzPremiumBlackScholes.transferOwnership(oddzOptionPremiumManager.address);

    await oddzOptionPremiumManager.addOptionPremiumModel(
      utils.formatBytes32String("B_S"),
      oddzPremiumBlackScholes.address,
    );
    await oddzOptionPremiumManager.setManager(oddzOptionManager.address);
    const mockOddzDex = (await deployContract(owner, MockOddzDexArtifact, []));
    console.log("MockOddzDex: ",mockOddzDex.address)
    console.log("Taking a break...");
    await sleep(5000);
    console.log("Five seconds later, showing sleep in a loop...");
    await dexManager.addExchange(
        utils.formatBytes32String("ETH"),
        utils.formatBytes32String("USD"),
        mockOddzDex.address,
      );
      console.log("Taking a break...");
    await sleep(5000);
    console.log("Five seconds later, showing sleep in a loop...");
      await dexManager.addExchange(
        utils.formatBytes32String("BTC"),
        utils.formatBytes32String("USD"),
        mockOddzDex.address,
      );

      const exhash1 = utils.keccak256(
        utils.defaultAbiCoder.encode(
          ["bytes32", "bytes32", "address"],
          [utils.formatBytes32String("ETH"), utils.formatBytes32String("USD"), mockOddzDex.address],
        ),
      );

      const exhash2 = utils.keccak256(
        utils.defaultAbiCoder.encode(
          ["bytes32", "bytes32", "address"],
          [utils.formatBytes32String("BTC"), utils.formatBytes32String("USD"), mockOddzDex.address],
        ),
      );

      await dexManager.setActiveExchange(exhash1);
      console.log("Taking a break...");
    await sleep(5000);
    console.log("Five seconds later, showing sleep in a loop...");
      await dexManager.setActiveExchange(exhash2);
      console.log("Taking a break...");
    await sleep(5000);
    console.log("Five seconds later, showing sleep in a loop...");
      dexManager.setSwapper(oddzLiquidityPool.address);

  } catch (ex) {
    console.log("Exception: ", ex);
  }
}

main();