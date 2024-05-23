const { ethers } = require("forta-agent");

const { amountToBigDecimal } = require("./utils");
const config = require("./config.json");

const PremiumsAccountSpec = require("@ensuro/core/build/contracts/PremiumsAccount.sol/PremiumsAccount.json");
const ETokenSpec = require("@ensuro/core/build/contracts/EToken.sol/EToken.json");

const ERC20_ABI = `[ { "constant": true, "inputs": [ { "name": "_owner", "type": "address" } ], "name": "balanceOf", "outputs": [ { "name": "balance", "type": "uint256" } ], "payable": false, "type": "function" } ]`;

/**
 *
 * @param account an {address, token} object
 * @param provider the ethersProvider
 * @param blockNumber the block number to get the balance for
 * @returns the account's token balance as Big decimal
 */
async function getERC20Balance(account, contractLoader, blockNumber) {
  const erc20Contract = contractLoader(account.token);
  return amountToBigDecimal(
    await erc20Contract.balanceOf(account.address, {
      blockTag: blockNumber,
    }),
    config.erc20Tokens[account.token]
  );
}

function getERC20Contract(token, provider) {
  return new ethers.Contract(config.erc20Tokens[token].address, ERC20_ABI, provider);
}

function getPremiumsAccountContract(premiumsAccount, provider) {
  return new ethers.Contract(premiumsAccount.address, PremiumsAccountSpec.abi, provider);
}

function getETokenContract(etoken, provider) {
  return new ethers.Contract(etoken.address, ETokenSpec.abi, provider);
}

module.exports = { getERC20Balance, getERC20Contract, getETokenContract, getPremiumsAccountContract, ERC20_ABI };
