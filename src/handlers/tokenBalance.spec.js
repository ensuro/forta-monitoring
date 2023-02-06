const { FindingSeverity, createBlockEvent, ethers } = require("forta-agent");
const fortaAgent = require("forta-agent");

const { createHandleBlock, createFinding } = require("./tokenBalance");
const config = require("../config.json");

const USDC_UNIT = ethers.BigNumber.from(10).pow(
  config.erc20Tokens.USDC.decimals
);
const WAD_UNIT = ethers.BigNumber.from(10).pow(18);

const block = {
  hash: `0x${"0".repeat(64)}`,
  timestamp: Date.now() / 1000,
};

describe("ERC20 balance monitoring", () => {
  const accounts = [
    {
      name: "Test account",
      address: "0xab8000030e0f1f0000741672d154b5a846620001",
      warnThresh: "10.0",
      critThresh: "5.0",
      token: "USDC",
    },
  ];

  const balanceOf = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("returns empty findings when balance is above thresholds", async () => {
    const contractGetter = () => ({
      balanceOf: balanceOf.mockImplementation(() =>
        ethers.BigNumber.from("15").mul(USDC_UNIT)
      ),
    });

    const handleBlock = createHandleBlock(() => {}, accounts, contractGetter);

    const blockEvent = createBlockEvent({ block: block });

    const findings = await handleBlock(blockEvent);

    expect(findings).toStrictEqual([]);
    expect(balanceOf).toHaveBeenCalledWith(
      "0xab8000030e0f1f0000741672d154b5a846620001",
      {
        blockTag: blockEvent.blockNumber,
      }
    );
  });

  it("returns high severity finding when balance is below warn threshold", async () => {
    const contractGetter = () => ({
      balanceOf: balanceOf.mockImplementation(() =>
        ethers.BigNumber.from("8").mul(USDC_UNIT)
      ),
    });

    const handleBlock = createHandleBlock(() => {}, accounts, contractGetter);

    const blockEvent = createBlockEvent({ block: block });

    const findings = await handleBlock(blockEvent);

    expect(findings).toStrictEqual([
      createFinding(
        "warnBalance",
        "Low token balance",
        FindingSeverity.High,
        accounts[0],
        "warnThresh",
        ethers.BigNumber.from("8").mul(WAD_UNIT)
      ),
    ]);
  });

  it("returns critical severity finding when balance is below crit threshold", async () => {
    const contractGetter = () => ({
      balanceOf: balanceOf.mockImplementation(() =>
        ethers.BigNumber.from("4").mul(USDC_UNIT)
      ),
    });

    const handleBlock = createHandleBlock(() => {}, accounts, contractGetter);

    const blockEvent = createBlockEvent({ block: block });

    const findings = await handleBlock(blockEvent);

    expect(findings).toStrictEqual([
      createFinding(
        "critBalance",
        "Critically low token balance",
        FindingSeverity.Critical,
        accounts[0],
        "critThresh",
        ethers.BigNumber.from("4").mul(WAD_UNIT)
      ),
    ]);
  });
});
