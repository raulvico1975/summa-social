#!/usr/bin/env node
import {
  FISCAL_ORACLE_DEMO_IDS,
  FISCAL_ORACLE_EXPECTED,
  calculateFiscalOracleMetrics,
  createFiscalOracleFixtureTransactions,
  diffFiscalOracle,
} from '@/lib/fiscal/fiscal-oracle';

type Stage = 'predeploy' | 'postdeploy' | 'ci';

function parseStage(argv: string[]): Stage {
  const found = argv.find((arg) => arg.startsWith('--stage='));
  const stageValue = found?.split('=')[1];
  if (stageValue === 'predeploy' || stageValue === 'postdeploy' || stageValue === 'ci') {
    return stageValue;
  }
  return 'ci';
}

function run(): number {
  const stage = parseStage(process.argv.slice(2));
  const year = new Date().getFullYear();

  const fixtureTxs = createFiscalOracleFixtureTransactions({
    year,
    donorId: FISCAL_ORACLE_DEMO_IDS.donorId,
    donationCategoryId: 'oracle-category-donations',
    membershipFeeCategoryId: 'oracle-category-member-fees',
  });

  const actual = calculateFiscalOracleMetrics(fixtureTxs, year, FISCAL_ORACLE_DEMO_IDS.donorId);
  const diffs = diffFiscalOracle(actual, FISCAL_ORACLE_EXPECTED);

  if (diffs.length > 0) {
    console.error(`[fiscal-oracle] FISCAL_ORACLE_FAIL (${stage})`);
    for (const diff of diffs) {
      console.error(`[fiscal-oracle]   ${diff}`);
    }
    return 1;
  }

  console.log(`[fiscal-oracle] OK (${stage})`);
  console.log(`[fiscal-oracle] donorNet=${actual.donorNet} total182=${actual.total182} certificateNet=${actual.certificateNet} pendingExcluded=${actual.pendingExcludedCount}`);
  return 0;
}

process.exit(run());
