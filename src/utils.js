const { ethers } = require("forta-agent");
const Big = require("big.js");

function toBigDecimal(bigNumberValue, decimals = 18) {
  return Big(ethers.utils.formatUnits(bigNumberValue, decimals));
}

module.exports = { toBigDecimal };
