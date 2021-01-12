import { expect } from "chai";
import { bufferToHex, keccakFromString, ecsign, toBuffer } from 'ethereumjs-util';

export function shouldBehaveLikeOddzToken(): void {
  it("should return the totalSupply", async function () {
    const oddzToken = await this.oddzToken.connect(this.signers.admin);
    expect(await oddzToken.totalSupply()).to.equal(100000000);
    expect(await oddzToken.balanceOf(this.accounts.admin)).to.equal(100000000);
  });
  it("Should return the correct permit hash", async function() {
    const oddzToken = await this.oddzToken.connect(this.signers.admin);
    const permitTypeHash = await oddzToken.PERMIT_TYPEHASH();
    expect(permitTypeHash).to.equal(bufferToHex(keccakFromString('Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)')))
  });
}
