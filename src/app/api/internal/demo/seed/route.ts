/**
 * Endpoint per regenerar dades demo
 *
 * POST /api/internal/demo/seed
 *
 * Regles:
 * 1. Només funciona si APP_ENV === 'demo' (404 en altres entorns)
 * 2. Requereix header Authorization: Bearer <idToken> amb Firebase ID Token
 * 3. Verifica el token amb Admin SDK i comprova que l'UID és SuperAdmin
 * 4. Executa seed amb Admin SDK (via ADC)
 *
 * Retorna: { ok: true, counts: { donors, suppliers, ... } }
 */

import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { getAuth, type Auth } from 'firebase-admin/auth';
import type { Bucket } from '@google-cloud/storage';
import { isDemoEnv } from '@/lib/demo/isDemoOrg';

// ─────────────────────────────────────────────────────────────────────────────
// Firebase Admin initialization (lazy, cached, idempotent)
// Utilitza ADC (Application Default Credentials) via gcloud auth
// ─────────────────────────────────────────────────────────────────────────────

let cachedDb: Firestore | null = null;
let cachedBucket: Bucket | null = null;
let cachedAuth: Auth | null = null;

function getAdminDb(): Firestore {
  if (cachedDb) return cachedDb;

  if (getApps().length === 0) {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

    if (!projectId || !storageBucket) {
      throw new Error('Firebase config incompleta per Admin SDK');
    }

    initializeApp({
      credential: applicationDefault(),
      projectId,
      storageBucket,
    });

    console.log('[demo/seed] Firebase Admin inicialitzat amb ADC');
  }

  cachedDb = getFirestore();
  return cachedDb;
}

function getAdminStorage(): Bucket {
  if (cachedBucket) return cachedBucket;
  // Assegurar que Firebase està inicialitzat
  getAdminDb();
  cachedBucket = getStorage().bucket();
  return cachedBucket;
}

function getAdminAuth(): Auth {
  if (cachedAuth) return cachedAuth;
  // Assegurar que Firebase està inicialitzat
  getAdminDb();
  cachedAuth = getAuth();
  return cachedAuth;
}

// ─────────────────────────────────────────────────────────────────────────────
// Autenticació segura via Firebase ID Token
// ─────────────────────────────────────────────────────────────────────────────

interface AuthResult {
  uid: string;
  email?: string;
}

async function verifyIdToken(request: NextRequest): Promise<AuthResult | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    console.warn('[demo/seed] Missing or invalid Authorization header');
    return null;
  }

  const idToken = authHeader.substring(7);
  if (!idToken) {
    console.warn('[demo/seed] Empty ID token');
    return null;
  }

  try {
    const auth = getAdminAuth();
    const decodedToken = await auth.verifyIdToken(idToken);
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
    };
  } catch (error) {
    console.error('[demo/seed] Error verificant ID token:', error);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Verificació SuperAdmin
// ─────────────────────────────────────────────────────────────────────────────

async function verifySuperAdmin(uid: string): Promise<boolean> {
  // Opció 1: Verificar via SUPER_ADMIN_UID configurat a .env.demo
  const envSuperAdminUid = process.env.SUPER_ADMIN_UID;
  if (envSuperAdminUid && uid === envSuperAdminUid) {
    console.log('[demo/seed] SuperAdmin verificat via SUPER_ADMIN_UID env');
    return true;
  }

  // Opció 2: Verificar a Firestore (col·lecció systemSuperAdmins)
  try {
    const db = getAdminDb();
    const superAdminDoc = await db.doc(`systemSuperAdmins/${uid}`).get();
    if (superAdminDoc.exists) {
      console.log('[demo/seed] SuperAdmin verificat via Firestore');
      return true;
    }
  } catch (error) {
    console.warn('[demo/seed] No es pot verificar via Firestore:', error);
  }

  return false;
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

  // 2. Verificar ID Token (auth segura, no falsificable)
  const authResult = await verifyIdToken(request);
  if (!authResult) {
    return NextResponse.json(
      { error: 'No autoritzat (token invàlid o absent)' },
      { status: 401 }
    );
  }

  // 3. Verificar SuperAdmin
  const isSuperAdmin = await verifySuperAdmin(authResult.uid);
  if (!isSuperAdmin) {
    return NextResponse.json(
      { error: 'No autoritzat (no és SuperAdmin)' },
      { status: 403 }
    );
  }

  // 4. Executar seed
  try {
    console.log('[demo/seed] Iniciant seed demo per UID:', authResult.uid);
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

    // Missatge d'error més clar per problemes d'autenticació
    const errorMessage = (error as Error).message;
    let hint = '';

    if (errorMessage.includes('Could not load the default credentials') ||
        errorMessage.includes('GOOGLE_APPLICATION_CREDENTIALS')) {
      hint = 'Executa "gcloud auth application-default login" al terminal i reinicia la demo.';
    }

    return NextResponse.json(
      {
        error: 'Error executant seed',
        details: errorMessage,
        hint: hint || undefined,
      },
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
    auth: {
      type: 'Firebase ID Token',
      header: 'Authorization: Bearer <idToken>',
      note: 'El token ha de pertànyer a un SuperAdmin',
    },
    backend: 'Utilitza gcloud ADC (gcloud auth application-default login)',
  });
}
