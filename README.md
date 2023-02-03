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

Describe each of the type of alerts fired by this agent

- critBalance
  - Fired when the balance is below `critThreshold`
  - Severity is always set to "crit"
  - Type is always set to "info"
- warnBalance
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
