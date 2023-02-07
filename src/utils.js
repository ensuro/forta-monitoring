const { ethers } = require("forta-agent");
const Big = require("big.js");

const { WAD_DECIMALS } = require("./constants");

function toBigDecimal(bigNumberValue, decimals) {
  return Big(ethers.utils.formatUnits(bigNumberValue, decimals));
}

/**
 *
 * @param {*} amount Amount to convert to decimal
 * @param {*} token Object with {decimals} prop
 * @returns A big.js decimal representation of amount
 */
function amountToBigDecimal(amount, token) {
  return toBigDecimal(amount, token.decimals);
}

/**
 *
 * @param {*} value Value to convert to decimal
 * @returns A big.js decimal representation of value
 */
function wadToBigDecimal(value) {
  return toBigDecimal(value, WAD_DECIMALS);
}

module.exports = { toBigDecimal, amountToBigDecimal, wadToBigDecimal };
