const { FindingType, FindingSeverity, Finding, createBlockEvent } = require("forta-agent");

const { createHandleBlock } = require("./agent");

const block = {
  hash: `0x${"0".repeat(64)}`,
  timestamp: Date.now() / 1000,
  number: 10,
};

describe("Agent entrypoint", () => {
  it("Must run configured handlers", async () => {
    const handler1 = jest.fn(() => [
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

    const handler2 = jest.fn(() => []);

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
    const handler1 = jest.fn(() => []);

    const handleBlock = createHandleBlock(
      () => ({ handler1 }),
      () => ({ enabled: ["handler1", "handler2"] })
    );

    const blockEvent = createBlockEvent({ block: block });

    await expect(async () => handleBlock(blockEvent)).rejects.toThrow(new Error("Unknown handler handler2"));
  });

  it("does not return findings within the minimum interval", async () => {
    const handler1 = jest.fn(() => [
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

  it("handles failures in a single handler gracefully", async () => {
    const handler1 = async () => [
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
    ];

    const handler2 = async () => {
      throw new Error("This handler2 has failed :-(");
    };

    const handler3 = async () => [
      {
        id: "finding3",
        finding: Finding.fromObject({
          alertId: "handler3",
          name: "handler3 alert",
          severity: FindingSeverity.Critical,
          description: `A critical severity alert`,
          protocol: "test",
          type: FindingType.Info,
        }),
      },
    ];

    const handleBlock = createHandleBlock(
      () => ({ handler1, handler2, handler3 }),
      () => ({ enabled: ["handler1", "handler2", "handler3"], retryDelayMs: 1 })
    );

    let blockEvent = createBlockEvent({ block: block });
    const findings = await handleBlock(blockEvent);
    expect(findings.length).toEqual(2);
  });

  it("accepts an object with handler name for enabled", async () => {
    const handler1 = jest.fn(() => []);
    const handler2 = jest.fn(() => []);
    const handleBlock = createHandleBlock(
      () => ({ handler1, handler2 }),
      () => ({ enabled: [{ name: "handler1" }, "handler2"] })
    );
    let blockEvent = createBlockEvent({ block: block });
    const findings = await handleBlock(blockEvent);
    expect(findings).toStrictEqual([]);
    expect(handler1).toHaveBeenCalledWith(blockEvent);
    expect(handler2).toHaveBeenCalledWith(blockEvent);
  });

  it("runs handlers every X blocks as configured", async () => {
    const handler1 = jest.fn(() => [
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
      () => ({ enabled: [{ name: "handler1", runEvery: 2 }] })
    );

    // Block 2 returns findings
    let findings = await handleBlock(createBlockEvent({ block: { ...block, number: 2 } }));
    expect(findings.length).toEqual(1);
    expect(handler1).toBeCalledTimes(1);

    // Block 3 doesnt
    findings = await handleBlock(createBlockEvent({ block: { ...block, number: 3 } }));
    expect(findings.length).toEqual(0);
    expect(handler1).toBeCalledTimes(1);

    // Block 4 does
    findings = await handleBlock(createBlockEvent({ block: { ...block, number: 4 } }));
    expect(findings.length).toEqual(1);
    expect(handler1).toBeCalledTimes(2);
  });

  it("retries failed handlers", async () => {
    const handler1 = async () => [
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
    ];

    let handler2CallCount = 0;
    const handler2 = async () => {
      if (handler2CallCount < 2) {
        handler2CallCount++;
        throw new Error("This handler2 has failed :-(");
      }

      return [
        {
          id: "finding2",
          finding: Finding.fromObject({
            alertId: "handler2",
            name: "handler2 alert",
            severity: FindingSeverity.High,
            description: `A high severity alert`,
            protocol: "test",
            type: FindingType.Info,
          }),
        },
      ];
    };

    const handleBlock = createHandleBlock(
      () => ({ handler1, handler2 }),
      () => ({ enabled: ["handler1", "handler2"], retryDelayMs: 1 })
    );

    let blockEvent = createBlockEvent({ block: block });
    const findings = await handleBlock(blockEvent);
    expect(findings.length).toEqual(2);
  });
});
