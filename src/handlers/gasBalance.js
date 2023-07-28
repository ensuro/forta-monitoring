const { getEthersProvider, Finding, FindingSeverity, FindingType } = require("forta-agent");
const Big = require("big.js");

const { wadToBigDecimal } = require("../utils");
const config = require("../config.json");

const accounts = config.handlers.gasBalance.accounts;

function createHandleBlock(getEthersProvider, accounts) {
  const provider = getEthersProvider();

  const monitoredAccounts = accounts.map((account) => ({
    ...account,
  }));

  async function handleBlock(blockEvent) {
    const findings = [];

    await Promise.all(
      monitoredAccounts.map(async (account) => {
        let accountBalance;
        accountBalance = wadToBigDecimal(await provider.getBalance(account.address, blockEvent.blockNumber));

        const warnThresh = Big(account.warnThresh);
        const critThresh = Big(account.critThresh);

        if (accountBalance.lt(warnThresh)) {
          findings.push(
            createFinding(
              accountBalance.lt(critThresh) ? "critBalance" : "warnBalance",
              accountBalance.lt(critThresh) ? "Critically low balance" : "Low balance",
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
  const namespacedId = `gasBalance.${id}`;
  return {
    id: `${namespacedId}-${account.address}`,
    finding: Finding.fromObject({
      alertId: namespacedId,
      name: name,
      severity: severity,
      description: `Balance for ${account.name} (${account.address}) is ${balance.toFixed(4)}, below ${
        account[thresholdKey]
      } thresh.`,
      protocol: "ensuro",
      type: FindingType.Info,
    }),
  };
}

const gasBalance = createHandleBlock(getEthersProvider, accounts);

module.exports = {
  gasBalance,
  createHandleBlock,
  createFinding,
};
