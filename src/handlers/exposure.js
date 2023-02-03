const {
  getEthersProvider,
  Finding,
  FindingSeverity,
  FindingType,
  ethers,
} = require("forta-agent");

const { WAD_DECIMALS } = require("../constants");

const config = require("../config.json");

const RISK_MODULE_ABI =
  '[{ "inputs": [], "name": "activeExposure", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "stateMutability": "view", "type": "function" },    { "inputs": [], "name": "exposureLimit", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "stateMutability": "view", "type": "function" }]';

const riskModules = config.handlers.exposure.riskModules;

function createHandleBlock(getEthersProvider, riskModules, rmContractGetter) {
  const provider = getEthersProvider();
  const rmContractFactory = (rm) => rmContractGetter(rm, provider);

  async function handleBlock(blockEvent) {
    const findings = [];

    await Promise.all(
      riskModules.map(async (rm) => {
        const contract = rmContractFactory(rm);

        const activeExposure = await contract.activeExposure({
          blockTag: blockEvent.blockNumber,
        });
        const exposureLimit = await contract.exposureLimit({
          blockTag: blockEvent.blockNumber,
        });
        const ratio = activeExposure
          .mul(ethers.BigNumber.from("10").pow(WAD_DECIMALS))
          .div(exposureLimit);

        // console.log(
        //   `AE=${activeExposure}, EL=${exposureLimit}, RATIO=${ratio}`
        // );

        const warnThresh = ethers.utils.parseUnits(rm.warnThresh);
        const critThresh = ethers.utils.parseUnits(rm.critThresh);

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
    RISK_MODULE_ABI,
    provider
  );
}

function createFinding(id, name, severity, rm, thresholdKey, ratio) {
  const formattedExposure = ethers.utils.formatUnits(ratio);

  return {
    id: `${id}-${rm.address}`,
    finding: Finding.fromObject({
      alertId: id,
      name: name,
      severity: severity,
      description: `Exposure for ${rm.name} (${rm.address}) is ${formattedExposure}, above ${rm[thresholdKey]} thresh.`,
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
