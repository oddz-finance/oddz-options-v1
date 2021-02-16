import { expect } from "chai";
//import { OddzToken } from "../../typechain";
import { ecsign } from 'ethereumjs-util';
import { keccak256, defaultAbiCoder, toUtf8Bytes, solidityPack } from 'ethers/lib/utils'
//import { bufferToHex, keccakFromString } from "ethereumjs-util";

const TotalSupply = 100000000;
const Name = "OddzToken";
const Symbol = "ODDZ";
export function shouldBehaveLikeOddzToken(): void {
  it("should return the totalSupply", async function () {
    const oddzToken = await this.oddzToken.connect(this.signers.admin);
    expect(await oddzToken.totalSupply()).to.equal(TotalSupply);
    expect(await oddzToken.balanceOf(this.accounts.admin)).to.equal(TotalSupply);
  });
  /* cannot execute this testcase
     as PERMIT_TYPEHASH is a private variable in openzeppelin ERC20Permit
  */

  // it.only("Should return the correct permit hash", async function () {
  //   const oddzToken = await this.oddzToken.connect(this.signers.admin);
  //   const permitTypeHash = await oddzToken.PERMIT_TYPEHASH();
  //   expect(permitTypeHash).to.equal(
  //     bufferToHex(
  //       keccakFromString("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"),
  //     ),
  //   );
  // });

  it("should return the name and symbol", async function () {
    const oddzToken = await this.oddzToken.connect(this.signers.admin);
    expect(await oddzToken.name()).to.equal(Name);
    expect(await oddzToken.symbol()).to.equal(Symbol); 
  });

  it("should successfully transfer 1 wei", async function () {
    const oddzToken = await this.oddzToken.connect(this.signers.admin);
    await oddzToken.transfer(this.walletTo.address, 1);
    expect(await oddzToken.balanceOf(this.walletTo.address)).to.equal(1);
  });

  it("should successfully transfer full balance", async function () {
    const oddzToken = await this.oddzToken.connect(this.signers.admin);
    await oddzToken.transfer(this.walletTo.address, TotalSupply);
    expect(await oddzToken.balanceOf(this.walletTo.address)).to.equal(TotalSupply);
  });

  it("should emit transfer event", async function() {
    const oddzToken = await this.oddzToken.connect(this.signers.admin);
    await expect(oddzToken.transfer(this.walletTo.address, TotalSupply)).to.emit(oddzToken,"Transfer");
  })
 
  it("Cannot transfer above the amount", async function () {
    const oddzToken = await this.oddzToken.connect(this.signers.admin);
    await expect(oddzToken.transfer(this.walletTo.address, TotalSupply + 1)).to.be.reverted;
  });

  it("cannot transfer to 0x0 account", async function() {
    const oddzToken = await this.oddzToken.connect(this.signers.admin);
    await expect(oddzToken.transfer(0x0,100)).to.be.reverted;
  })

  it("cannot transfer  0 amount", async function() {
    const oddzToken = await this.oddzToken.connect(this.signers.admin);
    await expect(oddzToken.transfer(this.signers.admin1,0)).to.be.reverted;

  })

  it("should approve certain amount", async function(){
    const oddzToken = await this.oddzToken.connect(this.signers.admin);
    await oddzToken.approve(this.accounts.admin1, 100);
    expect(await oddzToken.allowance(this.accounts.admin, this.accounts.admin1)).to.equal(100);

  })

  it("emit an approval event", async function(){
    const oddzToken = await this.oddzToken.connect(this.signers.admin);
    await expect(oddzToken.approve(this.accounts.admin1, 100)).to.emit(oddzToken, "Approval");

  })

  it("can set approval amount to zero", async function() {
    const oddzToken = await this.oddzToken.connect(this.signers.admin);
    await oddzToken.approve(this.accounts.admin1, 0);
    expect(await oddzToken.allowance(this.accounts.admin, this.accounts.admin1)).to.equal(0);
  })

  it("should transfer token by allowed spender", async function() {
    const oddzToken = await this.oddzToken.connect(this.signers.admin);
    await oddzToken.approve(this.accounts.admin1, 100);
    expect(await oddzToken.allowance(this.accounts.admin, this.accounts.admin1)).to.equal(100);

    await oddzToken.connect(this.signers.admin1).transferFrom(this.accounts.admin, this.walletTo.address, 100);
    expect(await oddzToken.balanceOf(this.walletTo.address)).to.equal(100);
    expect(await oddzToken.balanceOf(this.accounts.admin)).to.equal(TotalSupply-100);
  })

  it("should not transfer token more than allowed by spender", async function() {
    const oddzToken = await this.oddzToken.connect(this.signers.admin);
    await oddzToken.approve(this.accounts.admin1, 100);
    expect(await oddzToken.allowance(this.accounts.admin, this.accounts.admin1)).to.equal(100);

    await expect(oddzToken.connect(this.signers.admin1).transferFrom(this.accounts.admin, this.walletTo.address, 101)).to.be.reverted;
  })

  it("should not be able to transfer tokens again after transferring all the allowances", async function() {
    const oddzToken = await this.oddzToken.connect(this.signers.admin);
    await oddzToken.approve(this.accounts.admin1, 100);
    expect(await oddzToken.allowance(this.accounts.admin, this.accounts.admin1)).to.equal(100);
    await oddzToken.connect(this.signers.admin1).transferFrom(this.accounts.admin, this.walletTo.address, 100);
    expect(await oddzToken.balanceOf(this.walletTo.address)).to.equal(100);
    expect(await oddzToken.balanceOf(this.accounts.admin)).to.equal(TotalSupply-100);
    await expect(oddzToken.connect(this.signers.admin1).transferFrom(this.accounts.admin, this.walletTo.address, 1)).to.be.reverted;
    
  })

  it("should increase allowance", async function() {
    const oddzToken = await this.oddzToken.connect(this.signers.admin);
    await oddzToken.approve(this.accounts.admin1, 100);
    expect(await oddzToken.allowance(this.accounts.admin, this.accounts.admin1)).to.equal(100);
    await oddzToken.increaseAllowance(this.accounts.admin1,100);
    expect(await oddzToken.allowance(this.accounts.admin, this.accounts.admin1)).to.equal(200);
    
  })

  it("should transfer additional tokens after increase allowance", async function() {
    const oddzToken = await this.oddzToken.connect(this.signers.admin);
    await oddzToken.approve(this.accounts.admin1, 100);
    expect(await oddzToken.allowance(this.accounts.admin, this.accounts.admin1)).to.equal(100);
    await oddzToken.increaseAllowance(this.accounts.admin1,100);
    expect(await oddzToken.allowance(this.accounts.admin, this.accounts.admin1)).to.equal(200);
    await oddzToken.connect(this.signers.admin1).transferFrom(this.accounts.admin, this.walletTo.address, 200);
    expect(await oddzToken.balanceOf(this.walletTo.address)).to.equal(200);
    expect(await oddzToken.balanceOf(this.accounts.admin)).to.equal(TotalSupply-200);
    
  })

  it("should decrease allowance", async function() {
    const oddzToken = await this.oddzToken.connect(this.signers.admin);
    await oddzToken.approve(this.accounts.admin1, 100);
    expect(await oddzToken.allowance(this.accounts.admin, this.accounts.admin1)).to.equal(100);
    await oddzToken.decreaseAllowance(this.accounts.admin1,10);
    expect(await oddzToken.allowance(this.accounts.admin, this.accounts.admin1)).to.equal(90);
    
  })

  it("should transfer less tokens after decrease allowance", async function() {
    const oddzToken = await this.oddzToken.connect(this.signers.admin);
    await oddzToken.approve(this.accounts.admin1, 100);
    expect(await oddzToken.allowance(this.accounts.admin, this.accounts.admin1)).to.equal(100);
    await oddzToken.decreaseAllowance(this.accounts.admin1,10);
    expect(await oddzToken.allowance(this.accounts.admin, this.accounts.admin1)).to.equal(90);
    await oddzToken.connect(this.signers.admin1).transferFrom(this.accounts.admin, this.walletTo.address, 90);
   
    expect(await oddzToken.balanceOf(this.walletTo.address)).to.equal(90);
    expect(await oddzToken.balanceOf(this.accounts.admin)).to.equal(TotalSupply-90);
    
  })

  it("should not transfer more tokens after decreasing allowance", async function() {
    const oddzToken = await this.oddzToken.connect(this.signers.admin);
    await oddzToken.approve(this.accounts.admin1, 100);
    expect(await oddzToken.allowance(this.accounts.admin, this.accounts.admin1)).to.equal(100);
    await oddzToken.decreaseAllowance(this.accounts.admin1,10);
    expect(await oddzToken.allowance(this.accounts.admin, this.accounts.admin1)).to.equal(90);
    await expect(oddzToken.connect(this.signers.admin1).transferFrom(this.accounts.admin, this.walletTo.address, 100)).to.be.reverted;
    
  });

  it("should be able to set another spender and delegate transfer", async function() {
    const oddzToken = await this.oddzToken.connect(this.signers.admin);
    // approve delegator1
    await oddzToken.approve(this.accounts.admin1, 50);
    expect(await oddzToken.allowance(this.accounts.admin, this.accounts.admin1)).to.equal(50);
    // approve delegator2
    await oddzToken.approve(this.delegatorAccounts.admin,50);
    expect(await oddzToken.allowance(this.accounts.admin, this.delegatorAccounts.admin)).to.equal(50);
    // transferFrom initiated by delegator1
    await oddzToken.connect(this.signers.admin1).transferFrom(this.accounts.admin, this.walletTo.address, 50);
    expect(await oddzToken.balanceOf(this.walletTo.address)).to.equal(50);
    expect(await oddzToken.balanceOf(this.accounts.admin)).to.equal(TotalSupply-50);
    // transfer from initiated bt delegator2
    await oddzToken.connect(this.delegators.admin).transferFrom(this.accounts.admin, this.walletTo.address, 50);
    expect(await oddzToken.balanceOf(this.walletTo.address)).to.equal(100);
    expect(await oddzToken.balanceOf(this.accounts.admin)).to.equal(TotalSupply-50-50);
    
  });


  it("Should be able to get back accidentally sent tokens", async function () {

    // transfer 100 tokens to user
    const oddzToken = await this.oddzToken.connect(this.signers.admin);
    await oddzToken.transfer(this.accounts.admin1, 100);
    expect(await oddzToken.balanceOf(this.accounts.admin1)).to.equal(100);
    

    // User transferred 100 tokens to ODDZ contract accidentally
    await oddzToken.connect(this.signers.admin1).transfer(oddzToken.address, 100);
    expect(await oddzToken.balanceOf(oddzToken.address)).to.equal(100);
    expect(await oddzToken.balanceOf(this.accounts.admin1)).to.equal(0);
    

    // Rescue user funds
    await expect(oddzToken.connect(this.signers.admin).rescueTokens(
                                                          oddzToken.address, 
                                                          this.accounts.admin1, 
                                                          100)).to.emit(
                                                          oddzToken,'RescueExcessTokens');
    expect(await oddzToken.balanceOf(this.accounts.admin1)).to.equal(100);
    

  });

 

  it.only('permit', async function () {
    const oddzToken = await this.oddzToken.connect(this.accounts.admin);
    const amount = 100;
    const nonce = await oddzToken.nonces(this.accounts.admin);
    const deadline = 100000000000000; // random timestamp in future
    const domainSeparator = await oddzToken.DOMAIN_SEPARATOR();
    console.log("domainSeparator: ",domainSeparator)
     const PERMIT_TYPEHASH = keccak256(
      toUtf8Bytes('Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)')
    )
    const hash= keccak256(
      solidityPack(
        ['bytes1', 'bytes1', 'bytes32', 'bytes32'],
        [
          '0x19',
          '0x01',
          domainSeparator,
          keccak256(
            defaultAbiCoder.encode(
              ['bytes32', 'address', 'address', 'uint256', 'uint256', 'uint256'],
              [PERMIT_TYPEHASH, this.accounts.admin, this.accounts.admin1, amount, nonce, deadline]
            )
          ),
        ]
      )
    )
    console.log("hash: ",hash)
    
    console.log("getting the sign: ");
    const {v, r, s} = ecsign(Buffer.from(hash.slice(2),'hex'), Buffer.from(this.customwallet.privateKey.slice(2),'hex'))


    console.log("permitting")
    await expect(oddzToken.permit(this.accounts.admin, this.accounts.admin1, amount, deadline, v, r, s)).to.emit(oddzToken,"Approval")
       
    
  });
}
