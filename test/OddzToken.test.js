const OddzToken = artifacts.require("OddzToken");
const { bufferToHex, keccakFromString, ecsign, toBuffer } = require('ethereumjs-util');

const { getPermitHash } = require("../test-utils");

const {BigNumber, toWei} = web3.utils;

require("chai")
  .use(require("chai-bignumber")(BigNumber))
  .should();

contract("Oddz Token", async ([owner, user]) => {
  let token, initialBalance = toWei("100000000")
  let setup = async function() {
    token = await OddzToken.new("Oddz Token", "ODDZ", initialBalance, {
      from: owner
    });
  }
  describe("Setup: totalsupply, permit", function() {
    beforeEach(setup);
    it("Should return the total amount of tokens", async function() {
      const total = await token.totalSupply.call();
      const balance = await token.balanceOf.call(owner);
      assert.equal(total.toString(), initialBalance);
      assert.equal(balance.toString(), initialBalance);
    });

    it("Should return the correct permit hash", async function() {
      assert.equal(await token.PERMIT_TYPEHASH(),
        bufferToHex(keccakFromString('Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)'))
      );
    });
  });
});
