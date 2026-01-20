/**
 * Script: archive-orphan-remittance-children.ts
 *
 * Arxiva (soft-delete) totes les transaccions filles òrfenes d'una remesa legacy.
 *
 * Ús:
 *   node --import tsx scripts/archive-orphan-remittance-children.ts --org <orgId> --parent <parentTxId> --dry-run
 *   node --import tsx scripts/archive-orphan-remittance-children.ts --org <orgId> --parent <parentTxId> --apply
 *
 * Requisit previ:
 *   gcloud auth application-default login
 *
 * Guardrails:
 *   - Només arxiva si isRemittanceItem === true i source === "remittance"
 *   - NO delete, només soft-delete (archivedAt)
 *   - Batches de 50 (límit Firestore)
 */

import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// =============================================================================
// CONFIGURACIÓ
// =============================================================================

const BATCH_SIZE = 50;

// =============================================================================
// PARSE ARGS
// =============================================================================

function parseArgs(): { orgId: string; parentTxId: string; apply: boolean } {
  const args = process.argv.slice(2);

  let orgId = '';
  let parentTxId = '';
  let apply = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--org' && args[i + 1]) {
      orgId = args[i + 1];
      i++;
    } else if (args[i] === '--parent' && args[i + 1]) {
      parentTxId = args[i + 1];
      i++;
    } else if (args[i] === '--apply') {
      apply = true;
    } else if (args[i] === '--dry-run') {
      apply = false;
    }
  }

  if (!orgId || !parentTxId) {
    console.error('Ús: node --import tsx scripts/archive-orphan-remittance-children.ts --org <orgId> --parent <parentTxId> [--dry-run|--apply]');
    process.exit(1);
  }

  return { orgId, parentTxId, apply };
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const { orgId, parentTxId, apply } = parseArgs();

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  ARCHIVE ORPHAN REMITTANCE CHILDREN');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  orgId:        ${orgId}`);
  console.log(`  parentTxId:   ${parentTxId}`);
  console.log(`  mode:         ${apply ? 'APPLY' : 'DRY-RUN'}`);
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  // Inicialitzar Firebase Admin amb ADC
  try {
    initializeApp({
      credential: applicationDefault(),
    });
  } catch (error) {
    console.error('Error inicialitzant Firebase Admin. Assegura\'t d\'haver executat:');
    console.error('  gcloud auth application-default login');
    process.exit(1);
  }

  const db = getFirestore();

  // ─────────────────────────────────────────────────────────────────────────
  // 1. Query totes les filles per parentTransactionId
  // ─────────────────────────────────────────────────────────────────────────
  console.log('Cercant transaccions filles...');

  const txCollection = db.collection(`organizations/${orgId}/transactions`);
  const snap = await txCollection
    .where('parentTransactionId', '==', parentTxId)
    .get();

  console.log(`Total filles trobades: ${snap.docs.length}`);

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Filtrar actives (archivedAt absent/null/"")
  // ─────────────────────────────────────────────────────────────────────────
  const activeDocs = snap.docs.filter(doc => {
    const data = doc.data();
    return !data.archivedAt; // tolerant: null/undefined/""
  });

  console.log(`Filles actives (sense archivedAt): ${activeDocs.length}`);

  if (activeDocs.length === 0) {
    console.log('');
    console.log('✓ Cap filla activa trobada. No cal fer res.');
    process.exit(0);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Guardrail: verificar isRemittanceItem i source
  // ─────────────────────────────────────────────────────────────────────────
  const validDocs = activeDocs.filter(doc => {
    const data = doc.data();
    return data.isRemittanceItem === true && data.source === 'remittance';
  });

  const invalidDocs = activeDocs.filter(doc => {
    const data = doc.data();
    return !(data.isRemittanceItem === true && data.source === 'remittance');
  });

  console.log(`Filles amb guardrail OK (isRemittanceItem + source): ${validDocs.length}`);

  if (invalidDocs.length > 0) {
    console.log('');
    console.log('⚠️  ATENCIÓ: Hi ha filles actives que NO compleixen guardrail:');
    for (const doc of invalidDocs.slice(0, 5)) {
      const data = doc.data();
      console.log(`   - ${doc.id}: isRemittanceItem=${data.isRemittanceItem}, source=${data.source}`);
    }
    console.log('');
    console.log('Aquestes filles NO seran arxivades.');
  }

  if (validDocs.length === 0) {
    console.log('');
    console.log('✓ Cap filla vàlida per arxivar.');
    process.exit(0);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 4. Mostrar exemples
  // ─────────────────────────────────────────────────────────────────────────
  console.log('');
  console.log('Exemples de filles a arxivar (màx 10):');
  console.log('─────────────────────────────────────────────────────────────────');

  for (const doc of validDocs.slice(0, 10)) {
    const data = doc.data();
    console.log(`  ID:          ${doc.id}`);
    console.log(`  description: ${data.description || '(sense)'}`);
    console.log(`  date:        ${data.date || '(sense)'}`);
    console.log(`  contactId:   ${data.contactId || '(sense)'}`);
    console.log(`  amount:      ${data.amount}`);
    console.log(`  archivedAt:  ${data.archivedAt || '(null/undefined)'}`);
    console.log('  ---');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 5. DRY-RUN: només mostrar resum
  // ─────────────────────────────────────────────────────────────────────────
  if (!apply) {
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  DRY-RUN COMPLET');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`  Filles a arxivar: ${validDocs.length}`);
    console.log('');
    console.log('Per aplicar els canvis, executa amb --apply:');
    console.log(`  node --import tsx scripts/archive-orphan-remittance-children.ts --org ${orgId} --parent ${parentTxId} --apply`);
    console.log('');
    process.exit(0);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 6. APPLY: arxivar en batches
  // ─────────────────────────────────────────────────────────────────────────
  console.log('');
  console.log('Arxivant filles...');

  const now = new Date().toISOString();
  let archivedCount = 0;

  for (let i = 0; i < validDocs.length; i += BATCH_SIZE) {
    const chunk = validDocs.slice(i, i + BATCH_SIZE);
    const batch = db.batch();

    for (const doc of chunk) {
      batch.update(doc.ref, {
        archivedAt: now,
        archivedReason: 'legacy_orphan_cleanup',
        archivedFromAction: 'script_orphan_cleanup',
      });
      archivedCount++;
    }

    await batch.commit();
    console.log(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${chunk.length} arxivades`);
  }

  console.log('');
  console.log(`Total arxivades: ${archivedCount}`);

  // ─────────────────────────────────────────────────────────────────────────
  // 7. Validació post
  // ─────────────────────────────────────────────────────────────────────────
  console.log('');
  console.log('Verificant...');

  const verifySnap = await txCollection
    .where('parentTransactionId', '==', parentTxId)
    .get();

  const stillActive = verifySnap.docs.filter(doc => {
    const data = doc.data();
    // Només comptem les que compleixen guardrail
    if (!(data.isRemittanceItem === true && data.source === 'remittance')) {
      return false;
    }
    return !data.archivedAt;
  });

  if (stillActive.length > 0) {
    console.error('');
    console.error('❌ ERROR: Encara queden filles actives després d\'arxivar!');
    console.error(`   Actives restants: ${stillActive.length}`);
    for (const doc of stillActive.slice(0, 5)) {
      console.error(`   - ${doc.id}`);
    }
    process.exit(1);
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  ✓ APPLY COMPLET');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Filles arxivades: ${archivedCount}`);
  console.log(`  Filles actives restants: 0`);
  console.log('');
}

main().catch(err => {
  console.error('Error inesperat:', err);
  process.exit(1);
});
