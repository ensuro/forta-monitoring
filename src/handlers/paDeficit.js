const {
  getEthersProvider,
  Finding,
  FindingSeverity,
  FindingType,
  ethers,
} = require("forta-agent");

const { WAD_DECIMALS } = require("../constants");
const { getERC20Balance, getERC20Contract } = require("../erc20");

const config = require("../config.json");

const PREMIUMS_ACCOUNT_ABI =
  '[{"inputs": [], "name": "activePurePremiums", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "surplus", "outputs": [ { "internalType": "int256", "name": "", "type": "int256" } ], "stateMutability": "view", "type": "function" }]';

const AMOUNT_TO_WAD = ethers.BigNumber.from("10").pow(
  ethers.BigNumber.from(WAD_DECIMALS - config.erc20Tokens.USDC.decimals)
);

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

        const activePurePremiums = await getActivePurePremiums(
          contract,
          blockEvent.blockNumber
        );

        const ratio = deficit
          .div(activePurePremiums)
          .mul(
            ethers.BigNumber.from("10").pow(config.erc20Tokens.USDC.decimals)
          );

        const warnThresh = ethers.utils.parseUnits(pa.warnThresh);
        const critThresh = ethers.utils.parseUnits(pa.critThresh);

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
    PREMIUMS_ACCOUNT_ABI,
    provider
  );
}

/**
 * Returns the PA deficit as Wad
 * @param {*} contract  the premiums account contract
 * @param {*} blockNumber  the block number to fetch
 */
async function getDeficit(contract, blockNumber) {
  const surplus = await contract.surplus({
    blockTag: blockNumber,
  });

  if (surplus.gte(0)) return ethers.BigNumber.from("0");

  return surplus.mul(AMOUNT_TO_WAD).mul(-1);
}

/**
 * Returns the PA activePurePremiums as USDC amount
 * @param {*} contract  the premiums account contract
 * @param {*} blockNumber  the block number to fetch
 */
async function getActivePurePremiums(contract, blockNumber) {
  return contract.activePurePremiums({
    blockTag: blockNumber,
  });
}

function createFinding(id, name, severity, pa, thresholdKey, ratio) {
  const formattedDeficit = ethers.utils.formatUnits(ratio);

  return {
    id: `${id}-${pa.address}`,
    finding: Finding.fromObject({
      alertId: id,
      name: name,
      severity: severity,
      description: `Deficit for ${pa.name} (${pa.address}) is ${formattedDeficit}, above ${pa[thresholdKey]} thresh.`,
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
