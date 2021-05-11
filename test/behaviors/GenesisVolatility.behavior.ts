import { expect } from "chai";
import {getExpiry} from "../../test-utils";
import { BigNumber, utils, constants } from "ethers";



export function shouldBehaveLikeGenesisVolatilty(): void {
    it("should revert setting volatility precision for non owner", async function () {
        const genesisVolatility = await this.genesisVolatility.connect(this.signers.admin1);
        await expect(genesisVolatility.setVolatilityPrecision(3))
                .to.be.revertedWith("caller has no access to the method");
    });

    it("should set volatility precision", async function () {
        const genesisVolatility = await this.genesisVolatility.connect(this.signers.admin);
        await genesisVolatility.setVolatilityPrecision(3);
        expect(await genesisVolatility.volatilityPrecision()).to.equal(3)   
    });

    it("should revert adding volatility mapping for non owner", async function () {
        const genesisVolatility = await this.genesisVolatility.connect(this.signers.admin1);
        await expect(genesisVolatility.addVolatilityMapping(
            utils.formatBytes32String("ETH"),
            utils.formatBytes32String("USD"),
            getExpiry(1),
            10,
            9668 //96.68
            ))
            .to.be.revertedWith("caller has no access to the method");
            
    });

    it("should add volatility mapping", async function () {
        const genesisVolatility = await this.genesisVolatility.connect(this.signers.admin);
        await expect(genesisVolatility.addVolatilityMapping(
            utils.formatBytes32String("ETH"),
            utils.formatBytes32String("USD"),
            getExpiry(1),
            10,
            9668
            ))
            .to.emit(genesisVolatility , "AddedVolatilityMapping")
            .withArgs(utils.formatBytes32String("ETH"),utils.formatBytes32String("USD"),getExpiry(1),10,9668);
        const hash= utils.keccak256(
            utils.defaultAbiCoder.encode(
              ["bytes32", "bytes32", "uint256"],
              [utils.formatBytes32String("ETH"), utils.formatBytes32String("USD"), getExpiry(1)],
            )
          );
         expect(await genesisVolatility.volatility(hash, 10)).to.equal(9668);     
    });

    it("should revert set manager for zero address", async function () {
        const genesisVolatility = await this.genesisVolatility.connect(this.signers.admin);
        await expect(genesisVolatility.setManager(constants.AddressZero)).to.be.revertedWith("Invalid manager address");
      });
    
      it("should set manager", async function () {
        const genesisVolatility = await this.genesisVolatility.connect(this.signers.admin);
        await expect(genesisVolatility.setManager(this.oddzVolatility.address)).to.be.ok;
      });
    
      it("should  remove manager", async function () {
        const genesisVolatility = await this.genesisVolatility.connect(this.signers.admin);
        await genesisVolatility.setManager(this.oddzVolatility.address);
        await expect(genesisVolatility.removeManager(this.oddzVolatility.address)).to.be.ok;
      });

      it("should  revert get volatility for non manager", async function () {
        const genesisVolatility = await this.genesisVolatility.connect(this.signers.admin);
        await expect( this.oddzVolatility.getIv(
            utils.formatBytes32String("ETH"),
            utils.formatBytes32String("USD"),
            getExpiry(1),
            160000000000,
            160000000000
        )).to.be.revertedWith("caller has no access to the method")
      });

    it("should get volatility for at the money option", async function () {
        const genesisVolatility = await this.genesisVolatility.connect(this.signers.admin);
         
         await genesisVolatility.setManager(this.oddzVolatility.address);
          const result= await this.oddzVolatility.getIv(
                                        utils.formatBytes32String("ETH"),
                                        utils.formatBytes32String("USD"),
                                        getExpiry(1),
                                        160000000000,
                                        160000000000
                                    );
            
         expect(result[0].toString()).to.equal("180000");
         expect( result[1]).to.equal(5);                            
    });

    it("should get volatility for 10 %", async function () {
        const genesisVolatility = await this.genesisVolatility.connect(this.signers.admin);
        await genesisVolatility.addVolatilityMapping(
            utils.formatBytes32String("ETH"),
            utils.formatBytes32String("USD"),
            getExpiry(1),
            110,
            9668
            );
            
         await genesisVolatility.setManager(this.oddzVolatility.address);
          const result= await this.oddzVolatility.getIv(
                                        utils.formatBytes32String("ETH"),
                                        utils.formatBytes32String("USD"),
                                        getExpiry(1),
                                        160000000000,
                                        176000000000
                                    );
            
         expect(result[0].toString()).to.equal("9668000");
         expect( result[1]).to.equal(5);                            
    });

    it("should get volatility of plus5% with 2% difference in current and strike", async function () {
        const genesisVolatility = await this.genesisVolatility.connect(this.signers.admin);
        await genesisVolatility.addVolatilityMapping(
            utils.formatBytes32String("ETH"),
            utils.formatBytes32String("USD"),
            getExpiry(1),
            105,
            9668
            );
            
         await genesisVolatility.setManager(this.oddzVolatility.address);
          const result= await this.oddzVolatility.getIv(
                                        utils.formatBytes32String("ETH"),
                                        utils.formatBytes32String("USD"),
                                        getExpiry(1),
                                        160000000000,
                                        163200000000
                                    );
            
         expect(result[0].toString()).to.equal("9668000");
         expect( result[1]).to.equal(5);                            
    });

    it("should get volatility for less5% with 2% difference in current and strike", async function () {
        const genesisVolatility = await this.genesisVolatility.connect(this.signers.admin);
        await genesisVolatility.addVolatilityMapping(
            utils.formatBytes32String("ETH"),
            utils.formatBytes32String("USD"),
            getExpiry(1),
            5,
            9668
            );
            
         await genesisVolatility.setManager(this.oddzVolatility.address);
          const result= await this.oddzVolatility.getIv(
                                        utils.formatBytes32String("ETH"),
                                        utils.formatBytes32String("USD"),
                                        getExpiry(1),
                                        160000000000,
                                        156800000000
                                    );
            
         expect(result[0].toString()).to.equal("9668000");
         expect( result[1]).to.equal(5);                            
    });

    it("should get volatility for plus90% with 90% difference in current and strike", async function () {
        const genesisVolatility = await this.genesisVolatility.connect(this.signers.admin);
        await genesisVolatility.addVolatilityMapping(
            utils.formatBytes32String("ETH"),
            utils.formatBytes32String("USD"),
            getExpiry(1),
            190,
            9668
            );
            
         await genesisVolatility.setManager(this.oddzVolatility.address);
          const result= await this.oddzVolatility.getIv(
                                        utils.formatBytes32String("ETH"),
                                        utils.formatBytes32String("USD"),
                                        getExpiry(1),
                                        160000000000,
                                        304000000000
                                    );
            
         expect(result[0].toString()).to.equal("9668000");
         expect( result[1]).to.equal(5);                            
    });

    it("should get volatility for less90% with 90% difference in current and strike", async function () {
        const genesisVolatility = await this.genesisVolatility.connect(this.signers.admin);
        await genesisVolatility.addVolatilityMapping(
            utils.formatBytes32String("ETH"),
            utils.formatBytes32String("USD"),
            getExpiry(1),
            90,
            9668
            );
            
         await genesisVolatility.setManager(this.oddzVolatility.address);
          const result= await this.oddzVolatility.getIv(
                                        utils.formatBytes32String("ETH"),
                                        utils.formatBytes32String("USD"),
                                        getExpiry(1),
                                        160000000000,
                                        16000000000
                                    );
            
         expect(result[0].toString()).to.equal("9668000");
         expect( result[1]).to.equal(5);                            
    });


  
}
