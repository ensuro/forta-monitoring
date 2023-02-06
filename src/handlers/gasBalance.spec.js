const { FindingSeverity, createBlockEvent, ethers } = require("forta-agent");

const { createHandleBlock, createFinding } = require("./gasBalance");
const config = require("../config.json");

const USDC_UNIT = ethers.BigNumber.from(10).pow(
  config.erc20Tokens.USDC.decimals
);
const WAD_UNIT = ethers.BigNumber.from(10).pow(18);

const block = {
  hash: `0x${"0".repeat(64)}`,
  timestamp: Date.now() / 1000,
};

function mockProvider(accounts) {
  const accountBalances = accounts.reduce(
    (balances, account) => ({
      ...balances,
      [account.address]: ethers.utils.parseEther(account.balance),
    }),
    {}
  );

  const provider = { getBalance: jest.fn() };
  provider.getBalance.mockImplementation(
    (address, blockNumber) => accountBalances[address]
  );
  return provider;
}

describe("Balance monitoring agent", () => {
  it("returns empty findings when balance is above thresholds", async () => {
    const accounts = [
      {
        name: "Test account",
        address: "0xab8000030e0f1f0000741672d154b5a846620001",
        warnThresh: "10.0",
        critThresh: "5.0",
        balance: "15.0",
      },
    ];
    const provider = mockProvider(accounts);
    const handleBlock = createHandleBlock(() => provider, accounts);

    const blockEvent = createBlockEvent({ block: block });

    const findings = await handleBlock(blockEvent);

    expect(findings).toStrictEqual([]);
    expect(provider.getBalance).toHaveBeenCalledWith(
      "0xab8000030e0f1f0000741672d154b5a846620001",
      blockEvent.blockNumber
    );
  });

  it("returns high severity finding when balance is below warn threshold", async () => {
    const accounts = [
      {
        name: "Test account",
        address: "0xab8000030e0f1f0000741672d154b5a846620001",
        warnThresh: "20.0",
        critThresh: "5.0",
        balance: "15.0",
      },
    ];
    const provider = mockProvider(accounts);
    const handleBlock = createHandleBlock(() => provider, accounts);

    const blockEvent = createBlockEvent({ block: block });

    const findings = await handleBlock(blockEvent);

    expect(findings).toStrictEqual([
      createFinding(
        "warnBalance",
        "Low balance",
        FindingSeverity.High,
        accounts[0],
        "warnThresh",
        ethers.BigNumber.from("15").mul(WAD_UNIT)
      ),
    ]);
  });

  it("returns critical severity finding when balance is below crit threshold", async () => {
    const accounts = [
      {
        name: "Test account",
        address: "0xab8000030e0f1f0000741672d154b5a846620001",
        warnThresh: "90.0",
        critThresh: "10.0",
        balance: "9.0",
      },
    ];
    const provider = mockProvider(accounts);
    const handleBlock = createHandleBlock(() => provider, accounts);

    const blockEvent = createBlockEvent({ block: block });

    const findings = await handleBlock(blockEvent);

    expect(findings).toStrictEqual([
      createFinding(
        "critBalance",
        "Critically low balance",
        FindingSeverity.Critical,
        accounts[0],
        "critThresh",
        ethers.BigNumber.from("9").mul(WAD_UNIT)
      ),
    ]);
  });

  it("returns findings for multiple accounts", async () => {
    const accounts = [
      {
        name: "Test account 1",
        address: "0x111100030e0f1f0000741672d154b5a846621111",
        warnThresh: "90.0",
        critThresh: "10.0",
        balance: "9.0",
      },
      {
        name: "Test account 2",
        address: "0x222200030e0f1f0000000072d154b5a846622222",
        warnThresh: "20.0",
        critThresh: "5.0",
        balance: "15.0",
      },
    ];
    const provider = mockProvider(accounts);
    const handleBlock = createHandleBlock(() => provider, accounts);

    const blockEvent = createBlockEvent({ block: block });

    const findings = await handleBlock(blockEvent);

    expect(findings).toStrictEqual([
      createFinding(
        "critBalance",
        "Critically low balance",
        FindingSeverity.Critical,
        accounts[0],
        "critThresh",
        ethers.BigNumber.from("9").mul(WAD_UNIT)
      ),
      createFinding(
        "warnBalance",
        "Low balance",
        FindingSeverity.High,
        accounts[1],
        "warnThresh",
        ethers.BigNumber.from("15").mul(WAD_UNIT)
      ),
    ]);
  });

  it("matic balance monitoring is unaffected by erc20 balances", async () => {
    const balanceOf = jest.fn();
    const contractGetter = () => ({
      balanceOf: balanceOf.mockImplementation(() =>
        ethers.BigNumber.from("8").mul(USDC_UNIT)
      ),
    });

    const accounts = [
      {
        name: "Test account",
        address: "0xab8000030e0f1f0000741672d154b5a846620001",
        warnThresh: "10.0",
        critThresh: "5.0",
        balance: "15.0",
      },
    ];
    const provider = mockProvider(accounts);
    const handleBlock = createHandleBlock(
      () => provider,
      accounts,
      contractGetter
    );

    const blockEvent = createBlockEvent({ block: block });

    const findings = await handleBlock(blockEvent);

    expect(findings).toStrictEqual([]);
    expect(provider.getBalance).toHaveBeenCalledWith(
      "0xab8000030e0f1f0000741672d154b5a846620001",
      blockEvent.blockNumber
    );
  });
});
