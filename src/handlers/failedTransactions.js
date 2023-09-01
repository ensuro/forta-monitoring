const { getTransactionReceipt, Finding, FindingSeverity, FindingType } = require("forta-agent");
const config = require("../config.json").handlers.failedTransactions;

const FAILED_STATUS = 0;

function createHandleTransaction(getTransactionReceipt, config) {
  async function handleTransaction(txEvent) {
    const account = config.accounts.find((account) => account.address.toLowerCase() === txEvent.from.toLowerCase());
    if (account !== undefined) {
      const receipt = await getTransactionReceipt(txEvent.hash);
      if (receipt.status == FAILED_STATUS) {
        return [
          {
            id: `failedTransactions-${account.address}`,
            finding: Finding.fromObject({
              alertId: "failedTransactions",
              name: "Failed transaction from monitored account",
              severity: FindingSeverity.High,
              description: `Transaction ${txEvent.hash} from monitored account ${account.name}(${account.address}) failed.`,
              protocol: "ensuro",
              type: FindingType.Info,
              addresses: [account.address],
            }),
          },
        ];
      }
    }

    return [];
  }

  return handleTransaction;
}

const failedTransactions = createHandleTransaction(getTransactionReceipt, config);

module.exports = { failedTransactions, createHandleTransaction };
