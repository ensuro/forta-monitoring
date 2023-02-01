function createFinding(id, name, severity, account, thresholdKey, balance) {
  const descriptionPrefix = account.token
    ? `${account.token} balance`
    : "Balance";
  const formattedBalance = ethers.utils.formatUnits(balance);

  return Finding.fromObject({
    alertId: id,
    name: name,
    severity: severity,
    description: `${descriptionPrefix} for ${account.name} (${account.address}) is ${formattedBalance}, below ${account[thresholdKey]} thresh.`,
    protocol: "ensuro",
    type: FindingType.Info,
  });
}
