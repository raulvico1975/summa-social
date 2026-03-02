/**
 * Arxiva (soft-delete) transaccions filles actives amb parentTransactionId inexistent.
 *
 * Ús:
 *   node --import tsx scripts/archive-orphan-remittance-children-missing-parent.ts --project summa-social --org <orgId> --dry-run
 *   node --import tsx scripts/archive-orphan-remittance-children-missing-parent.ts --project summa-social --org <orgId> --apply
 */

import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, type DocumentReference } from "firebase-admin/firestore";

const WRITE_BATCH_LIMIT = 50;
const PARENT_FETCH_CHUNK = 300;
const EXAMPLES_LIMIT = 10;

interface CliArgs {
  orgId: string;
  projectId: string | null;
  apply: boolean;
}

interface ChildCandidate {
  ref: DocumentReference;
  childId: string;
  parentTransactionId: string;
  date: string | null;
  amount: number | null;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);

  let orgId = "";
  let projectId: string | null = null;
  let apply = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--org" && args[i + 1]) {
      orgId = args[i + 1];
      i++;
      continue;
    }

    if (arg === "--project" && args[i + 1]) {
      projectId = args[i + 1];
      i++;
      continue;
    }

    if (arg === "--apply") {
      apply = true;
      continue;
    }

    if (arg === "--dry-run") {
      apply = false;
      continue;
    }
  }

  if (!orgId) {
    console.error("Falta --org <orgId>");
    process.exit(1);
  }

  const envProject =
    process.env.GCLOUD_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    null;

  return {
    orgId,
    projectId: projectId ?? envProject,
    apply,
  };
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

async function main(): Promise<void> {
  const { orgId, projectId, apply } = parseArgs();

  if (getApps().length === 0) {
    if (projectId) {
      initializeApp({ projectId });
    } else {
      initializeApp();
    }
  }

  const db = getFirestore();
  const txCollection = db.collection("organizations").doc(orgId).collection("transactions");

  console.log("═══════════════════════════════════════════════════════════════════");
  console.log("  ORPHAN K CLEANUP (MISSING PARENT)");
  console.log("═══════════════════════════════════════════════════════════════════");
  console.log(`  mode: ${apply ? "APPLY" : "DRY-RUN"}`);
  console.log(`  orgId: ${orgId}`);
  console.log(`  projectId: ${projectId ?? "(default ADC)"}`);
  console.log("═══════════════════════════════════════════════════════════════════");

  const txSnap = await txCollection.get();

  const childrenCandidates: ChildCandidate[] = [];
  const parentIds = new Set<string>();

  for (const doc of txSnap.docs) {
    const data = doc.data() as Record<string, unknown>;

    const rawParent = data.parentTransactionId;
    const parentTransactionId = typeof rawParent === "string" ? rawParent.trim() : "";
    if (!parentTransactionId) continue;

    const archivedAt = data.archivedAt;
    const isActive = archivedAt == null || archivedAt === "";
    if (!isActive) continue;

    const amount = typeof data.amount === "number" ? data.amount : null;
    const date = typeof data.date === "string" ? data.date : null;

    childrenCandidates.push({
      ref: doc.ref,
      childId: doc.id,
      parentTransactionId,
      date,
      amount,
    });
    parentIds.add(parentTransactionId);
  }

  const parentIdList = [...parentIds];
  const existingParentIds = new Set<string>();

  for (const parentChunk of chunk(parentIdList, PARENT_FETCH_CHUNK)) {
    const parentRefs = parentChunk.map((parentId) => txCollection.doc(parentId));
    const parentSnaps = await db.getAll(...parentRefs);
    for (const parentSnap of parentSnaps) {
      if (parentSnap.exists) {
        existingParentIds.add(parentSnap.id);
      }
    }
  }

  const missingParentIds = new Set(parentIdList.filter((parentId) => !existingParentIds.has(parentId)));
  const orphans = childrenCandidates.filter((child) => missingParentIds.has(child.parentTransactionId));

  console.log("");
  console.log(`totalChildrenCandidate=${childrenCandidates.length}`);
  console.log(`uniqueParents=${parentIdList.length}`);
  console.log(`missingParents=${missingParentIds.size}`);
  console.log(`orphansCount=${orphans.length}`);

  if (orphans.length > 0) {
    console.log("");
    console.log("Exemples (max 10):");
    for (const child of orphans.slice(0, EXAMPLES_LIMIT)) {
      console.log(
        `- childId=${child.childId} parentTransactionId=${child.parentTransactionId} date=${child.date ?? "null"} amount=${child.amount ?? "null"}`
      );
    }
  }

  if (!apply) {
    console.log("");
    console.log("DRY-RUN: cap canvi aplicat.");
    return;
  }

  if (orphans.length === 0) {
    console.log("");
    console.log("APPLY: no hi ha orfes, cap update.");
    return;
  }

  const archivedAt = new Date().toISOString();
  let updated = 0;

  for (const orphanChunk of chunk(orphans, WRITE_BATCH_LIMIT)) {
    const batch = db.batch();
    for (const orphan of orphanChunk) {
      batch.update(orphan.ref, {
        archivedAt,
        archivedByUid: "script",
        archivedReason: "legacy_orphan_cleanup",
        archivedFromAction: "superadmin_cleanup",
      });
      updated++;
    }
    await batch.commit();
  }

  console.log("");
  console.log(`APPLY complet. updated=${updated}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`ERROR: ${message}`);
  process.exit(1);
});
