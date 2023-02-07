const {
  getEthersProvider,
  Finding,
  FindingSeverity,
  FindingType,
  ethers,
} = require("forta-agent");
const Big = require("big.js");

const RiskModuleSpec = require("@ensuro/core/build/contracts/RiskModule.sol/RiskModule.json");

const { amountToBigDecimal } = require("../utils");

const config = require("../config.json");

const riskModules = config.handlers.exposure.riskModules;

function createHandleBlock(getEthersProvider, riskModules, rmContractGetter) {
  const provider = getEthersProvider();
  const rmContractFactory = (rm) => rmContractGetter(rm, provider);

  async function handleBlock(blockEvent) {
    const findings = [];

    await Promise.all(
      riskModules.map(async (rm) => {
        const contract = rmContractFactory(rm);

        const activeExposure = amountToBigDecimal(
          await contract.activeExposure({
            blockTag: blockEvent.blockNumber,
          }),
          config.erc20Tokens.USDC
        );
        const exposureLimit = amountToBigDecimal(
          await contract.exposureLimit({
            blockTag: blockEvent.blockNumber,
          }),
          config.erc20Tokens.USDC
        );

        const ratio = activeExposure.div(exposureLimit);

        // console.log(
        //   `AE=${activeExposure}, EL=${exposureLimit}, RATIO=${ratio}`
        // );

        const warnThresh = Big(rm.warnThresh);
        const critThresh = Big(rm.critThresh);

        if (ratio.gt(warnThresh)) {
          findings.push(
            createFinding(
              ratio.gt(critThresh) ? "critExposure" : "warnExposure",
              ratio.gt(critThresh)
                ? "Critically high Exposure"
                : "High Exposure",
              ratio.gt(critThresh)
                ? FindingSeverity.Critical
                : FindingSeverity.High,
              rm,
              ratio.gt(critThresh) ? "critThresh" : "warnThresh",
              ratio
            )
          );
        }
      })
    );

    return findings;
  }
  return handleBlock;
}

function getRiskModuleContract(premiumsAccount, provider) {
  return new ethers.Contract(
    premiumsAccount.address,
    RiskModuleSpec.abi,
    provider
  );
}

function createFinding(id, name, severity, rm, thresholdKey, ratio) {
  return {
    id: `${id}-${rm.address}`,
    finding: Finding.fromObject({
      alertId: id,
      name: name,
      severity: severity,
      description: `Exposure for ${rm.name} (${rm.address}) is ${ratio.toFixed(
        2
      )}, above ${rm[thresholdKey]} thresh.`,
      protocol: "ensuro",
      type: FindingType.Info,
    }),
  };
}

const exposure = createHandleBlock(
  getEthersProvider,
  riskModules,
  getRiskModuleContract
);

module.exports = {
  exposure,
  createFinding,
  createHandleBlock,
};
