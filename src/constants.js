const ERC20_TOKENS = {
  USDC: {
    address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    decimals: 6,
  },
};

const ERC20_ABI = `[ { "constant": true, "inputs": [ { "name": "_owner", "type": "address" } ], "name": "balanceOf", "outputs": [ { "name": "balance", "type": "uint256" } ], "payable": false, "type": "function" } ]`;

const WAD_DECIMALS = 18;

const MIN_INTERVAL_SECONDS = 2 * 60 * 60; // 2 hours

module.exports = {
  ERC20_ABI,
  ERC20_TOKENS,
  MIN_INTERVAL_SECONDS,
  WAD_DECIMALS,
};
