const {
  getEthersProvider,
  Finding,
  FindingSeverity,
  FindingType,
  ethers,
} = require("forta-agent");

const { MIN_INTERVAL_SECONDS } = require("./constants");

const accounts = [
  {
    name: "Anonymous Relayer",
    address: "0xab8fd8630e0f1f2537741672d154b5a846621ccd",
    warnThresh: "10.0",
    critThresh: "5.0",
  },
  {
    name: "Innovation Zone",
    address: "0x257d6896f0053648f9bb9310ef3b046fc2079994",
    warnThresh: "2.0",
    critThresh: "1.0",
  },
];

function createFinding(id, name, severity, account, thresholdKey) {
  return Finding.fromObject({
    alertId: id,
    name: name,
    severity: severity,
    description: `Balance for ${account.name} (${account.address}) is below ${account[thresholdKey]}.`,
    protocol: "ensuro",
    type: FindingType.Info,
  });
}

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
        if (timestamp - account.lastFinding < MIN_INTERVAL_SECONDS) {
          console.log(
            `Skipping account ${account.name} (${account.address}) because last finding was very recent`
          );
          return;
        }

        const accountBalance = await provider.getBalance(
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
              "critThresh"
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
              "warnThresh"
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

const handleBlock = createHandleBlock(getEthersProvider, accounts);

module.exports = {
  handleBlock,
  createHandleBlock,
  createFinding,
  MIN_INTERVAL_SECONDS,
};
