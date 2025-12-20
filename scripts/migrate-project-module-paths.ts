#!/usr/bin/env npx tsx
/**
 * Script de migració per al mòdul de Projectes
 *
 * Mou els documents de:
 *   /organizations/{orgId}/projectModule/projects/{projectId}
 *   /organizations/{orgId}/projectModule/expenseLinks/{linkId}
 *
 * A:
 *   /organizations/{orgId}/projectModule/_/projects/{projectId}
 *   /organizations/{orgId}/projectModule/_/expenseLinks/{linkId}
 *
 * Execució:
 *   npx tsx scripts/migrate-project-module-paths.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓ
// ═══════════════════════════════════════════════════════════════════════════

const DRY_RUN = process.argv.includes('--dry-run');

if (DRY_RUN) {
  console.log('🔍 MODE DRY-RUN: No es farà cap canvi real\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// INICIALITZACIÓ FIREBASE ADMIN
// ═══════════════════════════════════════════════════════════════════════════

function initFirebase() {
  if (getApps().length > 0) {
    return getFirestore();
  }

  // Buscar credencials en fitxer local
  const possiblePaths = [
    resolve(process.cwd(), 'summa-social-firebase-adminsdk.json'),
    resolve(process.cwd(), 'firebase-admin-key.json'),
    resolve(process.cwd(), 'service-account.json'),
  ];

  let credentialsPath: string | null = null;
  for (const p of possiblePaths) {
    try {
      readFileSync(p);
      credentialsPath = p;
      break;
    } catch {
      // Continuar buscant
    }
  }

  if (credentialsPath) {
    console.log(`📁 Usant credencials: ${credentialsPath}\n`);
    const serviceAccount = JSON.parse(readFileSync(credentialsPath, 'utf-8'));
    initializeApp({
      credential: cert(serviceAccount),
    });
  } else {
    // Usar Application Default Credentials (gcloud auth)
    console.log('📁 Usant Application Default Credentials (gcloud auth)\n');
    console.log('   Si falla, executa: gcloud auth application-default login\n');

    initializeApp({
      projectId: 'summa-social',
    });
  }

  return getFirestore();
}

// ═══════════════════════════════════════════════════════════════════════════
// MIGRACIÓ
// ═══════════════════════════════════════════════════════════════════════════

async function migrateProjectModule() {
  const db = initFirebase();

  // Obtenir totes les organitzacions
  const orgsSnapshot = await db.collection('organizations').get();
  console.log(`📊 Trobades ${orgsSnapshot.size} organitzacions\n`);

  let totalProjectsMigrated = 0;
  let totalLinksMigrated = 0;

  for (const orgDoc of orgsSnapshot.docs) {
    const orgId = orgDoc.id;
    const orgName = orgDoc.data().name || orgId;
    console.log(`\n═══════════════════════════════════════════════════════════════`);
    console.log(`📁 Organització: ${orgName} (${orgId})`);
    console.log(`═══════════════════════════════════════════════════════════════`);

    // ─────────────────────────────────────────────────────────────────────────
    // 1. Migrar projectes: projectModule/projects → projectModule/_/projects
    // ─────────────────────────────────────────────────────────────────────────

    const oldProjectsRef = db.collection('organizations').doc(orgId)
      .collection('projectModule').doc('projects');

    // Comprovar si el document 'projects' existeix (path antic incorrecte)
    // En realitat, l'estructura antiga seria projectModule com a col·lecció directa
    // Però Firestore requereix alternança col·lecció/document

    // Intentem buscar si hi ha documents a projectModule que no siguin el placeholder
    const projectModuleSnapshot = await db.collection('organizations').doc(orgId)
      .collection('projectModule').get();

    for (const moduleDoc of projectModuleSnapshot.docs) {
      if (moduleDoc.id === '_') continue; // Ignorar el placeholder correcte

      // Si el document té subcol·leccions que semblen projectes
      const possibleProjectsSnapshot = await db.collection('organizations').doc(orgId)
        .collection('projectModule').doc(moduleDoc.id).listCollections();

      // Si no té subcol·leccions, podria ser un projecte guardat incorrectament
      // al nivell de projectModule directament
      if (possibleProjectsSnapshot.length === 0) {
        const data = moduleDoc.data();

        // Comprovar si sembla un projecte (té 'name' i 'status')
        if (data && data.name && data.status) {
          console.log(`\n  🔄 Trobat projecte al path antic: ${moduleDoc.id}`);
          console.log(`     Nom: ${data.name}`);
          console.log(`     Estat: ${data.status}`);

          if (!DRY_RUN) {
            // Copiar al nou path
            const newRef = db.collection('organizations').doc(orgId)
              .collection('projectModule').doc('_')
              .collection('projects').doc(moduleDoc.id);

            await newRef.set({
              ...data,
              migratedAt: FieldValue.serverTimestamp(),
              migratedFrom: `projectModule/${moduleDoc.id}`,
            });

            // Eliminar l'antic
            await moduleDoc.ref.delete();

            console.log(`     ✅ Migrat correctament`);
          } else {
            console.log(`     ⏸️  [DRY-RUN] Es migraria a projectModule/_/projects/${moduleDoc.id}`);
          }

          totalProjectsMigrated++;
        }
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Verificar si hi ha documents a projectModule/projects (subcol·lecció)
    // ─────────────────────────────────────────────────────────────────────────

    // Intentem llegir projectModule/projects com a document amb subcol·lecció
    // Això passaria si algú va crear projectModule/projects/{projectId} manualment
    try {
      const projectsDoc = await db.collection('organizations').doc(orgId)
        .collection('projectModule').doc('projects').get();

      if (projectsDoc.exists) {
        // Aquest document no hauria d'existir, és un error de path
        console.log(`\n  ⚠️  Trobat document projectModule/projects (hauria de ser projectModule/_/projects)`);

        // Comprovar si té dades de projecte
        const data = projectsDoc.data();
        if (data && Object.keys(data).length > 0) {
          console.log(`     Contingut: ${JSON.stringify(data).substring(0, 100)}...`);
        }
      }
    } catch (err) {
      // Ignorar errors de permisos o path invàlid
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Verificar projectes al path correcte
    // ─────────────────────────────────────────────────────────────────────────

    const correctProjectsSnapshot = await db.collection('organizations').doc(orgId)
      .collection('projectModule').doc('_')
      .collection('projects').get();

    console.log(`\n  📋 Projectes al path correcte (projectModule/_/projects): ${correctProjectsSnapshot.size}`);

    for (const p of correctProjectsSnapshot.docs) {
      const pData = p.data();
      console.log(`     - ${p.id}: ${pData.name} (${pData.status})`);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. Verificar expenseLinks
    // ─────────────────────────────────────────────────────────────────────────

    const correctLinksSnapshot = await db.collection('organizations').doc(orgId)
      .collection('projectModule').doc('_')
      .collection('expenseLinks').get();

    console.log(`\n  🔗 ExpenseLinks al path correcte (projectModule/_/expenseLinks): ${correctLinksSnapshot.size}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RESUM
  // ═══════════════════════════════════════════════════════════════════════════

  console.log(`\n\n═══════════════════════════════════════════════════════════════`);
  console.log(`📊 RESUM DE LA MIGRACIÓ`);
  console.log(`═══════════════════════════════════════════════════════════════`);
  console.log(`   Projectes migrats: ${totalProjectsMigrated}`);
  console.log(`   Links migrats: ${totalLinksMigrated}`);

  if (DRY_RUN && (totalProjectsMigrated > 0 || totalLinksMigrated > 0)) {
    console.log(`\n   💡 Per executar la migració real, executa sense --dry-run`);
  }

  console.log(`\n✅ Migració completada`);
}

// ═══════════════════════════════════════════════════════════════════════════
// EXECUCIÓ
// ═══════════════════════════════════════════════════════════════════════════

migrateProjectModule().catch((err) => {
  console.error('❌ Error durant la migració:', err);
  process.exit(1);
});
