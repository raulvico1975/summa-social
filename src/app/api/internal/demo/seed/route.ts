/**
 * Endpoint per regenerar dades demo
 *
 * POST /api/internal/demo/seed
 *
 * Regles:
 * 1. Només funciona si APP_ENV === 'demo' (404 en altres entorns)
 * 2. Requereix header X-User-UID amb UID de SuperAdmin
 * 3. Executa seed amb Admin SDK
 *
 * Retorna: { ok: true, counts: { donors, suppliers, ... } }
 */

import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { isDemoEnv } from '@/lib/demo/isDemoOrg';

// ─────────────────────────────────────────────────────────────────────────────
// Firebase Admin initialization (lazy)
// ─────────────────────────────────────────────────────────────────────────────

function getAdminDb() {
  if (getApps().length === 0) {
    // En demo, usem service account de .env.demo via GOOGLE_APPLICATION_CREDENTIALS
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

    if (!projectId || !storageBucket) {
      throw new Error('Firebase config incompleta per Admin SDK');
    }

    initializeApp({
      projectId,
      storageBucket,
    });
  }

  return getFirestore();
}

function getAdminStorage() {
  if (getApps().length === 0) {
    getAdminDb(); // Ensure initialized
  }
  return getStorage().bucket();
}

// ─────────────────────────────────────────────────────────────────────────────
// Verificació SuperAdmin
// ─────────────────────────────────────────────────────────────────────────────

async function verifySuperAdmin(uid: string | null): Promise<boolean> {
  if (!uid) return false;

  try {
    const db = getAdminDb();
    const superAdminDoc = await db.doc(`systemSuperAdmins/${uid}`).get();
    return superAdminDoc.exists;
  } catch (error) {
    console.error('[demo/seed] Error verificant SuperAdmin:', error);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Seed Demo Data
// ─────────────────────────────────────────────────────────────────────────────

interface SeedCounts {
  donors: number;
  suppliers: number;
  workers: number;
  categories: number;
  transactions: number;
  projects: number;
  projectAssignments: number;
  budgetLines: number;
  expenses: number;
  pdfs: number;
}

async function seedDemoData(): Promise<SeedCounts> {
  const db = getAdminDb();
  const bucket = getAdminStorage();

  // Import dinàmic del seeder per evitar carregar-lo en prod
  const { runDemoSeed } = await import('@/scripts/demo/seed-demo');

  return runDemoSeed(db, bucket);
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // 1. Verificar entorn DEMO
  if (!isDemoEnv()) {
    // Retornem 404 per no exposar que l'endpoint existeix en prod
    return new NextResponse('Not Found', { status: 404 });
  }

  // 2. Verificar SuperAdmin
  const userUid = request.headers.get('X-User-UID');
  const isSuperAdmin = await verifySuperAdmin(userUid);

  if (!isSuperAdmin) {
    return NextResponse.json(
      { error: 'No autoritzat' },
      { status: 403 }
    );
  }

  // 3. Executar seed
  try {
    console.log('[demo/seed] Iniciant seed demo per UID:', userUid);
    const counts = await seedDemoData();
    console.log('[demo/seed] Seed completat:', counts);

    return NextResponse.json(
      {
        ok: true,
        counts,
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('[demo/seed] Error executant seed:', error);
    return NextResponse.json(
      { error: 'Error executant seed', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// GET retorna info sobre l'endpoint (només en demo)
export async function GET() {
  if (!isDemoEnv()) {
    return new NextResponse('Not Found', { status: 404 });
  }

  return NextResponse.json({
    endpoint: '/api/internal/demo/seed',
    method: 'POST',
    description: 'Regenera dades demo (requereix SuperAdmin)',
    headers: {
      'X-User-UID': 'UID de SuperAdmin (obligatori)',
    },
  });
}
