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

- 31813266 (0.0015 MATIC)
- 23419096 (5.0328 MATIC)
- 28923764 (37+ MATIC)
- 37740490 (0.3 USDC)
- 37720980 (4000 USDC)

You can test against this blocks with `npm run block $BLOCK_NUMBER`.

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
- 36901700 (53% exposure on Koala V2 (0xa65c9dE776d1f30c095EFF9C775E001a1d366df8))
- 38878342 (no alerts, 32% exposure on Koala V2 and 4% exposure on Koala Partner B)

You can test against this blocks with `npm run block $BLOCK_NUMBER`.
