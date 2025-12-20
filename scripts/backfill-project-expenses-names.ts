// scripts/backfill-project-expenses-names.ts
// Script one-shot per actualitzar categoryName i counterpartyName als exports existents
// Executar: npx tsx scripts/backfill-project-expenses-names.ts <orgId>

import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

initializeApp({
  credential: applicationDefault(),
  projectId: "summa-social",
});

const db = getFirestore();

async function resolveOrgId(slugOrId: string): Promise<string> {
  // Primer intenta com a ID directe
  const directDoc = await db.doc(`organizations/${slugOrId}`).get();
  if (directDoc.exists) return slugOrId;

  // Si no, busca per slug
  const bySlug = await db
    .collection("organizations")
    .where("slug", "==", slugOrId)
    .limit(1)
    .get();

  if (!bySlug.empty) return bySlug.docs[0].id;

  throw new Error(`Organització no trobada: ${slugOrId}`);
}

async function backfill(slugOrId: string) {
  const orgId = await resolveOrgId(slugOrId);
  console.log(`Backfilling exports for org: ${orgId}`);

  const exportsRef = db.collection(
    `organizations/${orgId}/exports/projectExpenses/items`
  );
  const snapshot = await exportsRef.get();

  console.log(`Found ${snapshot.size} exports to process`);

  let updated = 0;
  let skipped = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const updates: Record<string, string | null> = {};

    // categoryId ja conté el nom/codi de la categoria, no l'ID
    if (data.categoryId && !data.categoryName) {
      updates.categoryName = data.categoryId;
    }

    // Lookup counterpartyName si falta
    if (data.counterpartyId && !data.counterpartyName) {
      const contactSnap = await db
        .doc(`organizations/${orgId}/contacts/${data.counterpartyId}`)
        .get();
      if (contactSnap.exists) {
        updates.counterpartyName = (contactSnap.data() as { name?: string })?.name ?? null;
      }
    }

    if (Object.keys(updates).length > 0) {
      await doc.ref.update(updates);
      updated++;
      console.log(`Updated ${doc.id}: ${JSON.stringify(updates)}`);
    } else {
      skipped++;
    }
  }

  console.log(`Done. Updated: ${updated}, Skipped: ${skipped}`);
}

const orgId = process.argv[2];
if (!orgId) {
  console.error("Usage: npx tsx scripts/backfill-project-expenses-names.ts <orgId>");
  process.exit(1);
}

backfill(orgId).catch(console.error);
