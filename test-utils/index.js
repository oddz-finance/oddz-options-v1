const { bufferToHex, keccak256, keccakFromString, toBuffer } = require('ethereumjs-util');

const PERMIT_TYPEHASH = bufferToHex(keccakFromString('Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)'));

function getDomainSeparator(name, tokenAddress) {
  return keccak256(toBuffer(
    web3.eth.abi.encodeParameters(
      ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
      [
        bufferToHex(keccakFromString('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)')),
        bufferToHex(keccakFromString(name)),
        bufferToHex(keccakFromString('1')),
        1,
        tokenAddress
      ]
    )
    )
  );
}

exports.getPermitHash =  async function getPermitHash(
  token,
  owner,
  spender,
  value,
  nonce,
  deadline
) {
  const name = await token.name();
  const DOMAIN_SEPARATOR = getDomainSeparator(name, token.address);

  return keccak256(
    Buffer.concat([
      toBuffer('0x19'),
      toBuffer('0x01'),
      toBuffer(DOMAIN_SEPARATOR),
      keccak256(toBuffer(
        web3.eth.abi.encodeParameters(
          ['bytes32', 'address', 'address', 'uint256', 'uint256', 'uint256'],
          [PERMIT_TYPEHASH, owner, spender, value, nonce.toNumber(), deadline.toNumber()]
        ))
      )]
    ));
}