#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import http from 'node:http';

import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { chromium } from 'playwright';

const ROOT_DIR = process.cwd();
const DEMO_ORG_ID = 'demo-org';
const DEFAULT_PASSWORD = 'DemoRecorder!2026';

function parseArg(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    if (!key || process.env[key]) continue;
    if (key === 'GOOGLE_APPLICATION_CREDENTIALS') continue;
    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function relativePath(targetPath) {
  return path.relative(ROOT_DIR, targetPath) || '.';
}

async function checkHttp(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve({
        ok: res.statusCode && res.statusCode < 500,
        statusCode: res.statusCode ?? 0,
      });
    });
    req.on('error', (error) => {
      resolve({
        ok: false,
        statusCode: 0,
        error: error.message,
      });
    });
  });
}

async function ensureDemoRecorder(auth, db, email, password) {
  const normalizedEmail = email.toLowerCase().trim();
  const displayName = 'Demo Recorder';

  let userRecord;
  try {
    userRecord = await auth.getUserByEmail(normalizedEmail);
    await auth.updateUser(userRecord.uid, {
      password,
      displayName,
      emailVerified: true,
      disabled: false,
    });
    userRecord = await auth.getUser(userRecord.uid);
  } catch (error) {
    if (error?.code !== 'auth/user-not-found') {
      throw error;
    }

    userRecord = await auth.createUser({
      email: normalizedEmail,
      password,
      displayName,
      emailVerified: true,
    });
  }

  const nowIso = new Date().toISOString();
  const uid = userRecord.uid;

  await Promise.all([
    db.doc(`systemSuperAdmins/${uid}`).set({
      email: normalizedEmail,
      createdAt: nowIso,
      createdBy: 'video-studio-preflight',
      autoCreated: true,
    }, { merge: true }),
    db.doc(`users/${uid}`).set({
      displayName,
      email: normalizedEmail,
      role: 'admin',
      organizationId: DEMO_ORG_ID,
      defaultOrganizationId: DEMO_ORG_ID,
      organizations: [DEMO_ORG_ID],
      updatedAt: nowIso,
    }, { merge: true }),
    db.doc(`organizations/${DEMO_ORG_ID}/members/${uid}`).set({
      userId: uid,
      email: normalizedEmail,
      displayName,
      role: 'admin',
      joinedAt: nowIso,
      invitationId: 'video-studio-preflight',
    }, { merge: true }),
  ]);

  return { email: normalizedEmail, password };
}

function mapLocale(locale) {
  if (locale === 'ca') return 'ca-ES';
  if (locale === 'es') return 'es-ES';
  return 'en-US';
}

async function main() {
  const pieceId = parseArg('--piece');
  const outputDir = parseArg('--output') || path.join(ROOT_DIR, 'tmp', 'video-studio-preflight');

  if (!pieceId) {
    throw new Error('Cal passar --piece');
  }

  ensureDir(outputDir);
  loadEnvFile(path.join(ROOT_DIR, '.env.demo'));
  process.env.APP_ENV = process.env.APP_ENV || 'demo';
  process.env.NEXT_PUBLIC_APP_ENV = process.env.NEXT_PUBLIC_APP_ENV || 'demo';

  const contractPath = path.join(ROOT_DIR, 'demo', 'studio.contract.json');
  const scenarioPath = path.join(ROOT_DIR, 'demo', 'scenarios', `${pieceId}.json`);

  if (!fs.existsSync(contractPath)) {
    throw new Error(`No existeix ${relativePath(contractPath)}`);
  }
  if (!fs.existsSync(scenarioPath)) {
    throw new Error(`No existeix ${relativePath(scenarioPath)}`);
  }

  const contract = readJson(contractPath);
  const scenario = readJson(scenarioPath);
  const selectorPath = path.join(ROOT_DIR, 'demo', scenario.selectorFile);

  if (!fs.existsSync(selectorPath)) {
    throw new Error(`No existeix ${relativePath(selectorPath)}`);
  }

  const selectors = readJson(selectorPath);
  const demoUser = contract.demoUsers?.[scenario.locale];
  if (!demoUser?.email) {
    throw new Error(`No hi ha usuari demo configurat per locale ${scenario.locale}`);
  }

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error('Falta NEXT_PUBLIC_FIREBASE_PROJECT_ID a .env.demo');
  }

  const localOrigin = new URL(contract.localBaseUrl).origin;
  const baseUrlCheck = await checkHttp(contract.localBaseUrl);
  if (!baseUrlCheck.ok) {
    throw new Error(`No respon ${contract.localBaseUrl}`);
  }

  const seedEndpointCheck = await checkHttp(`${localOrigin}/api/internal/demo/seed`);

  if (getApps().length === 0) {
    initializeApp({
      credential: applicationDefault(),
      projectId,
    });
  }

  const auth = getAuth();
  const db = getFirestore();
  const password = demoUser.passwordEnv ? process.env[demoUser.passwordEnv] : undefined;
  const credentials = await ensureDemoRecorder(auth, db, demoUser.email, password || DEFAULT_PASSWORD);

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
  });

  let screenshotPath = null;
  try {
    const context = await browser.newContext({
      locale: mapLocale(scenario.locale),
      viewport: { width: 1440, height: 960 },
    });
    context.setDefaultTimeout(30000);
    const page = await context.newPage();

    const loginRoute = demoUser.loginRoute || '/login';
    await page.goto(`${contract.localBaseUrl}${loginRoute}`, { waitUntil: 'domcontentloaded' });
    await page.locator('#email').fill(credentials.email);
    await page.locator('#password').fill(credentials.password);
    await Promise.all([
      page.waitForURL(/\/demo\/dashboard(?:$|\?)/, { timeout: 30000 }),
      page.getByRole('button', { name: /Acceder|Accedir/i }).click(),
    ]);

    await page.goto(`${contract.localBaseUrl}${scenario.initialRoute}`, { waitUntil: 'domcontentloaded' });
    await page.waitForURL(new RegExp(`${scenario.initialRoute.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:$|\\?)`), {
      timeout: 30000,
    });

    const selectorChecks = [];
    for (const entry of selectors.critical) {
      const locator = page.locator(entry.selector).first();
      try {
        await locator.waitFor({ state: 'visible', timeout: 10000 });
        selectorChecks.push({
          id: entry.id,
          ok: true,
          selector: entry.selector,
        });
      } catch (error) {
        selectorChecks.push({
          id: entry.id,
          ok: false,
          selector: entry.selector,
          error: error instanceof Error ? error.message : String(error),
        });
        if (entry.required !== false) {
          throw new Error(`Selector crític no visible: ${entry.id}`);
        }
      }
    }

    screenshotPath = path.join(outputDir, `${pieceId}.preflight.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });

    const summary = {
      project: contract.productSlug,
      pieceId,
      status: 'PASS',
      checkedAt: new Date().toISOString(),
      route: scenario.initialRoute,
      screenshotPath,
      http: {
        localBaseUrl: baseUrlCheck,
        seedEndpoint: seedEndpointCheck,
      },
      selectors: selectorChecks,
    };

    fs.writeFileSync(
      path.join(outputDir, 'summa-video-studio-preflight.json'),
      JSON.stringify(summary, null, 2)
    );
  } finally {
    await browser.close();
  }

  console.log(JSON.stringify({
    ok: true,
    pieceId,
    screenshotPath,
  }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
