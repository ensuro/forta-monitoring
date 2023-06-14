const {
  getEthersProvider,
  Finding,
  FindingSeverity,
  FindingType,
  ethers,
} = require("forta-agent");
const Big = require("big.js");

const ETokenSpec = require("@ensuro/core/build/contracts/EToken.sol/EToken.json");

const { amountToBigDecimal, wadToBigDecimal } = require("../utils");

const config = require("../config.json");

const etokens = config.handlers.etkUtilizationRate?.etokens;

function createHandleBlock(getEthersProvider, etokens, etkContractGetter) {
  const provider = getEthersProvider();
  const etkContractFactory = (rm) => etkContractGetter(rm, provider);

  async function handleBlock(blockEvent) {
    const findings = [];

    await Promise.all(
      etokens.map(async (etk) => {
        const contract = etkContractFactory(etk);

        const totalSupply = amountToBigDecimal(
          await contract.totalSupply({
            blockTag: blockEvent.blockNumber,
          }),
          config.erc20Tokens.USDC
        );
        const scr = amountToBigDecimal(
          await contract.scr({ blockTag: blockEvent.blockNumber }),
          config.erc20Tokens.USDC
        );

        const maxUtilizationRate = wadToBigDecimal(
          await contract.maxUtilizationRate({
            blockTag: blockEvent.blockNumber,
          })
        );
        const utilizationRate = totalSupply.gt(0)
          ? scr.div(totalSupply)
          : Big(0);

        const maxScr = totalSupply.mul(maxUtilizationRate);
        const ratio = maxScr.gt(0) ? scr.div(maxScr) : Big(0);

        const warnThresh = Big(etk.warnThresh);
        const critThresh = Big(etk.critThresh);

        if (ratio.gt(warnThresh)) {
          findings.push(
            createFinding(
              ratio.gt(critThresh)
                ? "critUtilizationRate"
                : "warnUtilizationRate",
              ratio.gt(critThresh)
                ? "Critically high utilization rate"
                : "High utilization rate",
              ratio.gt(critThresh)
                ? FindingSeverity.Critical
                : FindingSeverity.High,
              etk,
              ratio.gt(critThresh) ? "critThresh" : "warnThresh",
              utilizationRate,
              maxUtilizationRate
            )
          );
        }
      })
    );

    return findings;
  }
  return handleBlock;
}

function getETokenContract(etoken, provider) {
  return new ethers.Contract(etoken.address, ETokenSpec.abi, provider);
}

function createFinding(id, name, severity, etk, thresholdKey, ur, maxUR) {
  const namespacedId = `etkUtilizationRate.${id}`;
  return {
    id: `${namespacedId}-${etk.address}`,
    finding: Finding.fromObject({
      alertId: namespacedId,
      name: name,
      severity: severity,
      description: `Utilization rate for ${etk.name} (${etk.address}) is ${
        ur.toFixed(2) * 100
      }%, above ${etk[thresholdKey] * 100}% of maxUR ${maxUR * 100}%.`,
      protocol: "ensuro",
      type: FindingType.Info,
    }),
  };
}

const etkUtilizationRate = createHandleBlock(
  getEthersProvider,
  etokens,
  getETokenContract
);

module.exports = {
  etkUtilizationRate,
  createFinding,
  createHandleBlock,
};
