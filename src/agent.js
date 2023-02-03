const { gasBalance } = require("./handlers/gasBalance");
const { tokenBalance } = require("./handlers/tokenBalance");
const { dummy } = require("./handlers/dummy");

const config = require("./config.json");

const handlers = {
  gasBalance,
  tokenBalance,
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

    const findings = (await Promise.all(results)).flat();

    const filteredFindings = findings.filter((finding) => {
      const lastFinding = findingTimestamps[finding.id] || 0;

      if (timestamp - lastFinding < config.minIntervalSeconds) {
        console.log(
          `Skipping finding ${finding.id} because last instance was very recent`
        );
        return false;
      }

      findingTimestamps[finding.id] = timestamp;
      return true;
    });

    if (filteredFindings.length > 0) {
      console.log(
        "Got %s findings on block %s: %s",
        filteredFindings.length,
        blockEvent.blockNumber,
        filteredFindings.map((finding) => finding.finding.description)
      );
    }
    return filteredFindings.map((finding) => finding.finding);
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
