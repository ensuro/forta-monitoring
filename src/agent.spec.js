const {
  FindingType,
  FindingSeverity,
  Finding,
  createBlockEvent,
  ethers,
} = require("forta-agent");

const { createHandleBlock, handleBlock } = require("./agent");

const block = {
  hash: `0x${"0".repeat(64)}`,
  timestamp: Date.now() / 1000,
};

describe("Agent entrypoint", () => {
  it("Must run configured handlers", async () => {
    const handler1 = jest.fn((b) => [
      {
        id: "finding1",
        finding: Finding.fromObject({
          alertId: "handler1",
          name: "handler1 alert",
          severity: FindingSeverity.High,
          description: `A high severity alert`,
          protocol: "test",
          type: FindingType.Info,
        }),
      },
    ]);

    const handler2 = jest.fn((b) => []);

    const handleBlock = createHandleBlock(
      () => ({ handler1, handler2 }),
      () => ({ enabled: ["handler1", "handler2"] })
    );

    const blockEvent = createBlockEvent({ block: block });

    const findings = await handleBlock(blockEvent);

    expect(findings).toStrictEqual([
      Finding.fromObject({
        alertId: "handler1",
        name: "handler1 alert",
        severity: FindingSeverity.High,
        description: `A high severity alert`,
        protocol: "test",
        type: FindingType.Info,
      }),
    ]);

    expect(handler1).toHaveBeenCalledWith(blockEvent);
    expect(handler1.mock.calls.length).toEqual(1);

    expect(handler2).toHaveBeenCalledWith(blockEvent);
    expect(handler2.mock.calls.length).toEqual(1);
  });

  it("throws for unknown handlers", async () => {
    const handler1 = jest.fn((b) => []);

    const handleBlock = createHandleBlock(
      () => ({ handler1 }),
      () => ({ enabled: ["handler1", "handler2"] })
    );

    const blockEvent = createBlockEvent({ block: block });

    await expect(async () => handleBlock(blockEvent)).rejects.toThrow(
      new Error("Unknown handler handler2")
    );
  });

  it("does not return findings within the minimum interval", async () => {
    const handler1 = jest.fn((b) => [
      {
        id: "finding1",
        finding: Finding.fromObject({
          alertId: "handler1",
          name: "handler1 alert",
          severity: FindingSeverity.High,
          description: `A high severity alert`,
          protocol: "test",
          type: FindingType.Info,
        }),
      },
    ]);

    const handleBlock = createHandleBlock(
      () => ({ handler1 }),
      () => ({ enabled: ["handler1"], minIntervalSeconds: 20 })
    );

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
        timestamp: blockEvent.block.timestamp + 60,
      },
    });
    expect(await handleBlock(blockEvent)).toStrictEqual([
      Finding.fromObject({
        alertId: "handler1",
        name: "handler1 alert",
        severity: FindingSeverity.High,
        description: `A high severity alert`,
        protocol: "test",
        type: FindingType.Info,
      }),
    ]);
    expect(await handleBlock(blockEvent)).toStrictEqual([]);
  });
});
