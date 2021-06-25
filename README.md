![Build Status](https://github.com/oddz-finance/oddz-options-v1/workflows/build/badge.svg?branch=master)

# Oddz finance

World's First multi-chain Options trading Protocol built on Binance chain with built-in oracle

- [Hardhat](https://github.com/nomiclabs/hardhat): compile and run the smart contracts on a local development network
- [TypeChain](https://github.com/ethereum-ts/TypeChain): generate TypeScript types for smart contracts
- [Ethers](https://github.com/ethers-io/ethers.js/): renowned Ethereum library and wallet implementation
- [Waffle](https://github.com/EthWorks/Waffle): tooling for writing comprehensive smart contract tests
- [Solhint](https://github.com/protofire/solhint): linter
- [Solcover](https://github.com/sc-forks/solidity-coverage) code coverage
- [Prettier Plugin Solidity](https://github.com/prettier-solidity/prettier-plugin-solidity): code formatter

# How to contribute to Oddz

This document contains some tips on how to collaborate in this project.

## Filing an issue

If you find a bug or want to propose a new feature, please [open an issue](https://github.com/oddz-finance/oddz-options-v1/issues/new). Pull requests are welcome, but we recommend you discuss it in an issue first, especially for big changes. This will increase the odds that we can accept your PR.

## Project structure

There's a folder for each modules in `contracts/` and test cases in `tests/`



## Installing

To install the project's dependencies, run `yarn install` in the root directory of the repository.


## Set up .evn

create a new .env file by copying it's content from .env.example and update `INFURA_API_KEY` and `MNEMONIC`

```sh
$ cp .env.example .env
```

## Building the projects

Compile the smart contracts and generate TypeChain artifacts:

```sh
$ yarn compile
```

## Code formatting


We use [Prettier](https://prettier.io/) to format all the code without any special configuration. Whatever Prettier does is considered The Right Thing. It's completely fine to commit non-prettied code and then reformat it in a later commit.

Lint the Solidity code:

```sh
$ yarn lint:sol
```

Lint the TypeScript code:

```sh
$ yarn lint:ts
```

## Testing

All tests are written using [mocha](https://mochajs.org).

Run the Mocha tests:

```sh
$ yarn test
```

## Performance and dependencies loading

Generate the code coverage report:

```sh
$ yarn coverage
```


## Branching

We work on the branch [`master`](https://github.com/oddz-finance/oddz-options-v1/tree/master). Versions of the different packages are always tagged and pushed to GitHub. So if you are looking for the latests released version of something, please refer to the tags.

Use branch from `master` when implementing a new feature or fixing a bug and use it as the base branch in pull requests.