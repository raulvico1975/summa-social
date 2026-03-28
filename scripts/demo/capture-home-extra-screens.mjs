#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { chromium } from 'playwright';

const DEFAULT_BASE_URL = 'http://localhost:9002/demo';
const DEFAULT_OUTPUT_DIR = path.join(process.cwd(), 'output', 'playwright', 'home-extra-screens');
const DEFAULT_EMAIL = 'demo.recorder@summasocial.local';
const DEFAULT_PASSWORD = 'DemoRecorder!2026';
const DEMO_PROJECT_ID = 'demo_project_00';
const DESKTOP_VIEWPORT = { width: 1440, height: 960 };
const MOBILE_VIEWPORT = { width: 430, height: 932 };
const PRESENTATION_SCALE = 0.92;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseArg(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function resetDir(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
  ensureDir(dirPath);
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

async function waitForAppIdle(page) {
  await page.waitForLoadState('domcontentloaded');
  await sleep(1000);
}

async function setStablePresentation(context, page, viewport) {
  await context.addCookies([
    {
      name: 'sidebar_state',
      value: 'false',
      url: new URL(BASE_URL).origin,
      sameSite: 'Lax',
    },
  ]);

  await page.setViewportSize(viewport);

  if (viewport.width >= 768) {
    await page.evaluate((scale) => {
      document.documentElement.style.zoom = String(scale);
      if (document.body) {
        document.body.style.zoom = String(scale);
      }
      window.scrollTo({ top: 0, behavior: 'instant' });
    }, PRESENTATION_SCALE);
  } else {
    await page.evaluate(() => {
      document.documentElement.style.zoom = '1';
      if (document.body) {
        document.body.style.zoom = '1';
      }
      window.scrollTo({ top: 0, behavior: 'instant' });
    });
  }

  await sleep(350);
}

async function clickFirstVisible(page, selectors) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (await locator.count()) {
      await locator.waitFor({ state: 'visible', timeout: 8000 });
      await locator.click();
      return true;
    }
  }

  return false;
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

async function captureDonorImportModal(page) {
  await page.goto(`${BASE_URL}/dashboard/donants`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: /Donants|Donantes/i }).waitFor({ state: 'visible', timeout: 30000 });
  await waitForAppIdle(page);
  await setStablePresentation(page.context(), page, DESKTOP_VIEWPORT);

  const clicked = await clickFirstVisible(page, [
    'button[title*="Import"]',
    'button[title*="import"]',
  ]);
  if (!clicked) {
    throw new Error('No s ha trobat el botó d’importació de donants.');
  }

  const dialog = page.getByRole('dialog').first();
  await dialog.waitFor({ state: 'visible', timeout: 30000 });
  await sleep(1200);
  await page.screenshot({
    path: path.join(OUTPUT_DIR, 'donors-import-modal.png'),
    fullPage: false,
  });
}

async function captureProjectBudget(page) {
  await page.goto(`${BASE_URL}/dashboard/project-module/projects/${DEMO_PROJECT_ID}/budget`, {
    waitUntil: 'domcontentloaded',
  });
  await page.getByRole('heading', { name: /Gestió Econòmica|Gestion Económica|Gestion Economique|Gestão Económica/i }).waitFor({
    state: 'visible',
    timeout: 30000,
  });
  await waitForAppIdle(page);
  await setStablePresentation(page.context(), page, DESKTOP_VIEWPORT);
  await sleep(800);

  await page.screenshot({
    path: path.join(OUTPUT_DIR, 'project-budget.png'),
    fullPage: false,
  });

  const exportOpened = await clickFirstVisible(page, [
    'button[title*="Exportar"]',
    'button[title*="Excel"]',
  ]);
  if (!exportOpened) {
    throw new Error('No s ha trobat el botó d’exportació del projecte.');
  }

  const dialog = page.getByRole('dialog').first();
  await dialog.waitFor({ state: 'visible', timeout: 30000 });
  await sleep(800);
  await page.screenshot({
    path: path.join(OUTPUT_DIR, 'project-export-dialog.png'),
    fullPage: false,
  });

  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'hidden', timeout: 30000 });
  await sleep(400);

  const expensesOpened = await clickFirstVisible(page, [
    'button[title*="Veure despeses"]',
    'button[title*="despeses"]',
    'button[title*="gastos"]',
  ]);
  if (!expensesOpened) {
    throw new Error('No s ha trobat el botó de despeses del projecte.');
  }

  await page.waitForURL(/\/dashboard\/project-module\/expenses/, { timeout: 30000 });
  await waitForAppIdle(page);
  await setStablePresentation(page.context(), page, DESKTOP_VIEWPORT);
  await sleep(800);
  await page.screenshot({
    path: path.join(OUTPUT_DIR, 'project-expenses.png'),
    fullPage: false,
  });
}

async function captureQuickExpense(page) {
  await setStablePresentation(page.context(), page, MOBILE_VIEWPORT);
  await page.goto(`${BASE_URL.replace('/demo', '')}/demo/quick-expense`, {
    waitUntil: 'domcontentloaded',
  });
  await page.getByText(/Foto|Import|Guardar|Guardar gasto|Guardar despesa/i).first().waitFor({
    state: 'visible',
    timeout: 30000,
  });
  await waitForAppIdle(page);
  await sleep(800);
  await page.screenshot({
    path: path.join(OUTPUT_DIR, 'quick-expense-mobile.png'),
    fullPage: false,
  });
}

async function captureReportsClosingBundle(page) {
  await page.goto(`${BASE_URL}/dashboard/informes`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: /Informes|Reportes/i }).waitFor({ state: 'visible', timeout: 30000 });
  await waitForAppIdle(page);
  await setStablePresentation(page.context(), page, DESKTOP_VIEWPORT);

  const clicked = await clickFirstVisible(page, [
    'button:has-text("Generar paquet")',
    'button:has-text("Generar paquete")',
    'button:has-text("Paquet de tancament")',
  ]);
  if (!clicked) {
    throw new Error('No s’ha trobat el CTA del paquet de tancament.');
  }

  const dialog = page.getByRole('dialog').first();
  await dialog.waitFor({ state: 'visible', timeout: 30000 });
  await sleep(1000);
  await page.screenshot({
    path: path.join(OUTPUT_DIR, 'closing-bundle-dialog.png'),
    fullPage: false,
  });

  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'hidden', timeout: 30000 });
}

async function captureSepaCollection(page) {
  await page.goto(`${BASE_URL}/dashboard/donants/remeses-cobrament`, { waitUntil: 'domcontentloaded' });
  await page.getByText(/Remesa SEPA|SEPA/i).first().waitFor({ state: 'visible', timeout: 30000 });
  await waitForAppIdle(page);
  await setStablePresentation(page.context(), page, DESKTOP_VIEWPORT);
  await sleep(800);
  await page.screenshot({
    path: path.join(OUTPUT_DIR, 'sepa-collection-page.png'),
    fullPage: false,
  });
}

async function captureSettlements(page) {
  await page.goto(`${BASE_URL}/dashboard/movimientos/liquidacions`, { waitUntil: 'domcontentloaded' });
  await page.getByText(/Liquidacions|Liquidaciones|Settlements/i).first().waitFor({
    state: 'visible',
    timeout: 30000,
  });
  await waitForAppIdle(page);
  await setStablePresentation(page.context(), page, DESKTOP_VIEWPORT);
  await sleep(800);
  await page.screenshot({
    path: path.join(OUTPUT_DIR, 'settlements-page.png'),
    fullPage: false,
  });
}

async function captureMovementsStripe(page) {
  await page.goto(`${BASE_URL}/dashboard/movimientos`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: /Moviments/i }).waitFor({ state: 'visible', timeout: 30000 });
  await waitForAppIdle(page);
  await setStablePresentation(page.context(), page, DESKTOP_VIEWPORT);

  const searchInput = page.locator(
    'input[placeholder*="Cercar"], input[placeholder*="Buscar"], input[placeholder*="Search"]'
  ).first();
  await searchInput.waitFor({ state: 'visible', timeout: 30000 });
  await searchInput.fill('Stripe');
  await sleep(1400);

  await page.getByText(/Stripe/i).first().waitFor({ state: 'visible', timeout: 30000 });
  await page.screenshot({
    path: path.join(OUTPUT_DIR, 'movements-stripe.png'),
    fullPage: false,
  });
}

const envDemoPath = path.join(process.cwd(), '.env.demo');
loadEnvFile(envDemoPath);
process.env.APP_ENV = process.env.APP_ENV || 'demo';
process.env.NEXT_PUBLIC_APP_ENV = process.env.NEXT_PUBLIC_APP_ENV || 'demo';

const BASE_URL = parseArg('--base-url') || process.env.DEMO_BASE_URL || DEFAULT_BASE_URL;
const OUTPUT_DIR = parseArg('--output') || DEFAULT_OUTPUT_DIR;
const EMAIL = process.env.DEMO_RECORDER_EMAIL || DEFAULT_EMAIL;
const PASSWORD = process.env.DEMO_RECORDER_PASSWORD || DEFAULT_PASSWORD;

async function main() {
  resetDir(OUTPUT_DIR);

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: false,
    slowMo: 120,
  });

  const context = await browser.newContext({
    viewport: DESKTOP_VIEWPORT,
    locale: 'ca-ES',
  });

  const page = await context.newPage();

  try {
    await login(page);
    await captureDonorImportModal(page);
    await captureProjectBudget(page);
    await captureSepaCollection(page);
    await captureSettlements(page);
    await captureReportsClosingBundle(page);
    await captureMovementsStripe(page);

    const mobilePage = await context.newPage();
    await captureQuickExpense(mobilePage);
    await mobilePage.close();
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
