const { ethers } = require("forta-agent");

const { toBigDecimal } = require("./utils");
const { WAD_DECIMALS } = require("./constants");
const config = require("./config.json");

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
  return toBigDecimal(
    await erc20Contract.balanceOf(account.address, {
      blockTag: blockNumber,
    }),
    config.erc20Tokens[account.token].decimals
  );
}

function getERC20Contract(token, provider) {
  return new ethers.Contract(
    config.erc20Tokens[token].address,
    ERC20_ABI,
    provider
  );
}

module.exports = { getERC20Balance, getERC20Contract, ERC20_ABI };
