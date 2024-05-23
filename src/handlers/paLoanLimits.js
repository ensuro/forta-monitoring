const { getEthersProvider, Finding, FindingSeverity, FindingType } = require("forta-agent");
const Big = require("big.js");
const PremiumsAccountSpec = require("@ensuro/core/build/contracts/PremiumsAccount.sol/PremiumsAccount.json");
const { toBigDecimal } = require("../utils");

const { getERC20Balance, getERC20Contract, getPremiumsAccountContract, getETokenContract } = require("../contracts");

const config = require("../config.json");

const premiumsAccounts = config.handlers.paLoanLimits.premiumsAccounts;

function createHandleBlock(getEthersProvider, premiumsAccounts, paContractGetter, etkContractGetter) {
  const provider = getEthersProvider();
  const paContractFactory = (pa) => paContractGetter(pa, provider);
  const etkContractFactory = (etk) => etkContractGetter(etk, provider);

  async function handleBlock(blockEvent) {
    const findings = [];

    await Promise.all(
      premiumsAccounts.map(async (pa) => {
        const warnThresh = Big(pa.warnThresh);
        const critThresh = Big(pa.critThresh);

        const paContract = paContractFactory(pa);
        const etks = {
          jr: etkContractFactory({ address: await paContract.juniorEtk() }),
          sr: etkContractFactory({ address: await paContract.seniorEtk() }),
        };

        for (const loan of [
          {
            name: "jr",
            address: await paContract.juniorEtk({ blockTag: blockEvent.blockNumber }),
            limit: await paContract.jrLoanLimit({ blockTag: blockEvent.blockNumber }),
            level: await etks.jr.getLoan(pa.address, { blockTag: blockEvent.blockNumber }),
          },
          {
            name: "sr",
            address: await paContract.seniorEtk({ blockTag: blockEvent.blockNumber }),
            limit: await paContract.srLoanLimit({ blockTag: blockEvent.blockNumber }),
            level: await etks.sr.getLoan(pa.address, { blockTag: blockEvent.blockNumber }),
          },
        ]) {
          const limit = toBigDecimal(loan.limit, config.erc20Tokens.USDC.decimals);
          const level = toBigDecimal(loan.level, config.erc20Tokens.USDC.decimals);
          const ratio = limit.eq(0) ? null : level.div(limit);
          if (ratio === null) {
            continue;
          }

          if (ratio.gt(warnThresh)) {
            findings.push(
              createFinding(
                ratio.gt(critThresh) ? "critLoanRatio" : "warnLoanRatio",
                ratio.gt(critThresh) ? "Critically high loan ratio" : "High loan ratio",
                ratio.gt(critThresh) ? FindingSeverity.Critical : FindingSeverity.High,
                pa,
                loan.name,
                ratio.gt(critThresh) ? "critThresh" : "warnThresh",
                { level, limit, ratio }
              )
            );
          }
        }
      })
    );

    return findings;
  }
  return handleBlock;
}

function createFinding(id, name, severity, pa, etk, thresholdKey, values) {
  const namespacedId = `paLoanLimits.${id}`;
  return {
    id: `${namespacedId}-${pa.address}`,
    finding: Finding.fromObject({
      alertId: namespacedId,
      name: name,
      severity: severity,
      description: `Loan Level for ${pa.name} (${pa.address}) in EToken ${etk} is ${values.ratio.toFixed(2)}, above ${
        pa[thresholdKey]
      } thresh. Level: ${values.level.toFixed(2)}, Limit: ${values.limit.toFixed(2)}`,
      protocol: "ensuro",
      type: FindingType.Info,
      addresses: [pa.address],
    }),
  };
}

const paLoanLimits = createHandleBlock(
  getEthersProvider,
  premiumsAccounts,
  getPremiumsAccountContract,
  getETokenContract
);

module.exports = {
  paLoanLimits,
  createHandleBlock,
  createFinding,
};
