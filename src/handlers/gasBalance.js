const {
  getEthersProvider,
  Finding,
  FindingSeverity,
  FindingType,
  ethers,
} = require("forta-agent");

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
        accountBalance = await provider.getBalance(
          account.address,
          blockEvent.blockNumber
        );

        const warnThresh = ethers.utils.parseEther(account.warnThresh);
        const critThresh = ethers.utils.parseEther(account.critThresh);

        if (accountBalance.lt(warnThresh)) {
          findings.push(
            createFinding(
              accountBalance.lt(critThresh) ? "critBalance" : "warnBalance",
              accountBalance.lt(critThresh)
                ? "Critically low balance"
                : "Low balance",
              accountBalance.lt(critThresh)
                ? FindingSeverity.Critical
                : FindingSeverity.High,
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
  const formattedBalance = ethers.utils.formatUnits(balance);

  return {
    id: `${id}-${account.address}`,
    finding: Finding.fromObject({
      alertId: id,
      name: name,
      severity: severity,
      description: `Balance for ${account.name} (${account.address}) is ${formattedBalance}, below ${account[thresholdKey]} thresh.`,
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
