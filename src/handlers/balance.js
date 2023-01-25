const {
  getEthersProvider,
  Finding,
  FindingSeverity,
  FindingType,
  ethers,
} = require("forta-agent");

const {
  MIN_INTERVAL_SECONDS,
  ERC20_TOKENS,
  ERC20_ABI,
  WAD_DECIMALS,
} = require("../constants");

const config = require("../config.json");

const accounts = config.balanceMonitoring;

function createHandleBlock(getEthersProvider, accounts, erc20ContractGetter) {
  const provider = getEthersProvider();
  const erc20ContractFactory = (token) => erc20ContractGetter(token, provider);

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

        let accountBalance;
        if (account.token !== undefined) {
          accountBalance = await getERC20Balance(
            account,
            erc20ContractFactory,
            blockEvent.blockNumber
          );
        } else {
          accountBalance = await provider.getBalance(
            account.address,
            blockEvent.blockNumber
          );
        }

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

/**
 *
 * @param account an {address, token} object
 * @param provider the ethersProvider
 * @param blockNumber the block number to get the balance for
 * @returns the account's token balance in WAD
 */
async function getERC20Balance(account, contractLoader, blockNumber) {
  const erc20Contract = contractLoader(account.token);
  let accountBalance = await erc20Contract.balanceOf(account.address, {
    blockTag: blockNumber,
  });

  accountBalance = accountBalance.mul(
    ethers.BigNumber.from(10).pow(
      ethers.BigNumber.from(WAD_DECIMALS - ERC20_TOKENS[account.token].decimals)
    )
  );
  return accountBalance;
}

function getERC20Contract(token, provider) {
  return new ethers.Contract(ERC20_TOKENS[token].address, ERC20_ABI, provider);
}

function createFinding(id, name, severity, account, thresholdKey, balance) {
  const descriptionPrefix = account.token
    ? `${account.token} balance`
    : "Balance";
  const formattedBalance = ethers.utils.formatUnits(balance);

  return Finding.fromObject({
    alertId: id,
    name: name,
    severity: severity,
    description: `${descriptionPrefix} for ${account.name} (${account.address}) is ${formattedBalance} below ${account[thresholdKey]}.`,
    protocol: "ensuro",
    type: FindingType.Info,
  });
}

const balanceMonitoring = createHandleBlock(
  getEthersProvider,
  accounts,
  getERC20Contract
);

module.exports = {
  balanceMonitoring,
  createHandleBlock,
  createFinding,
  MIN_INTERVAL_SECONDS,
};
