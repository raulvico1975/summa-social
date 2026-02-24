#!/usr/bin/env node
/**
 * backfill-member-capabilities.mjs
 *
 * Afegeix el camp `capabilities` als membres de totes les organitzacions
 * que encara no el tinguin, assignant els valors per defecte segons el seu `role`:
 *
 *   admin   → {}                    (bypass per rol a les Rules — no s'omplen)
 *   user    → { 'moviments.read': true }
 *   viewer  → { 'moviments.read': true }
 *
 * Ús:
 *   node scripts/migrations/backfill-member-capabilities.mjs          # dry-run
 *   node scripts/migrations/backfill-member-capabilities.mjs --apply  # escriu
 *
 * Requisits:
 *   - Variables d'entorn per a Firebase Admin SDK
 *     (GOOGLE_APPLICATION_CREDENTIALS o FIREBASE_SERVICE_ACCOUNT_KEY)
 *   - firebase-admin instal·lat al projecte
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// ── Configuració ──────────────────────────────────────────────────────────────

const APPLY = process.argv.includes('--apply');
const BATCH_SIZE = 50; // invariant: ≤ 50 ops per batch Firestore

const ROLE_DEFAULT_CAPABILITIES = {
  admin: {},
  user: { 'moviments.read': true },
  viewer: { 'moviments.read': true },
};

// ── Inicialització Firebase Admin SDK ─────────────────────────────────────────

let admin;
try {
  admin = require('firebase-admin');
} catch {
  console.error('ERROR: firebase-admin no trobat. Executa npm install primer.');
  process.exit(1);
}

if (!admin.apps.length) {
  // Suporta FIREBASE_SERVICE_ACCOUNT_KEY (JSON inline) o GOOGLE_APPLICATION_CREDENTIALS (path)
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccountKey) {
    try {
      const credential = JSON.parse(serviceAccountKey);
      admin.initializeApp({ credential: admin.credential.cert(credential) });
    } catch {
      console.error('ERROR: FIREBASE_SERVICE_ACCOUNT_KEY no és JSON vàlid.');
      process.exit(1);
    }
  } else {
    // Usa GOOGLE_APPLICATION_CREDENTIALS (Application Default Credentials)
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
  }
}

const db = admin.firestore();

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Divideix un array en lots de mida `size`.
 */
function chunks(arr, size) {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

// ── Lògica principal ───────────────────────────────────────────────────────────

async function run() {
  console.log(`\n=== Backfill member capabilities ===`);
  console.log(`Mode: ${APPLY ? 'APPLY (escriu)' : 'DRY-RUN (no escriu)'}\n`);

  const orgsSnap = await db.collection('organizations').get();
  const orgIds = orgsSnap.docs.map(d => d.id);

  console.log(`Organitzacions trobades: ${orgIds.length}`);

  let totalInspected = 0;
  let totalAlreadyHas = 0;
  let totalToUpdate = 0;
  let totalUpdated = 0;

  for (const orgId of orgIds) {
    const membersSnap = await db.collection(`organizations/${orgId}/members`).get();

    const toUpdate = [];
    for (const memberDoc of membersSnap.docs) {
      const data = memberDoc.data();
      totalInspected++;

      if (data.capabilities !== undefined) {
        totalAlreadyHas++;
        continue; // idempotent: salt si ja té el camp
      }

      const role = data.role ?? 'user';
      const defaultCaps = ROLE_DEFAULT_CAPABILITIES[role] ?? { 'moviments.read': true };
      toUpdate.push({ ref: memberDoc.ref, capabilities: defaultCaps, role });
    }

    totalToUpdate += toUpdate.length;

    if (toUpdate.length === 0) continue;

    console.log(`  [${orgId}] ${toUpdate.length} membres sense capabilities`);

    if (APPLY) {
      // Escriu en lots de BATCH_SIZE
      for (const lot of chunks(toUpdate, BATCH_SIZE)) {
        const batch = db.batch();
        for (const { ref, capabilities } of lot) {
          batch.update(ref, { capabilities });
        }
        await batch.commit();
        totalUpdated += lot.length;
        process.stdout.write(`    ✓ ${totalUpdated} escrits fins ara...\r`);
      }
      console.log(`    ✓ ${toUpdate.length} membres actualitzats a [${orgId}]`);
    } else {
      // Dry-run: mostrar detall
      for (const { role, capabilities } of toUpdate) {
        console.log(`    [dry-run] role=${role} → capabilities=${JSON.stringify(capabilities)}`);
      }
    }
  }

  console.log(`\n── Resum ─────────────────────────────────────────`);
  console.log(`  Membres inspeccionats:  ${totalInspected}`);
  console.log(`  Ja tenien capabilities: ${totalAlreadyHas}`);
  console.log(`  Pendents d'actualitzar: ${totalToUpdate}`);
  if (APPLY) {
    console.log(`  Escrits a Firestore:    ${totalUpdated}`);
  } else {
    console.log(`  (dry-run — no s'ha escrit res)`);
    if (totalToUpdate > 0) {
      console.log(`\n  Per aplicar: node scripts/migrations/backfill-member-capabilities.mjs --apply`);
    }
  }
  console.log();
}

run().catch(err => {
  console.error('ERROR inesperat:', err);
  process.exit(1);
});
