const { gasBalance } = require("./handlers/gasBalance");
const { tokenBalance } = require("./handlers/tokenBalance");
const { dummy } = require("./handlers/dummy");

const config = require("./config.json");

const handlers = {
  gasBalance,
  tokenBalance,
  dummy,
};

async function handleBlock(blockEvent) {
  const results = [];

  for (const handlerName of config.enabled) {
    const handler = handlers[handlerName];
    if (handler === undefined) {
      throw new Error(`Unknown handler ${handlerName}`);
    }

    results.push(handler(blockEvent));
  }

  const findings = (await Promise.all(results)).flat();
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

module.exports = {
  handleBlock,
};
