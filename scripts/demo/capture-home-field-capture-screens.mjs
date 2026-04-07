#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

import { chromium } from 'playwright';
import { getBlockVideoPreset } from './video-block-standards.mjs';

const BASE_URL = process.env.DEMO_BASE_URL || 'http://localhost:9002/demo';
const EMAIL = process.env.DEMO_RECORDER_EMAIL || 'demo.recorder@summasocial.local';
const PASSWORD = process.env.DEMO_RECORDER_PASSWORD || 'DemoRecorder!2026';
const OUTPUT_DIR = path.join(process.cwd(), 'output', 'playwright', 'field-capture-home');
const RECEIPT_PATH = path.join(
  process.cwd(),
  'public',
  'visuals',
  'functionalities',
  'expenses',
  'optimized',
  'expenses-feature-poster-ca.png'
);
const BLOCK_VIDEO_PRESET = getBlockVideoPreset();
const DESKTOP_VIEWPORT = BLOCK_VIDEO_PRESET.captureViewport;
const MOBILE_VIEWPORT = { width: 430, height: 932 };
const EXPENSE_CONCEPT = 'Coordinacio terreny Thies Zeta';
const EXPENSE_AMOUNT = '83.50';

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function resetDir(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
  ensureDir(dirPath);
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForAppIdle(page, ms = 1200) {
  await page.waitForLoadState('domcontentloaded');
  await sleep(ms);
}

async function hideNoise(page) {
  await page.addStyleTag({
    content: `
      [data-next-badge-root],
      nextjs-portal,
      #__next-build-watcher,
      button[aria-label="Open Next.js Dev Tools"],
      button[aria-label="Assistent"],
      button[aria-label="Assistant"],
      [data-radix-toast-viewport],
      [data-sonner-toaster]:not(:has(*)),
      [role="status"]:empty,
      div[class*="fixed bottom-6 right-6 z-50"],
      div[class*="fixed bottom-6 left-4 z-50"] {
        display: none !important;
      }
    `,
  }).catch(() => {});
}

async function login(page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('#email').fill(EMAIL);
  await page.locator('#password').fill(PASSWORD);
  await Promise.all([
    page.waitForURL(/\/demo\/dashboard(?:$|\?)/, { timeout: 30000 }),
    page.getByRole('button', { name: /Acceder|Accedir/i }).click(),
  ]);
  await waitForAppIdle(page);
}

async function createStorageState(browser) {
  const context = await browser.newContext({ viewport: DESKTOP_VIEWPORT, locale: 'ca-ES' });
  await context.addCookies([
    {
      name: 'sidebar_state',
      value: 'false',
      url: 'http://localhost:9002',
      sameSite: 'Lax',
    },
  ]);

  const page = await context.newPage();
  await login(page);

  const storageStatePath = path.join(OUTPUT_DIR, 'storage-state.json');
  await context.storageState({ path: storageStatePath });
  await context.close();

  return storageStatePath;
}

async function captureMobileScreens(browser, storageStatePath) {
  const context = await browser.newContext({
    viewport: MOBILE_VIEWPORT,
    locale: 'ca-ES',
    storageState: storageStatePath,
  });
  const page = await context.newPage();

  try {
    await page.goto(`${BASE_URL.replace('/demo', '')}/demo/quick-expense`, { waitUntil: 'domcontentloaded' });
    await waitForAppIdle(page, 1600);
    await hideNoise(page);

    const fileInput = page.locator('input[type="file"]').nth(1);
    await fileInput.setInputFiles(RECEIPT_PATH);
    await page.getByText('expenses-feature-poster-ca.png').waitFor({ state: 'visible', timeout: 30000 });
    await sleep(1200);

    await page.locator('#amount').fill(EXPENSE_AMOUNT);
    await page.locator('#concept').fill(EXPENSE_CONCEPT);
    await sleep(500);

    await page.screenshot({
      path: path.join(OUTPUT_DIR, 'field-capture-mobile-ready.png'),
      fullPage: false,
      animations: 'disabled',
    });

    await page.getByRole('button', { name: /Guardar despesa/i }).click();
    await page.getByText('Despesa guardada', { exact: true }).waitFor({ state: 'visible', timeout: 30000 });
    await sleep(500);

    await page.screenshot({
      path: path.join(OUTPUT_DIR, 'field-capture-mobile-saved.png'),
      fullPage: false,
      animations: 'disabled',
    });
  } finally {
    await context.close().catch(() => {});
  }
}

async function captureDesktopRegistered(browser, storageStatePath) {
  const context = await browser.newContext({
    viewport: DESKTOP_VIEWPORT,
    locale: 'ca-ES',
    storageState: storageStatePath,
  });
  const page = await context.newPage();

  try {
    await context.addCookies([
      {
        name: 'sidebar_state',
        value: 'false',
        url: 'http://localhost:9002',
        sameSite: 'Lax',
      },
    ]);

    await page.goto(`${BASE_URL}/dashboard/project-module/expenses`, { waitUntil: 'domcontentloaded' });
    await waitForAppIdle(page, 1800);
    await hideNoise(page);

    await page.getByRole('button', { name: /Terreny/i }).click();
    await sleep(800);

    const searchInput = page.locator(
      'input[placeholder*="Cerca"], input[placeholder*="Buscar"], input[placeholder*="Search"]'
    ).first();
    await searchInput.fill(EXPENSE_CONCEPT);
    await sleep(1200);

    const row = page.locator('tbody tr').filter({ hasText: EXPENSE_CONCEPT }).first();
    await row.waitFor({ state: 'visible', timeout: 30000 });
    await row.scrollIntoViewIfNeeded();
    await sleep(600);

    await page.screenshot({
      path: path.join(OUTPUT_DIR, 'field-capture-desktop-registered.png'),
      fullPage: false,
      animations: 'disabled',
    });

    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'recording-summary.json'),
      JSON.stringify(
        {
          scenario: 'field-capture-home',
          concept: EXPENSE_CONCEPT,
          amount: EXPENSE_AMOUNT,
          createdAt: new Date().toISOString(),
        },
        null,
        2
      )
    );
  } finally {
    await context.close().catch(() => {});
  }
}

async function main() {
  resetDir(OUTPUT_DIR);

  if (!fs.existsSync(RECEIPT_PATH)) {
    throw new Error(`No s'ha trobat el comprovant demo a ${RECEIPT_PATH}`);
  }

  const browser = await chromium.launch({ channel: 'chrome', headless: true });

  try {
    const storageStatePath = await createStorageState(browser);
    await captureMobileScreens(browser, storageStatePath);
    await captureDesktopRegistered(browser, storageStatePath);
  } finally {
    await browser.close().catch(() => {});
  }
}

await main();
