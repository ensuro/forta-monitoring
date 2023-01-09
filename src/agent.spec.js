const {
  FindingType,
  FindingSeverity,
  Finding,
  createBlockEvent,
  ethers,
} = require("forta-agent");
const { createHandleBlock, createFinding } = require("./agent");
const { MIN_INTERVAL_SECONDS } = require("./constants");

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
        "warnThresh"
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
        "critThresh"
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
        "critThresh"
      ),
      createFinding(
        "warnBalance",
        "Low balance",
        FindingSeverity.High,
        accounts[1],
        "warnThresh"
      ),
    ]);
  });

  it("does not return findings within the minimum interval", async () => {
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

    let blockEvent = createBlockEvent({ block: block });

    // First call returns the findings
    const findings = await handleBlock(blockEvent);
    expect(findings.length).toEqual(1);

    // Second call doesn't return any findings because minInterval has not elapsed
    expect(await handleBlock(blockEvent)).toStrictEqual([]);

    // Moving time forward makes it return the findings again
    blockEvent = createBlockEvent({
      block: {
        ...block,
        timestamp: blockEvent.block.timestamp + MIN_INTERVAL_SECONDS,
      },
    });
    expect(await handleBlock(blockEvent)).toStrictEqual([
      createFinding(
        "critBalance",
        "Critically low balance",
        FindingSeverity.Critical,
        accounts[0],
        "critThresh"
      ),
    ]);
    expect(await handleBlock(blockEvent)).toStrictEqual([]);
  });
});

describe("ERC20 balance monitoring", () => {
  it.skip("returns empty findings when balance is above thresholds", async () => {
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
});
