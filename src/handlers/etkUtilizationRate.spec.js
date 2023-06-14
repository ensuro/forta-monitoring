const { FindingSeverity, createBlockEvent, ethers } = require("forta-agent");
const Big = require("big.js");

const { createHandleBlock, createFinding } = require("./etkUtilizationRate");
const config = require("../config.json");

const USDC_UNIT = ethers.BigNumber.from(10).pow(
  config.erc20Tokens.USDC.decimals
);

const block = {
  hash: `0x${"0".repeat(64)}`,
  timestamp: Date.now() / 1000,
};

describe("ETK Utilization rate monitoring", () => {
  const etks = [
    {
      name: "Test ETK",
      address: "0xab8000030e0f1f0000741672d154b5a846620001",
      warnThresh: "0.9",
      critThresh: "0.95",
    },
  ];

  const totalSupply = jest.fn();
  const scr = jest.fn();
  const maxUtilizationRate = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("returns empty findings when utilization rate is below thresholds", async () => {
    const contractGetter = () => ({
      totalSupply: totalSupply.mockImplementation(() =>
        ethers.BigNumber.from("1000").mul(USDC_UNIT)
      ),
      scr: scr.mockImplementation(() =>
        ethers.BigNumber.from("100").mul(USDC_UNIT)
      ),
      maxUtilizationRate: maxUtilizationRate.mockImplementation(() =>
        ethers.utils.parseEther("0.5")
      ),
    });

    const handleBlock = createHandleBlock(() => {}, etks, contractGetter);

    const blockEvent = createBlockEvent({ block: block });

    const findings = await handleBlock(blockEvent);

    expect(findings).toStrictEqual([]);
    expect(totalSupply).toHaveBeenCalledWith({
      blockTag: blockEvent.blockNumber,
    });
    expect(scr).toHaveBeenCalledWith({
      blockTag: blockEvent.blockNumber,
    });
    expect(maxUtilizationRate).toHaveBeenCalledWith({
      blockTag: blockEvent.blockNumber,
    });
  });

  it("returns high severity finding when utilizationRate is above warn threshold", async () => {
    const contractGetter = () => ({
      totalSupply: totalSupply.mockImplementation(() =>
        ethers.BigNumber.from("1000").mul(USDC_UNIT)
      ),
      scr: scr.mockImplementation(() =>
        ethers.BigNumber.from("455").mul(USDC_UNIT)
      ),
      maxUtilizationRate: maxUtilizationRate.mockImplementation(() =>
        ethers.utils.parseEther("0.5")
      ),
    });

    const handleBlock = createHandleBlock(() => {}, etks, contractGetter);

    const blockEvent = createBlockEvent({ block: block });

    const findings = await handleBlock(blockEvent);

    expect(findings).toStrictEqual([
      createFinding(
        "warnUtilizationRate",
        "High utilization rate",
        FindingSeverity.High,
        etks[0],
        "warnThresh",
        Big("0.455"),
        Big("0.5")
      ),
    ]);
  });

  it("returns critical severity finding when utilizationRate is above crit threshold", async () => {
    const contractGetter = () => ({
      totalSupply: totalSupply.mockImplementation(() =>
        ethers.BigNumber.from("1000").mul(USDC_UNIT)
      ),
      scr: scr.mockImplementation(() =>
        ethers.BigNumber.from("480").mul(USDC_UNIT)
      ),
      maxUtilizationRate: maxUtilizationRate.mockImplementation(() =>
        ethers.utils.parseEther("0.5")
      ),
    });

    const handleBlock = createHandleBlock(() => {}, etks, contractGetter);

    const blockEvent = createBlockEvent({ block: block });

    const findings = await handleBlock(blockEvent);

    expect(findings).toStrictEqual([
      createFinding(
        "critUtilizationRate",
        "Critically high utilization rate",
        FindingSeverity.Critical,
        etks[0],
        "critThresh",
        Big("0.48"),
        Big("0.5")
      ),
    ]);
  });
});
