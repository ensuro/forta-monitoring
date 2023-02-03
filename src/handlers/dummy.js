// Dummy handler that never returns any findings

async function dummy(blockEvent) {
  console.log("DUMMY: processing block %s", blockEvent.blockNumber);
  return [];
}

module.exports = { dummy };
