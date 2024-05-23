const { gasBalance } = require("./handlers/gasBalance");
const { tokenBalance } = require("./handlers/tokenBalance");
const { paDeficit } = require("./handlers/paDeficit");
const { exposure } = require("./handlers/exposure");
const { etkUtilizationRate } = require("./handlers/etkUtilizationRate");
const { dummy } = require("./handlers/dummy");
const { failedTransactions } = require("./handlers/failedTransactions");
const Rollbar = require("rollbar");
const RollbarLocals = require("rollbar/src/server/locals");

const config = require("./config.json");
const { paLoanLimits } = require("./handlers/paLoanLimits");

const DEBUG_MODE = process.env.DEBUG_MODE === "true";

const blockHandlers = {
  gasBalance,
  tokenBalance,
  paDeficit,
  exposure,
  etkUtilizationRate,
  dummy,
  paLoanLimits,
};

const transactionHandlers = { failedTransactions };

function createHandleBlock(getHandlers, getConfig) {
  const handlers = getHandlers();
  const config = getConfig();

  console.log("Running with block handlers: %s", JSON.stringify(config.enabled, null, 2));

  const rollbar = new Rollbar({
    accessToken: config.rollbarAccessToken || "notoken",
    enabled: config.rollbarEnabled || false,
    captureUncaught: true,
    captureUnhandledRejections: true,
    locals: RollbarLocals,
  });

  const findingTimestamps = {};

  async function handleBlock(blockEvent) {
    const results = [];

    const timestamp = blockEvent.block.timestamp;

    for (const handlerConfig of config.enabled) {
      const handler = typeof handlerConfig === "string" ? handlers[handlerConfig] : handlers[handlerConfig.name];
      const handlerName = typeof handlerConfig === "string" ? handlerConfig : handlerConfig.name;
      const runEvery = handlerConfig.runEvery || 10;

      if (handler === undefined) {
        throw new Error(`Unknown handler ${handlerName}`);
      }

      if (DEBUG_MODE || blockEvent.blockNumber % runEvery === 0)
        results.push(retry(async () => handler(blockEvent), config.maxRetries || 3, config.retryDelayMs || 500));
    }

    const findings = [];

    for (const result of results) {
      try {
        const handlerFindings = await result;
        for (const finding of handlerFindings) {
          const lastFinding = findingTimestamps[finding.id] || 0;

          if (timestamp - lastFinding < config.minIntervalSeconds) {
            console.log(`Skipping finding ${finding.id} because last instance was very recent`);
          } else {
            findings.push(finding.finding);
            findingTimestamps[finding.id] = timestamp;
          }
        }
      } catch (e) {
        rollbar.error(e);
        console.error(e);
      }
    }

    if (findings.length > 0) {
      console.log(
        "Got %s findings on block %s: %s",
        findings.length,
        blockEvent.blockNumber,
        findings.map((finding) => finding.description)
      );
    }
    return findings;
  }

  return handleBlock;
}

function createHandleTransaction(getHandlers, getConfig) {
  const handlers = getHandlers();
  const config = getConfig();

  console.log("Running with transaction handlers: %s", config.txEnabled);

  async function handleTransaction(txEvent) {
    const results = [];
    for (const handlerName of config.txEnabled) {
      const handler = handlers[handlerName];

      if (handler === undefined) {
        throw new Error(`Unknown handler ${handlerName}`);
      }

      results.push(retry(async () => handler(txEvent), config.maxRetries || 3, config.retryDelayMs || 500));
    }

    const findings = (await Promise.all(results)).flat().map((finding) => finding.finding);
    return findings;
  }

  return handleTransaction;
}

async function retry(callable, retries, retryDelayMs) {
  while (retries > 0) {
    retries--;
    try {
      return await callable();
    } catch (e) {
      if (retries == 0) throw e;
      await sleep(retryDelayMs);
    }
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const handleBlock = createHandleBlock(
  () => blockHandlers,
  () => config
);

const handleTransaction = createHandleTransaction(
  () => transactionHandlers,
  () => config
);

module.exports = {
  handleBlock,
  handleTransaction,
  createHandleBlock,
  createHandleTransaction,
  blockHandlers,
  transactionHandlers,
};
