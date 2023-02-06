const { FindingSeverity, createBlockEvent, ethers } = require("forta-agent");

const { createHandleBlock, createFinding } = require("./exposure");
const config = require("../config.json");
const { default: Big } = require("big.js");

const USDC_UNIT = ethers.BigNumber.from(10).pow(
  config.erc20Tokens.USDC.decimals
);

const block = {
  hash: `0x${"0".repeat(64)}`,
  timestamp: Date.now() / 1000,
};

describe("RM exposure monitoring", () => {
  const premiumsAccounts = [
    {
      name: "Test RM",
      address: "0xab8000030e0f1f0000741672d154b5a846620001",
      warnThresh: "0.5",
      critThresh: "0.7",
    },
  ];

  const activeExposure = jest.fn();
  const exposureLimit = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("returns empty findings when exposure is below thresholds", async () => {
    const contractGetter = () => ({
      activeExposure: activeExposure.mockImplementation(() =>
        ethers.BigNumber.from("10").mul(USDC_UNIT)
      ),
      exposureLimit: exposureLimit.mockImplementation(() =>
        ethers.BigNumber.from("100").mul(USDC_UNIT)
      ),
    });

    const handleBlock = createHandleBlock(
      () => {},
      premiumsAccounts,
      contractGetter
    );

    const blockEvent = createBlockEvent({ block: block });

    const findings = await handleBlock(blockEvent);

    expect(findings).toStrictEqual([]);
    expect(activeExposure).toHaveBeenCalledWith({
      blockTag: blockEvent.blockNumber,
    });
    expect(exposureLimit).toHaveBeenCalledWith({
      blockTag: blockEvent.blockNumber,
    });
  });

  it("returns high severity finding when exposure is above warn threshold", async () => {
    const contractGetter = () => ({
      activeExposure: activeExposure.mockImplementation(() =>
        ethers.BigNumber.from("55").mul(USDC_UNIT)
      ),
      exposureLimit: exposureLimit.mockImplementation(() =>
        ethers.BigNumber.from("100").mul(USDC_UNIT)
      ),
    });

    const handleBlock = createHandleBlock(
      () => {},
      premiumsAccounts,
      contractGetter
    );

    const blockEvent = createBlockEvent({ block: block });

    const findings = await handleBlock(blockEvent);

    expect(findings).toStrictEqual([
      createFinding(
        "warnExposure",
        "High Exposure",
        FindingSeverity.High,
        premiumsAccounts[0],
        "warnThresh",
        Big("0.55")
      ),
    ]);
  });

  it("returns critical severity finding when exposure is above crit threshold", async () => {
    const contractGetter = () => ({
      activeExposure: activeExposure.mockImplementation(() =>
        ethers.BigNumber.from("81").mul(USDC_UNIT)
      ),
      exposureLimit: exposureLimit.mockImplementation(() =>
        ethers.BigNumber.from("100").mul(USDC_UNIT)
      ),
    });

    const handleBlock = createHandleBlock(
      () => {},
      premiumsAccounts,
      contractGetter
    );

    const blockEvent = createBlockEvent({ block: block });

    const findings = await handleBlock(blockEvent);

    expect(findings).toStrictEqual([
      createFinding(
        "critExposure",
        "Critically high Exposure",
        FindingSeverity.Critical,
        premiumsAccounts[0],
        "critThresh",
        Big("0.81")
      ),
    ]);
  });
});
