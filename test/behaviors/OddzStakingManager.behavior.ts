import { expect } from "chai";
import { BigNumber,utils } from "ethers";
import { address0, getExpiry, DepositType } from "../../test-utils";

export function shouldBehaveLikeOddzStakingManager(): void {
    it("Should revert activating the token which is already active", async function () {
        const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin);
        await expect(oddzStakingManager.activateToken(this.oddzToken.address))
          .to.be.revertedWith("token is already active")
    });

    it("Should revert deactivate for non owner", async function () {
        const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin1);
        await expect(oddzStakingManager.deactivateToken(this.oddzToken.address))
          .to.be.revertedWith("Ownable: caller is not the owner")
    }); 

    it("Should successfully deactivate the token", async function () {
        const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin);
        await expect(oddzStakingManager.deactivateToken(this.oddzToken.address))
          .to.emit(oddzStakingManager,"TokenDeactivate")
    }); 

    it("Should revert deactivate which is already deactivated", async function () {
        const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin);
        await oddzStakingManager.deactivateToken(this.oddzToken.address);
        await expect(oddzStakingManager.deactivateToken(this.oddzToken.address)).to.be.revertedWith("token is not active");     
       
    });
    
    it("Should revert activate for non owner", async function () {
        const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin1);
        await expect(oddzStakingManager.activateToken(this.oddzToken.address))
          .to.be.revertedWith("Ownable: caller is not the owner")
    }); 

    it("Should successfully activate token", async function () {
        const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin);
        await oddzStakingManager.deactivateToken(this.oddzToken.address);
        await expect(oddzStakingManager.activateToken(this.oddzToken.address))
            .to.emit(oddzStakingManager,"TokenActivate");     
    }); 

    it("Should revert setting lockup duration for the token by non owner", async function () {
        const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin1);
        await expect(oddzStakingManager.setLockupDuration(this.oddzToken.address, getExpiry(1)))
            .to.be.revertedWith("Ownable: caller is not the owner");
    });
     
    it("Should revert setting lockup duration for invalid token", async function () {
        const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin);
        await expect(oddzStakingManager.setLockupDuration(address0(), getExpiry(1)))
            .to.be.revertedWith("invalid token address");
    }); 

    it("Should successfully set lockup duration for the token", async function () {
        const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin);
        await oddzStakingManager.setLockupDuration(this.oddzToken.address, getExpiry(1))
        const token = await oddzStakingManager.tokens(this.oddzToken.address)
        expect(token._lockupDuration).to.equal(getExpiry(1))    
    }); 

    it("Should revert setting reward frequency for the token by non owner", async function () {
        const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin1);
        await expect(oddzStakingManager.setRewardFrequency(this.oddzToken.address, getExpiry(1)))
            .to.be.revertedWith("Ownable: caller is not the owner");
    });
     
    it("Should revert setting reward frequency for invalid token", async function () {
        const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin);
        await expect(oddzStakingManager.setRewardFrequency(address0(), getExpiry(1)))
            .to.be.revertedWith("invalid token address");
    }); 

    it("Should successfully set reward frequency for the token", async function () {
        const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin);
        await oddzStakingManager.setRewardFrequency(this.oddzToken.address, getExpiry(1))
        const token = await oddzStakingManager.tokens(this.oddzToken.address)
        expect(token._rewardFrequency).to.equal(getExpiry(1))    
    }); 
      
    it("Should revert staking for zero token address", async function () {
        const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin);
        await expect(oddzStakingManager.stake(address0(),BigNumber.from(utils.parseEther("10"))))
          .to.be.revertedWith("invalid token address")
      });

    it("Should revert staking for invalid token address", async function () {
        const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin);
        await expect(oddzStakingManager.stake(this.oddzTokenStaking.address, BigNumber.from(utils.parseEther("10"))))
          .to.be.revertedWith("token is not active")
    }); 
    
    it("Should revert staking for invalid amount", async function () {
        const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin);
        await expect(oddzStakingManager.stake(this.oddzToken.address, 0))
          .to.be.revertedWith("invalid amount")
    }); 

    it("Should revert staking without any approved allowance", async function () {
        const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin);
        await expect(oddzStakingManager.stake(this.oddzToken.address, BigNumber.from(utils.parseEther("10"))))
            .to.be.revertedWith("ERC20: transfer amount exceeds allowance")
    });
      
    it("Should be able to successfully stake oddz token", async function () {
        const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin);
        const oddzToken = await this.oddzToken.connect(this.signers.admin);
        await oddzToken.approve(this.oddzTokenStaking.address, BigNumber.from(utils.parseEther("10")));
        await expect(oddzStakingManager.stake(this.oddzToken.address, BigNumber.from(utils.parseEther("10"))))
        .to.emit(oddzStakingManager, "Stake")
        expect(await this.oddzTokenStaking.balance(this.accounts.admin)).to.equal(BigNumber.from(utils.parseEther("10")));
    });

    it("Should revert deposit for invalid deposit type", async function () {
        const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin);
        await expect(oddzStakingManager.deposit(BigNumber.from(utils.parseEther("10")), DepositType.Invalid))
          .to.be.revertedWith("invalid deposit type")
    }); 

    it("Should revert deposit without any approved allowance", async function () {
        const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin);
        await expect(oddzStakingManager.deposit(BigNumber.from(utils.parseEther("10")), DepositType.Transaction))
            .to.be.revertedWith("ERC20: transfer amount exceeds allowance")
    }); 

    it("Should successfully deposit amount of transaction fee type", async function () {
        const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin);
        const usdcToken = await this.usdcToken.connect(this.signers.admin);
        await usdcToken.approve(this.oddzStakingManager.address, BigNumber.from(utils.parseEther("10")));
        await expect(oddzStakingManager.deposit(BigNumber.from(utils.parseEther("10")), DepositType.Transaction))
                .to.emit(oddzStakingManager,"Deposit")
         expect(await usdcToken.balanceOf(this.oddzStakingManager.address)).to.equal(BigNumber.from(utils.parseEther("10")))

    }); 

    it("Should successfully deposit amount of settlement fee type", async function () {
        const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin);
        const usdcToken = await this.usdcToken.connect(this.signers.admin);
        await usdcToken.approve(this.oddzStakingManager.address, BigNumber.from(utils.parseEther("10")));
        await expect(oddzStakingManager.deposit(BigNumber.from(utils.parseEther("10")), DepositType.Settlement))
                .to.emit(oddzStakingManager,"Deposit")
        expect(await usdcToken.balanceOf(this.oddzStakingManager.address)).to.equal(BigNumber.from(utils.parseEther("10")))

    }); 

    it.only("Should successfully distribute rewards", async function () {
        const oddzStakingManager = await this.oddzStakingManager.connect(this.signers.admin);
        const usdcToken = await this.usdcToken.connect(this.signers.admin);
        await usdcToken.approve(this.oddzStakingManager.address, BigNumber.from(utils.parseEther("100000")));
        await expect(oddzStakingManager.deposit(BigNumber.from(utils.parseEther("100000")), DepositType.Transaction))
                .to.emit(oddzStakingManager,"Deposit")
                .withArgs(this.accounts.admin, DepositType.Transaction, BigNumber.from(utils.parseEther("100000")));
        const oddzToken = await this.oddzToken.connect(this.signers.admin);
        await oddzToken.approve(this.oddzTokenStaking.address, BigNumber.from(utils.parseEther("100")));
        await expect(oddzStakingManager.stake(this.oddzToken.address, BigNumber.from(utils.parseEther("100"))))
                .to.emit(oddzStakingManager, "Stake")
                .withArgs(this.accounts.admin, this.oddzToken.address, BigNumber.from(utils.parseEther("100")))
        
    }); 

 
}
