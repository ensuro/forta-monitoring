const USDC_ADDRESS = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
const USDC_DECIMALS = 6;
const ERC20_TRANSFER_EVENT =
  "event Transfer(address indexed from, address indexed to, uint value)";
const ERC20_TRANSFER_FROM_FUNCTION =
  "function transferFrom(address from, address to, uint value)";

const MIN_INTERVAL_SECONDS = 2 * 60 * 60; // 2 hours

module.exports = {
  ERC20_TRANSFER_EVENT,
  ERC20_TRANSFER_FROM_FUNCTION,
  MIN_INTERVAL_SECONDS,
  USDC_ADDRESS,
  USDC_DECIMALS,
};
