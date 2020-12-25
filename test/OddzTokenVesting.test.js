const Token = artifacts.require('./contracts/OddzToken.sol');
const Vesting = artifacts.require('./contracts/Vesting/OddzTokenVesting.sol');
const BigNumber = web3.utils.BigNumber;

const SCALING_FACTOR = web3.utils.toBN(10 ** 18)
const toWei = web3.utils.toWei

const increaseBlockTime = async (seconds) => {
  return web3.currentProvider.send({
    jsonrpc: "2.0",
    method: "evm_increaseTime",
    params: [seconds],
    id: new Date().getTime()
  }, ()=> {});
}


const mineOneBlock = async () => {
  return web3.currentProvider.send({
    jsonrpc: "2.0",
    method: 'evm_mine',
    id: new Date().getTime()
  }, () => {});
}

const assertRevert = async (promise, errorMessage = null) => {
  try {
    const transaction = await promise;
    const {gasUsed} = await web3.eth.getTransactionReceipt(transaction.tx);
    if(gasUsed >= 6700000) return;
  } catch (error) {
    if(errorMessage) {
      assert(error.message.search(errorMessage) >=0, `Expected ${errorMessage}`);
    }
    const invalidOpCode = error.message.search('revert') >= 0;
    assert(invalidOpCode, `Expected revert, got ${error} instead`);
    return;
  }
  assert.ok(false, `Error containing "Revert" must be returned`);
}

require('chai').use(require("chai-bignumber")(BigNumber)).should();

contract("Token", async ([owner, user]) => {
  let token, vesting;
  const vestedSupply = web3.utils.toBN(11650000).mul(SCALING_FACTOR);
  const vestingSupply = web3.utils.toBN(88350000).mul(SCALING_FACTOR);
  const totalSupply = vestedSupply.add(vestingSupply);

  describe("Token vesting", () => {
    beforeEach(async () => {
      token = await Token.new("OddzToken", "ODDZ", totalSupply, {
        from: owner
      });
      const total = await token.totalSupply.call();
      vesting = await Vesting.new(token.address, {from: owner})
      assert.equal((await vesting.token()).toString(), token.address.toString());
      // transfer tokens to vesting contract
      await token.transfer(vesting.address, vestingSupply, {from: owner});
    });

    it("should test token vesting for userX", async () => {
      const amount = toWei("10");
      const {timestamp} = await web3.eth.getBlock("latest");
      let time = new Date(timestamp);
      time.setMinutes(time.getMinutes()+ 6);
      time =  +time;
      let result = await vesting.addVesting(user, time.toString(), amount, {from: owner});
      await token.transfer(vesting.address, amount, {from: owner});
      let balance = await vesting.vestingAmount(result.receipt.logs[0].args.vestingId);
      assert.equal(balance.toString(), amount.toString());
    });

    it("should test addVesting data", async function() {
      const vestingAmount = toWei("10")
      const block = await web3.eth.getBlock("latest")
      const blockTime = block.timestamp
      let time = new Date(blockTime)
      time.setMinutes(time.getMinutes() + 6)
      time = +time
      let result = await vesting.addVesting(
        user,
        time.toString(),
        vestingAmount,
        {
          from: owner
        }
      )
      const vestingId = +result.logs[0].args.vestingId;
      assert.equal(await vesting.vestingAmount(vestingId), vestingAmount);
      assert.equal(await vesting.releaseTime(vestingId), time);
      assert.equal(await vesting.beneficiary(vestingId), user);
    });

    it("Removing a vesting entry with the owner account", async function() {
      let result = await vesting.removeVesting(3, { from: owner })
      const excessTokens = result.receipt.logs[0].args["2"]
      let balance = await token.balanceOf.call(owner)
      assert.equal(balance.toString(), vestedSupply.toString()) // initial tokens

      await vesting.retrieveExcessTokens(excessTokens, {
        from: owner
      })
      const expectedBalance = excessTokens.add(balance).toString()
      balance = await token.balanceOf.call(owner)
      assert.equal(balance.toString(), expectedBalance)
    })

    it("Removing a vesting entry with a non-owner account", async function() {
      await assertRevert(vesting.removeVesting(4, { from: user })) //""
    })

    it("Trying to remove a non-existent vesting entry", async function() {
      await assertRevert(
        vesting.removeVesting(53, { from: owner }),
        "Invalid vesting id"
      )
    })

    it("Trying to remove an already released vesting entry", async function() {
      // Time travel
      let seconds = 30 * 86400 * 1000
      await increaseBlockTime(seconds)
      await mineOneBlock()
      await vesting.release(1, { from: owner })
      await assertRevert(
        vesting.release(1, { from: owner }),
        "Vesting already released"
      )
    })

    it("Trying to remove an already removed vesting entry", async function() {
      await vesting.removeVesting(3)
      await assertRevert(
        vesting.removeVesting(3, { from: owner }),
        "Vesting already released"
      )
    })

    it("Trying to add a vesting entry from a non-owner account", async function() {
      const amount = toWei("10")
      let block = await web3.eth.getBlock("latest")
      let blockTime = block.timestamp
      let time = new Date(blockTime)
      time.setMinutes(time.getMinutes() + 6)
      time = +time
      await assertRevert(
        vesting.addVesting(user, "" + time, amount, {
          from: user
        })
      )
    })

    it("should test token vesting for amount greater then balance of vesting contract", async function() {
      const amount = toWei((10 ** 11).toString()) // big number then total tokens in vesting
      let block = await web3.eth.getBlock("latest")
      let blockTime = block.timestamp
      let time = new Date(blockTime)
      time.setMinutes(time.getMinutes() + 1)
      time = +time
      let result = await vesting.addVesting(
        user,
        time.toString(),
        amount,
        {
          from: owner
        }
      )
      // Time travel
      let seconds = 60 * 1000
      await increaseBlockTime(seconds)
      await mineOneBlock()

      //Insufficient balance
      await assertRevert(
        vesting.release(result.receipt.logs[0].args.vestingId),
        "Insufficient balance"
      )
      await vesting.removeVesting(result.receipt.logs[0].args.vestingId, {
        from: owner
      })
    })

    it("Trying to release the tokens associated with existing vesting entry", async function() {
      let amount = await token.balanceOf(vesting.address)
      await assertRevert(vesting.retrieveExcessTokens(amount, { from: owner }))
    })

    it("should test token vesting for amount exactly equal to the balance of vesting contract", async function() {
      let p = []
      // Time travel
      let second = 10000 * 720 * 60
      await increaseBlockTime(second)
      await mineOneBlock()

      for (let i = 1; i < 30; i++) {
        p.push(vesting.release(i))
      }
      await Promise.all(p)
      let balanceOfVesting = await token.balanceOf(vesting.address)
      const vestingAmount = await vesting.vestingAmount(30)
      assert.equal(balanceOfVesting.toString(), vestingAmount.toString())
      await vesting.release(30)
      balanceOfVesting = await token.balanceOf(vesting.address)
      assert.equal(balanceOfVesting.toString(), "0")
    })
  })
});