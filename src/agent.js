const { gasBalance } = require("./handlers/gasBalance");
const { tokenBalance } = require("./handlers/tokenBalance");
const { paDeficit } = require("./handlers/paDeficit");
const { exposure } = require("./handlers/exposure");
const { dummy } = require("./handlers/dummy");

const config = require("./config.json");

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

    for (const handlerName of config.enabled) {
      const handler = handlers[handlerName];
      if (handler === undefined) {
        throw new Error(`Unknown handler ${handlerName}`);
      }

      results.push(handler(blockEvent));
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

const handleBlock = createHandleBlock(
  () => handlers,
  () => config
);

module.exports = {
  handleBlock,
  createHandleBlock,
  handlers,
};
