/**
 * Activa o desactiva el flag del copilot premium d'onboarding per una org.
 *
 * Guardrails:
 * - Dry-run per defecte
 * - Requereix --project summa-social
 * - Busca l'org per slug via col·lecció /slugs
 * - Refusa activar si l'org ja té runs SEPA previs, excepte amb --force
 *
 * Exemples:
 *   GCLOUD_PROJECT=summa-social node --import tsx scripts/enable-copilot-onboarding-premium.ts --project summa-social --slug pbi
 *   GCLOUD_PROJECT=summa-social node --import tsx scripts/enable-copilot-onboarding-premium.ts --project summa-social --slug pbi --apply
 *   GCLOUD_PROJECT=summa-social node --import tsx scripts/enable-copilot-onboarding-premium.ts --project summa-social --slug pbi --apply --disable
 */

import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const EXPECTED_PROJECT = 'summa-social';

type Options = {
  apply: boolean;
  enable: boolean;
  slug: string;
  force: boolean;
};

function readFlag(name: string): boolean {
  return process.argv.includes(name);
}

function readOption(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index === -1 || index + 1 >= process.argv.length) {
    return null;
  }
  return process.argv[index + 1] ?? null;
}

function parseOptions(): Options {
  const slug = readOption('--slug');
  if (!slug) {
    console.error('ERROR: cal passar --slug <org-slug>');
    process.exit(1);
  }

  return {
    apply: readFlag('--apply'),
    enable: !readFlag('--disable'),
    slug,
    force: readFlag('--force'),
  };
}

function validateProject(): void {
  const projectFlag = readOption('--project');
  const envProject = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;

  if (projectFlag !== EXPECTED_PROJECT) {
    console.error(`ERROR: cal passar --project ${EXPECTED_PROJECT}`);
    console.error(`  Rebut: --project ${projectFlag ?? '(no especificat)'}`);
    process.exit(1);
  }

  if (envProject && envProject !== EXPECTED_PROJECT) {
    console.error(`ERROR: GCLOUD_PROJECT=\"${envProject}\" no coincideix amb \"${EXPECTED_PROJECT}\"`);
    process.exit(1);
  }
}

async function main(): Promise<void> {
  const options = parseOptions();
  validateProject();

  if (getApps().length === 0) {
    initializeApp({
      credential: applicationDefault(),
      projectId: EXPECTED_PROJECT,
    });
  }

  const db = getFirestore();

  const slugSnap = await db.collection('slugs').doc(options.slug).get();
  if (!slugSnap.exists) {
    throw new Error(`Slug no trobat: ${options.slug}`);
  }

  const orgId = String(slugSnap.get('orgId') || '');
  if (!orgId) {
    throw new Error(`El slug ${options.slug} no té orgId`);
  }

  const orgRef = db.collection('organizations').doc(orgId);
  const orgSnap = await orgRef.get();
  if (!orgSnap.exists) {
    throw new Error(`Organització no trobada: ${orgId}`);
  }

  const runSnap = await orgRef.collection('sepaCollectionRuns').limit(1).get();
  const hasPreviousSepaRuns = runSnap.size > 0;
  const currentFlag = Boolean(orgSnap.get('features.copilotOnboardingPremium'));

  const summary = {
    mode: options.apply ? 'APPLY' : 'DRY-RUN',
    action: options.enable ? 'enable' : 'disable',
    slug: options.slug,
    orgId,
    name: orgSnap.get('name') ?? null,
    currentFlag,
    hasPreviousSepaRuns,
    force: options.force,
  };

  console.log(JSON.stringify(summary, null, 2));

  if (options.enable && hasPreviousSepaRuns && !options.force) {
    console.error('\nSTOP: aquesta org ja té runs SEPA previs. No és un bon pilot de primera remesa.');
    console.error('Passa --force només si vols ignorar expressament aquest guardrail.');
    process.exit(2);
  }

  if (!options.apply) {
    console.log('\nDry-run finalitzat. No s\'ha escrit cap canvi.');
    return;
  }

  await orgRef.update({
    'features.copilotOnboardingPremium': options.enable,
    updatedAt: new Date().toISOString(),
  });

  console.log(`\nOK: flag copilotOnboardingPremium ${options.enable ? 'activat' : 'desactivat'} per ${options.slug}`);
}

main().catch((error) => {
  console.error('\nERROR:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
