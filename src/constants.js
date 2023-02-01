const ERC20_ABI = `[ { "constant": true, "inputs": [ { "name": "_owner", "type": "address" } ], "name": "balanceOf", "outputs": [ { "name": "balance", "type": "uint256" } ], "payable": false, "type": "function" } ]`;

const WAD_DECIMALS = 18;

module.exports = {
  ERC20_ABI,
  WAD_DECIMALS,
};
