# Ensuro accounts balance monitoring

## Description

This agent monitors balance for Ensuro's operational accounts.

See `agent.js:accounts` for details on the accounts and thresholds monitored.

## Supported Chains

- Polygon

## Alerts

Describe each of the type of alerts fired by this agent

- critBalance
  - Fired when the balance is below `critThreshold`
  - Severity is always set to "crit"
  - Type is always set to "info"
- warnBalance
  - Fired when the balance is below `warnThreshold`
  - Severity is always set to "high"
  - Type is always set to "info"

## Test Data

The agent behaviour can be verified with the following blocks:

- 31813266 (0,0015 MATIC)
- 23419096 (5,0328 MATIC)
- 28923764 (37+ MATIC)