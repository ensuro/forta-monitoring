const {
  getEthersProvider,
  Finding,
  FindingSeverity,
  FindingType,
  ethers,
} = require("forta-agent");

const { getERC20Balance, getERC20Contract } = require("../erc20");

const config = require("../config.json");

const accounts = config.handlers.gasBalance.accounts;

function createHandleBlock(getEthersProvider, accounts) {
  const provider = getEthersProvider();

  const monitoredAccounts = accounts.map((account) => ({
    ...account,
    lastFinding: 0,
  }));

  async function handleBlock(blockEvent) {
    const findings = [];

    const timestamp = blockEvent.block.timestamp;

    await Promise.all(
      monitoredAccounts.map(async (account) => {
        if (timestamp - account.lastFinding < config.minIntervalSeconds) {
          console.log(
            `Skipping account ${account.name} (${account.address}) because last finding was very recent`
          );
          return;
        }

        let accountBalance;
        accountBalance = await provider.getBalance(
          account.address,
          blockEvent.blockNumber
        );

        const warnThresh = ethers.utils.parseEther(account.warnThresh);
        const critThresh = ethers.utils.parseEther(account.critThresh);

        if (accountBalance.lt(critThresh)) {
          findings.push(
            createFinding(
              "critBalance",
              "Critically low balance",
              FindingSeverity.Critical,
              account,
              "critThresh",
              accountBalance
            )
          );
          account.lastFinding = timestamp;
        } else if (accountBalance.lt(warnThresh)) {
          findings.push(
            createFinding(
              "warnBalance",
              "Low balance",
              FindingSeverity.High,
              account,
              "warnThresh",
              accountBalance
            )
          );
          account.lastFinding = timestamp;
        }
      })
    );

    return findings;
  }

  return handleBlock;
}

function createFinding(id, name, severity, account, thresholdKey, balance) {
  const formattedBalance = ethers.utils.formatUnits(balance);

  return Finding.fromObject({
    alertId: id,
    name: name,
    severity: severity,
    description: `Balance for ${account.name} (${account.address}) is ${formattedBalance}, below ${account[thresholdKey]} thresh.`,
    protocol: "ensuro",
    type: FindingType.Info,
  });
}

const gasBalance = createHandleBlock(getEthersProvider, accounts);

module.exports = {
  gasBalance,
  createHandleBlock,
  createFinding,
};
