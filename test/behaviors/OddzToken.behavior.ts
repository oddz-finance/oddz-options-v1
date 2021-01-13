import { expect } from "chai";
import { bufferToHex, keccakFromString, ecsign, toBuffer } from 'ethereumjs-util';

const TotalSupply = 100000000;
export function shouldBehaveLikeOddzToken(): void {
  it("should return the totalSupply", async function () {
    const oddzToken = await this.oddzToken.connect(this.signers.admin);
    expect(await oddzToken.totalSupply()).to.equal(TotalSupply);
    expect(await oddzToken.balanceOf(this.accounts.admin)).to.equal(TotalSupply);
  });
  it("Should return the correct permit hash", async function() {
    const oddzToken = await this.oddzToken.connect(this.signers.admin);
    const permitTypeHash = await oddzToken.PERMIT_TYPEHASH();
    expect(permitTypeHash).to.equal(bufferToHex(keccakFromString('Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)')))
  });

  it("should successfully transfer 1 wei", async function ()  {
    const oddzToken = await this.oddzToken.connect(this.signers.admin);
    await oddzToken.transfer(this.walletTo.address, 1);
    expect(await oddzToken.balanceOf(this.walletTo.address)).to.equal(1);
  });

  it("should successfully transfer full balance", async function() {
    const oddzToken = await this.oddzToken.connect(this.signers.admin);
    await oddzToken.transfer(this.walletTo.address, TotalSupply);
    expect(await oddzToken.balanceOf(this.walletTo.address)).to.equal(TotalSupply);
  });

  it('Cannot transfer above the amount', async function () {
    const oddzToken = await this.oddzToken.connect(this.signers.admin);
    await expect(oddzToken.transfer(this.walletTo.address, TotalSupply + 1)).to.be.reverted;
  });
}
