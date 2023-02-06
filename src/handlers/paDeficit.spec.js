const { FindingSeverity, createBlockEvent, ethers } = require("forta-agent");
const Big = require("big.js");

const { createHandleBlock, createFinding } = require("./paDeficit");
const config = require("../config.json");

const USDC_UNIT = ethers.BigNumber.from(10).pow(
  config.erc20Tokens.USDC.decimals
);

const block = {
  hash: `0x${"0".repeat(64)}`,
  timestamp: Date.now() / 1000,
};

describe("PA deficit monitoring", () => {
  const premiumsAccounts = [
    {
      name: "Test PA",
      address: "0xab8000030e0f1f0000741672d154b5a846620001",
      warnThresh: "0.3",
      critThresh: "0.5",
    },
  ];

  const surplus = jest.fn();
  const activePurePremiums = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("returns empty findings when deficit is below thresholds", async () => {
    const contractGetter = () => ({
      surplus: surplus.mockImplementation(() =>
        ethers.BigNumber.from("-10").mul(USDC_UNIT)
      ),
      activePurePremiums: activePurePremiums.mockImplementation(() =>
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
    expect(surplus).toHaveBeenCalledWith({
      blockTag: blockEvent.blockNumber,
    });
    expect(activePurePremiums).toHaveBeenCalledWith({
      blockTag: blockEvent.blockNumber,
    });
  });

  it("returns high severity finding when deficit is above warn threshold", async () => {
    const contractGetter = () => ({
      surplus: surplus.mockImplementation(() =>
        ethers.BigNumber.from("-40").mul(USDC_UNIT)
      ),
      activePurePremiums: activePurePremiums.mockImplementation(() =>
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
        "warnDeficit",
        "High deficit",
        FindingSeverity.High,
        premiumsAccounts[0],
        "warnThresh",
        Big("0.4")
      ),
    ]);
  });

  it("returns critical severity finding when deficit is above crit threshold", async () => {
    const contractGetter = () => ({
      surplus: surplus.mockImplementation(() =>
        ethers.BigNumber.from("-55").mul(USDC_UNIT)
      ),
      activePurePremiums: activePurePremiums.mockImplementation(() =>
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
        "critDeficit",
        "Critically high deficit",
        FindingSeverity.Critical,
        premiumsAccounts[0],
        "critThresh",
        Big("0.55")
      ),
    ]);
  });
});
