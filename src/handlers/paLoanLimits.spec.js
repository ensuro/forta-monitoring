const { FindingSeverity, createBlockEvent, ethers } = require("forta-agent");
const Big = require("big.js");

const { createHandleBlock, createFinding } = require("./paLoanLimits");
const config = require("../config.json");

const USDC_UNIT = ethers.BigNumber.from(10).pow(config.erc20Tokens.USDC.decimals);
const _A = (x) => ethers.BigNumber.from(x).mul(USDC_UNIT);

const block = {
  hash: `0x${"0".repeat(64)}`,
  timestamp: Date.now() / 1000,
};

/*
premiumsAccount.jrLoanLimit()
premiumsAccount.srLoanLimit ()

jrEtk.getLoan(premiumsAccount)
srEtk.getLoan(premiumsAccount)

Warn loan/limit > 0.7
Crit loan/limit > 0.9


 */

describe("Premiums account Loan Limit monitoring", () => {
  const premiumsAccounts = [
    {
      name: "PA1",
      address: "0xa5A8c6b6cb08dB75F5d487F0838D0743871d80a7",
      warnThresh: "0.5",
      critThresh: "0.8",
    },
    {
      name: "PA2",
      address: "0xa5A8c6b6cb08dB75F5d487F0838D0743871d80a7",
      warnThresh: "0.7",
      critThresh: "0.9",
    },
  ];

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("returns empty findings when loan ratio is below threshold", async () => {
    const { premiumsAccount, jrEtk, srEtk, getEtk, getPremiumsAccount } = getMockFactories({});

    const handleBlock = createHandleBlock(() => {}, premiumsAccounts, getPremiumsAccount, getEtk);

    const blockEvent = createBlockEvent({ block: block });

    const findings = await handleBlock(blockEvent);

    expect(findings).toStrictEqual([]);
    expect(premiumsAccount.jrLoanLimit).toHaveBeenCalledWith({
      blockTag: blockEvent.blockNumber,
    });
    expect(premiumsAccount.srLoanLimit).toHaveBeenCalledWith({
      blockTag: blockEvent.blockNumber,
    });
    expect(jrEtk.getLoan).toHaveBeenCalledWith(premiumsAccounts[0].address, {
      blockTag: blockEvent.blockNumber,
    });
    expect(jrEtk.getLoan).toHaveBeenCalledWith(premiumsAccounts[1].address, {
      blockTag: blockEvent.blockNumber,
    });
    expect(srEtk.getLoan).toHaveBeenCalledWith(premiumsAccounts[0].address, {
      blockTag: blockEvent.blockNumber,
    });
    expect(srEtk.getLoan).toHaveBeenCalledWith(premiumsAccounts[1].address, {
      blockTag: blockEvent.blockNumber,
    });
  });

  it("returns high severity finding when balance is below warn threshold", async () => {
    const { premiumsAccount, jrEtk, srEtk, getEtk, getPremiumsAccount } = getMockFactories({
      jrEtk: { getLoan: () => _A("60000") },
    });

    const handleBlock = createHandleBlock(() => {}, premiumsAccounts, getPremiumsAccount, getEtk);

    const blockEvent = createBlockEvent({ block: block });

    const findings = await handleBlock(blockEvent);

    expect(findings).toStrictEqual([
      createFinding("warnLoanRatio", "High loan ratio", FindingSeverity.High, premiumsAccounts[0], "jr", "warnThresh", {
        level: Big("60000"),
        limit: Big("100000"),
        ratio: Big("0.6"),
      }),
    ]);
  });

  it("returns critical severity finding when balance is below crit threshold", async () => {
    const { premiumsAccount, jrEtk, srEtk, getEtk, getPremiumsAccount } = getMockFactories({
      srEtk: { getLoan: () => _A("162000") },
    });

    const handleBlock = createHandleBlock(() => {}, premiumsAccounts, getPremiumsAccount, getEtk);

    const blockEvent = createBlockEvent({ block: block });

    const findings = await handleBlock(blockEvent);

    expect(findings).toStrictEqual([
      createFinding(
        "critLoanRatio",
        "Critically high loan ratio",
        FindingSeverity.Critical,
        premiumsAccounts[0],
        "sr",
        "critThresh",
        {
          level: Big("162000"),
          limit: Big("200000"),
          ratio: Big("0.81"),
        }
      ),
      createFinding("warnLoanRatio", "High loan ratio", FindingSeverity.High, premiumsAccounts[1], "sr", "warnThresh", {
        level: Big("162000"),
        limit: Big("200000"),
        ratio: Big("0.81"),
      }),
    ]);
  });
});

function getPremiumsAccountMock(implementations) {
  return {
    jrLoanLimit: jest.fn().mockImplementation(implementations.jrLoanLimit || (() => _A("100000"))),
    srLoanLimit: jest.fn().mockImplementation(implementations.srLoanLimit || (() => _A("200000"))),
    juniorEtk: jest
      .fn()
      .mockImplementation(implementations.juniorEtk || (() => "0x693D294A309458231807a37898FEB3AD1c30582F")),
    seniorEtk: jest
      .fn()
      .mockImplementation(implementations.seniorEtk || (() => "0x3E832B013777fD5e4514A846E9E32e2f8782ed72")),
  };
}

function getEtkMock(implementations) {
  return {
    getLoan: jest.fn().mockImplementation(implementations.getLoan || (() => _A("10000"))),
  };
}

function getMockFactories(implementations) {
  const premiumsAccount = getPremiumsAccountMock(implementations.premiumsAccount || {});
  const jrEtk = getEtkMock(implementations.jrEtk || {});
  const srEtk = getEtkMock(implementations.srEtk || {});

  function getEtk({ address }) {
    if (address === premiumsAccount.juniorEtk()) return jrEtk;
    if (address === premiumsAccount.seniorEtk()) return srEtk;
    return getEtkMock({});
  }

  return { premiumsAccount, jrEtk, srEtk, getEtk, getPremiumsAccount: () => premiumsAccount };
}
