# Ensuro multi-bot

This bot provides multiple checks and alerts for the Ensuro protocol.

https://github.com/ensuro/forta-monitoring

To add a new bot:

- Create a new module that exports a handler function. The function will receive a blockEvent and must return a promise that resolves to an array of `{id, finding}` objects.
- Import it into `agent.js` and add it to the `handlers` array.
- Add it in `config.json` in the `enabled` array.
- Test it and add the documentation below ;-)

## Supported Chains

- Polygon

## Regenerating config from offchain data

For handlers that operate on protocol contracts, the config can be refreshed by fetching the contracts list from offchain:

```sh
node scripts/configGenerate.js > newConfig.json
```

Review the new config and move the `newConfig.json` file into `src/config.json`.

## Running in debug mode

Most handlers run every X blocks to avoid overloading the node with queries.

When testing a new config or a code change, it is desirable to have handlers run on every block, otherwise you'd have to wait for X blocks before confirming that the change works as expected.

You can get all handlers to run on all blocks by exporting the `DEBUG_MODE=true` env var:

```sh
DEBUG_MODE=true npm start
```

# Bot details

## Gas and erc20 balance monitoring

### Description

These are two handlers to monitor MATIC and USDC (or other ERC20) balances.

See `config.handlers.gasBalance.accounts` and `config.handlers.tokenBalance.accounts` for details on the accounts and thresholds monitored.

### Alerts

- `gasBalance.critBalance` and `tokenBalance.critBalance`
  - Fired when the balance is below `critThreshold`
  - Severity is always set to "crit"
  - Type is always set to "info"
- `gasBalance.warnBalance` and `tokenBalance.warnBalance`
  - Fired when the balance is below `warnThreshold`
  - Severity is always set to "high"
  - Type is always set to "info"

### Test Data

The agent behaviour can be verified with the following blocks:

- 31813250 (0 MATIC)
- 23419250 (5.0328 MATIC)
- 37740750 (37+ MATIC)
- 37740600 (0.3 USDC)
- 37721100 (4000 USDC)

You can test against this blocks with `DEBUG_MODE=true npm run block $BLOCK_NUMBER`.

## Premiums account deficit

### Description

Monitors the deficit vs active pure premiums ratio and alerts when a certain threshold is exceeded.

### Alerts

- `paDeficit.critDeficit`
  - Fired when the deficit/activePP ratio is above `critThreshold`
  - Severity is always set to "crit"
  - Type is always set to "info"
- `paDeficit.warnDeficit`
  - Fired when the deficit/activePP ratio is above `warnThreshold`

### Test Data

There's no actual blocks where this has happened, the best way to test the bot in development is to modifty the thresholds and run against the current block.

Also `npm test`.

## Active exposure monitoring

### Description

Alerts when a riskmodule's activeExposure/exposurLimit ratio exceeds a certain threshold.

### Alerts

Describe each of the type of alerts fired by this agent

- `exposure.critExposure`
  - Fired when the exposure ratio is above `critThreshold`
  - Severity is always set to "crit"
  - Type is always set to "info"
- `exposure.warnExposure`
  - Fired when the exposure ratio is above `warnThreshold`
  - Severity is always set to "high"
  - Type is always set to "info"

### Test Data

The agent behaviour can be verified with the following blocks:

- 37901700 (99% exposure on Koala V2 (0xa65c9dE776d1f30c095EFF9C775E001a1d366df8))
- 36901650 (53% exposure on Koala V2 (0xa65c9dE776d1f30c095EFF9C775E001a1d366df8))
- 38878342 (no alerts, 32% exposure on Koala V2 and 4% exposure on Koala Partner B)

You can test against this blocks with `DEBUG_MODE=true npm run block $BLOCK_NUMBER`.

## EToken utilization rate monitoring

### Description

Alerts when an EToken's utilization rate is above a certain threshold over the max UR.

For example:

- Total supply: $1000
- Current scr: $175
- Max utilization rate: 70% -> $700

Then the current utilization rate is at 25% of the max utilization rate.

### Alerts

Describe each of the type of alerts fired by this agent

- `etkUtilizationRate.critUtilizationRate`
  - Fired when the current UR ratio is above `critThreshold` of max UR
  - Severity is always set to "crit"
  - Type is always set to "info"
- `etkUtilizationRate.warnUtilizationRate`
  - Fired when the current UR ratio is above `warnThreshold` of max UR
  - Severity is always set to "high"
  - Type is always set to "info"

### Test Data

The agent behaviour can be verified with the following blocks:

- 43884039 (99% UR on Koala Jr (BMA reg.) (0xBC33c283A37d46ABA17BC5F8C27b27242688DeC6))

You can test against this blocks with `DEBUG_MODE=true npm run block $BLOCK_NUMBER`.

## Failed transaction monitoring

### Description

Alerts when a failed transaction from a given address is seen.

### Alerts

- `failedTransactions`
  - Fired when a matching transaction is found
  - Severity is always set to "high"
  - Type is always set to info

### Test data

The agent behaviout can be verified with the following blocks:

- 45229979 (Failed transaction for Innovation Zone Relay(0x257D6896F0053648F9bB9310ef3b046fc2079994))
