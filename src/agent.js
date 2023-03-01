const { gasBalance } = require("./handlers/gasBalance");
const { tokenBalance } = require("./handlers/tokenBalance");
const { paDeficit } = require("./handlers/paDeficit");
const { exposure } = require("./handlers/exposure");
const { dummy } = require("./handlers/dummy");
const Rollbar = require("rollbar");
const RollbarLocals = require("rollbar/src/server/locals");

const config = require("./config.json");

const rollbar = new Rollbar({
  accessToken: config.rollbarAccessToken,
  captureUncaught: true,
  captureUnhandledRejections: true,
  locals: RollbarLocals,
});

const handlers = {
  gasBalance,
  tokenBalance,
  paDeficit,
  exposure,
  dummy,
};

function createHandleBlock(getHandlers, getConfig) {
  const handlers = getHandlers();
  const config = getConfig();

  const findingTimestamps = {};

  async function handleBlock(blockEvent) {
    const results = [];

    const timestamp = blockEvent.block.timestamp;

    for (const handlerConfig of config.enabled) {
      const handler =
        typeof handlerConfig === "string"
          ? handlers[handlerConfig]
          : handlers[handlerConfig.name];
      const handlerName =
        typeof handlerConfig === "string" ? handlerConfig : handlerConfig.name;
      const runEvery = handlerConfig.runEvery || 10;

      if (handler === undefined) {
        throw new Error(`Unknown handler ${handlerName}`);
      }

      if (blockEvent.blockNumber % runEvery === 0)
        results.push(
          retry(
            async () => handler(blockEvent),
            config.maxRetries || 3,
            config.retryDelayMs || 500
          )
        );
    }

    const findings = [];

    for (const result of results) {
      try {
        const handlerFindings = await result;
        for (const finding of handlerFindings) {
          const lastFinding = findingTimestamps[finding.id] || 0;

          if (timestamp - lastFinding < config.minIntervalSeconds) {
            console.log(
              `Skipping finding ${finding.id} because last instance was very recent`
            );
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
  () => handlers,
  () => config
);

module.exports = {
  handleBlock,
  createHandleBlock,
  handlers,
};
