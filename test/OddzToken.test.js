const OddzToken = artifacts.require("OddzToken");
const { bufferToHex, keccakFromString, ecsign, toBuffer } = require('ethereumjs-util');

const { getPermitHash } = require("../test-utils");

const {BigNumber, toWei} = web3.utils;

const assertRevert = async (promise, errorMessage = null) => {
  try {
    const tx = await promise
    const receipt = await web3.eth.getTransactionReceipt(tx.tx)
    if (receipt.gasUsed >= 6700000) {
      return
    }
  } catch (error) {
    if (errorMessage) {
      assert(
        error.message.search(errorMessage) >= 0,
        `Expected ${errorMessage} `
      )
    }
    const invalidOpcode = error.message.search("revert") >= 0
    assert(invalidOpcode, "Expected revert, got '" + error + "' instead")
    return
  }
  assert.ok(false, 'Error containing "revert" must be returned')
}


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

  // tests for setup
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


  // tests for Transfer
  describe("Transfer: 1 wei, full balance, and failure case", function() {
    beforeEach(setup)
    it("should successfully transfer 1 wei", async function() {
      const amount = toWei("1")
      await token.transfer(user, amount)
      const destBalance = await token.balanceOf.call(user)
      assert.equal(destBalance.toString(), amount.toString())
    });

    it("should successfully transfer full balance", async function() {
      await token.transfer(user, initialBalance)
      const destBalance = await token.balanceOf.call(user)
      assert.equal(destBalance.toString(), initialBalance.toString())
    });

    it("should fail to transfer amount exceeding balance", async function() {
      const amount = toWei("100000001")
      await assertRevert(token.transfer(user, amount))
    });
  });

  // tests for Rescue
  describe("Rescue funds: get back accidental token transfers", function() {
    beforeEach(setup);
    it("Should be able to get accidentally sent tokens back", async function() {
      let usdc = await OddzToken.new("USD coin", "USDC", initialBalance, {
        from: owner
      });
      const amount = toWei("100");

      // Transfer 100 usdc to user
      await usdc.transfer(user, amount);
      assert.equal(await usdc.balanceOf.call(user), amount);

      // User transferred 100 usdc to ODDZ contract accidentally
      await usdc.transfer(token.address, amount, { from:user });
      assert.equal(await usdc.balanceOf.call(token.address), amount);
      assert.equal(await usdc.balanceOf.call(user), '0');

      // Rescue user funds
      const result = await token.rescueTokens(usdc.address, user, amount);
      assert.equal(result.logs[1].event, 'RescueExcessTokens');

      assert.equal(await usdc.balanceOf.call(user), amount);
    });
  });

  // tests for permit function
  describe("permit function", function() {
    beforeEach(setup);
    it('permit', async function() {
      const amount = 100;
      const nonce = await token.nonces(owner);
      const deadline = web3.utils.toBN(99999999999999); // random timestamp in future
      const hash = await getPermitHash(
        token,
        owner,
        user,
        amount,
        nonce,
        deadline
      );
      // Note: this is for test only, running this on production is highly not recommended
      const privateKey = "0xf40f4eb50e0ecfa9635d058df9e9b9858af3ea8b04c39b039af3e6ae7a4bc87f"
      const sig = ecsign(toBuffer(hash), toBuffer(privateKey))
      let result = await token.permit(owner, user, amount, deadline, sig.v, sig.r, sig.s)
      const approvalLog = result.logs[0];
      assert.equal(approvalLog.args.owner, owner);
      assert.equal(approvalLog.args.spender, user);
      assert.equal(approvalLog.args.value, amount);
    });

    it('permit: wrong data', async function() {
      const amount = 100;
      const nonce = await token.nonces(owner);
      const deadline = web3.utils.toBN(99999999999999); // random timestamp in future
      const hash = await getPermitHash(
        token,
        owner,
        user,
        amount,
        nonce,
        deadline
      );

      // Note: this is for test only, running this on production is highly not recommended
      const privateKey = "0xf40f4eb50e0ecfa9635d058df9e9b9858af3ea8b04c39b039af3e6ae7a4bc87f";
      const sig = ecsign(toBuffer(hash), toBuffer(privateKey));
      await assertRevert(token.permit(user, owner, amount, deadline, sig.v, sig.r, sig.s));
    });
  });
});
