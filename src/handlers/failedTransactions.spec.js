const { FindingSeverity, FindingType, Finding, createTransactionEvent } = require("forta-agent");

const { createHandleTransaction } = require("./failedTransactions");

describe("Failed transaction monitoring", () => {
  it("Returns empty finding for non-matching transactions", async () => {
    const accounts = [
      {
        name: "Test account",
        address: "0xab8000030e0f1f0000741672d154b5a846620001",
      },
    ];

    const handleTransaction = createHandleTransaction(() => {}, { accounts });
    const txEvent = createTransactionEvent({ transaction: { from: "0x111100030e0f1f0000741672d154b5a846621111" } });

    const findings = await handleTransaction(txEvent);
    expect(findings).toStrictEqual([]);
  });

  it("Returns empty finding for non-failed transactions", async () => {
    const accounts = [
      {
        name: "Test account",
        address: "0xab8000030e0f1f0000741672d154b5a846620001",
      },
    ];

    const handleTransaction = createHandleTransaction(() => ({ status: 1 }), { accounts });
    const txEvent = createTransactionEvent({ transaction: { from: "0xab8000030e0f1f0000741672d154b5a846620001" } });

    const findings = await handleTransaction(txEvent);
    expect(findings).toStrictEqual([]);
  });

  it("Returns finding for matching failed transactions", async () => {
    const accounts = [
      {
        name: "Test account",
        // Config address is checksummed
        address: "0xab8000030e0F1F0000741672D154B5A846620001",
      },
    ];

    const handleTransaction = createHandleTransaction(() => ({ status: 0 }), { accounts });
    // Event address isn't
    const txEvent = createTransactionEvent({ transaction: { from: "0xab8000030e0f1f0000741672d154b5a846620001" } });

    const findings = await handleTransaction(txEvent);
    // Got a match
    expect(findings).toStrictEqual([
      {
        id: "failedTransactions-0xab8000030e0F1F0000741672D154B5A846620001",
        finding: Finding.fromObject({
          alertId: "failedTransactions",
          name: "Failed transaction from monitored account",
          severity: FindingSeverity.High,
          description: `Transaction ${txEvent.hash} from monitored account Test account(0xab8000030e0F1F0000741672D154B5A846620001) failed.`,
          protocol: "ensuro",
          type: FindingType.Info,
          addresses: ["0xab8000030e0F1F0000741672D154B5A846620001"],
        }),
      },
    ]);
  });
});
