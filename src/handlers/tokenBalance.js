const { getEthersProvider, Finding, FindingSeverity, FindingType } = require("forta-agent");
const Big = require("big.js");

const { getERC20Balance, getERC20Contract } = require("../contracts");

const config = require("../config.json");

const accounts = config.handlers.tokenBalance.accounts;

function createHandleBlock(getEthersProvider, accounts, erc20ContractGetter) {
  const provider = getEthersProvider();
  const erc20ContractFactory = (token) => erc20ContractGetter(token, provider);

  const monitoredAccounts = accounts.map((account) => ({
    ...account,
    lastFinding: 0,
  }));

  async function handleBlock(blockEvent) {
    const findings = [];

    await Promise.all(
      monitoredAccounts.map(async (account) => {
        const accountBalance = await getERC20Balance(account, erc20ContractFactory, blockEvent.blockNumber);

        const warnThresh = Big(account.warnThresh);
        const critThresh = Big(account.critThresh);

        if (accountBalance.lt(warnThresh)) {
          findings.push(
            createFinding(
              accountBalance.lt(critThresh) ? "critBalance" : "warnBalance",
              accountBalance.lt(critThresh) ? "Critically low token balance" : "Low token balance",
              accountBalance.lt(critThresh) ? FindingSeverity.Critical : FindingSeverity.High,
              account,
              accountBalance.lt(critThresh) ? "critThresh" : "warnThresh",
              accountBalance
            )
          );
        }
      })
    );

    return findings;
  }

  return handleBlock;
}

function createFinding(id, name, severity, account, thresholdKey, balance) {
  const namespacedId = `tokenBalance.${id}`;
  return {
    id: `${namespacedId}-${account.address}`,
    finding: Finding.fromObject({
      alertId: namespacedId,
      name: name,
      severity: severity,
      description: `${account.token} balance for ${account.name} (${account.address}) is ${balance.toFixed(4)}, below ${
        account[thresholdKey]
      } thresh.`,
      protocol: "ensuro",
      type: FindingType.Info,
    }),
  };
}

const tokenBalance = createHandleBlock(getEthersProvider, accounts, getERC20Contract);

module.exports = {
  tokenBalance,
  createHandleBlock,
  createFinding,
};
