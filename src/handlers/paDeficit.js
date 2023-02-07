const {
  getEthersProvider,
  Finding,
  FindingSeverity,
  FindingType,
  ethers,
} = require("forta-agent");
const Big = require("big.js");

const PremiumsAccountSpec = require("@ensuro/core/build/contracts/PremiumsAccount.sol/PremiumsAccount.json");

const { toBigDecimal } = require("../utils");

const config = require("../config.json");

const premiumsAccounts = config.handlers.paDeficit.premiumsAccounts;

function createHandleBlock(
  getEthersProvider,
  premiumsAccounts,
  paContractGetter
) {
  const provider = getEthersProvider();
  const paContractFactory = (pa) => paContractGetter(pa, provider);

  async function handleBlock(blockEvent) {
    const findings = [];

    await Promise.all(
      premiumsAccounts.map(async (pa) => {
        const contract = paContractFactory(pa);

        const deficit = await getDeficit(contract, blockEvent.blockNumber);

        const activePurePremiums = toBigDecimal(
          await contract.activePurePremiums({
            blockTag: blockEvent.blockNumber,
          })
        );

        const ratio = deficit.div(activePurePremiums);

        const warnThresh = Big(pa.warnThresh);
        const critThresh = Big(pa.critThresh);

        if (ratio.gt(warnThresh)) {
          findings.push(
            createFinding(
              ratio.gt(critThresh) ? "critDeficit" : "warnDeficit",
              ratio.gt(critThresh) ? "Critically high deficit" : "High deficit",
              ratio.gt(critThresh)
                ? FindingSeverity.Critical
                : FindingSeverity.High,
              pa,
              ratio.gt(critThresh) ? "critThresh" : "warnThresh",
              ratio
            )
          );
        }

        // console.log(
        //   `deficit=${ethers.utils.formatUnits(
        //     deficit,
        //     WAD_DECIMALS
        //   )}, activePP=${ethers.utils.formatUnits(
        //     activePurePremiums,
        //     6
        //   )}, ratio=${ethers.utils.formatUnits(ratio, WAD_DECIMALS)}`
        // );
      })
    );

    return findings;
  }
  return handleBlock;
}

function getPremiumsAccountContract(premiumsAccount, provider) {
  return new ethers.Contract(
    premiumsAccount.address,
    PremiumsAccountSpec.abi,
    provider
  );
}

/**
 * Returns the PA deficit as a Big decimal
 * @param {*} contract  the premiums account contract
 * @param {*} blockNumber  the block number to fetch
 */
async function getDeficit(contract, blockNumber) {
  const surplus = toBigDecimal(
    await contract.surplus({
      blockTag: blockNumber,
    })
  );

  if (surplus.gte(0)) return Big("0");

  return surplus.mul(-1);
}

function createFinding(id, name, severity, pa, thresholdKey, ratio) {
  return {
    id: `${id}-${pa.address}`,
    finding: Finding.fromObject({
      alertId: id,
      name: name,
      severity: severity,
      description: `Deficit for ${pa.name} (${pa.address}) is ${ratio.toFixed(
        2
      )}, above ${pa[thresholdKey]} thresh.`,
      protocol: "ensuro",
      type: FindingType.Info,
    }),
  };
}

const paDeficit = createHandleBlock(
  getEthersProvider,
  premiumsAccounts,
  getPremiumsAccountContract
);

module.exports = {
  paDeficit,
  createFinding,
  createHandleBlock,
};
