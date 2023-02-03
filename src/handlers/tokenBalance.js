const {
  getEthersProvider,
  Finding,
  FindingSeverity,
  FindingType,
  ethers,
} = require("forta-agent");

const { getERC20Balance, getERC20Contract } = require("../erc20");

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
        const accountBalance = await getERC20Balance(
          account,
          erc20ContractFactory,
          blockEvent.blockNumber
        );

        const warnThresh = ethers.utils.parseEther(account.warnThresh);
        const critThresh = ethers.utils.parseEther(account.critThresh);

        if (accountBalance.lt(critThresh)) {
          findings.push(
            createFinding(
              "critBalance",
              "Critically low token balance",
              FindingSeverity.Critical,
              account,
              "critThresh",
              accountBalance
            )
          );
        } else if (accountBalance.lt(warnThresh)) {
          findings.push(
            createFinding(
              "warnBalance",
              "Low token balance",
              FindingSeverity.High,
              account,
              "warnThresh",
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
      description: `${account.token} balance for ${account.name} (${account.address}) is ${formattedBalance}, below ${account[thresholdKey]} thresh.`,
      protocol: "ensuro",
      type: FindingType.Info,
    }),
  };
}

const tokenBalance = createHandleBlock(
  getEthersProvider,
  accounts,
  getERC20Contract
);

module.exports = {
  tokenBalance,
  createHandleBlock,
  createFinding,
};
