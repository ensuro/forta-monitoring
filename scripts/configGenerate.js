//
const axios = require("axios");

const OFFCHAIN_API_URL = process.env.OFFCHAIN_API_URL || "https://offchain-v2.ensuro.co/api";

async function fetchFromAPI(endpoint) {
  const url = `${OFFCHAIN_API_URL}/${endpoint}/`;
  const response = await axios.get(url);
  if (response.status !== 200) {
    throw new Error(`Error fetching ${url}: ${response.statusText}`);
  }
  return response.data;
}

const deepCopy = (obj) => JSON.parse(JSON.stringify(obj));

async function generateNewConfig(currentConfig) {
  const config = deepCopy(currentConfig);

  config.handlers.paDeficit.premiumsAccounts = await regenerateFromAPI(
    "premiumsaccounts",
    config.handlers.paDeficit.premiumsAccounts,
    "0.3",
    "0.5"
  );
  config.handlers.exposure.riskModules = await regenerateFromAPI(
    "riskmodules",
    config.handlers.exposure.riskModules,
    "0.5",
    "0.7"
  );
  config.handlers.etkUtilizationRate.etokens = await regenerateFromAPI(
    "etokens",
    config.handlers.etkUtilizationRate.etokens,
    "0.8",
    "0.9"
  );
  config.handlers.paLoanLimits.premiumsAccounts = await regenerateFromAPI(
    "premiumsaccounts",
    config.handlers.paLoanLimits.premiumsAccounts,
    "0.3",
    "0.5"
  );

  return config;
}

async function regenerateFromAPI(endpoint, items, defaultWarnThresh, defaultCritThresh) {
  const apiItems = await fetchFromAPI(endpoint);
  const newItems = [];
  for (const apiItem of apiItems) {
    const existingItem = items.find((e) => e.address.toLowerCase() === apiItem.address.toLowerCase());
    newItems.push({
      name: apiItem.name,
      address: apiItem.address,
      warnThresh: existingItem?.warnThresh || defaultWarnThresh,
      critThresh: existingItem?.critThresh || defaultCritThresh,
    });
  }
  return newItems;
}

async function main() {
  const currentConfig = require("../src/config.json");
  const newConfig = await generateNewConfig(currentConfig);
  console.log(JSON.stringify(newConfig, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
