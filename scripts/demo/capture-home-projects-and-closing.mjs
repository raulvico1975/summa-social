#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { chromium } from 'playwright';

const BASE_URL = process.env.DEMO_BASE_URL || 'http://localhost:9002/demo';
const EMAIL = process.env.DEMO_RECORDER_EMAIL || 'demo.recorder@summasocial.local';
const PASSWORD = process.env.DEMO_RECORDER_PASSWORD || 'DemoRecorder!2026';
const OUTPUT_DIR = path.join(process.cwd(), 'output', 'playwright', 'home-extra-screens');
const VIEWPORT = { width: 2048, height: 1152 };
const MOBILE_VIEWPORT = { width: 430, height: 932 };

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

async function waitForAppIdle(page) {
  await page.waitForLoadState('domcontentloaded');
  await sleep(1200);
}

async function login(page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('#email').fill(EMAIL);
  await page.locator('#password').fill(PASSWORD);
  await page.getByRole('button', { name: /Acceder|Accedir/i }).click();
  await Promise.race([
    page.waitForURL(/\/demo\/dashboard(?:$|\?)/, { timeout: 60000 }),
    page.getByText(/Dashboard|Donants|Projectes|Moviments/i).first().waitFor({ state: 'visible', timeout: 60000 }),
  ]);
  await waitForAppIdle(page);
}

async function stabilize(page, viewport = VIEWPORT) {
  await page.setViewportSize(viewport);
  await page.context().addCookies([
    {
      name: 'sidebar_state',
      value: 'false',
      url: 'http://localhost:9002',
      sameSite: 'Lax',
    },
  ]);
  await page.addStyleTag({
    content: `
      [data-next-badge-root],
      nextjs-portal,
      #__next-build-watcher,
      button[aria-label="Open Next.js Dev Tools"],
      button[aria-label="Assistent"],
      button[aria-label="Assistant"],
      [data-radix-toast-viewport],
      [data-sonner-toaster],
      [role="status"],
      div[class*="fixed bottom-6 right-6 z-50"],
      div[class*="fixed bottom-6 left-4 z-50"] {
        display: none !important;
      }
    `,
  }).catch(() => {});
  await page.evaluate(() => {
    document.documentElement.style.zoom = '1';
    if (document.body) document.body.style.zoom = '1';
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
  await page.keyboard.press('Escape').catch(() => {});
  await page.mouse.move(viewport.width * 0.5, 40);
  await sleep(1200);
}

async function screenshot(page, filename) {
  await page.screenshot({
    path: path.join(OUTPUT_DIR, filename),
    fullPage: false,
    animations: 'disabled',
  });
}

async function firstVisible(page, selectors) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (await locator.isVisible().catch(() => false)) return locator;
  }
  return null;
}

async function main() {
  resetDir(OUTPUT_DIR);
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: VIEWPORT, locale: 'ca-ES' });
  const page = await context.newPage();

  try {
    await login(page);

    await page.goto(`${BASE_URL}/dashboard/project-module/projects/demo_project_00/budget`, { waitUntil: 'domcontentloaded' });
    await waitForAppIdle(page);
    await stabilize(page);
    await screenshot(page, 'project-budget.png');

    const exportButton = await firstVisible(page, [
      'button[title*="Exportar justificació"]',
      'button[title*="Exportar"]',
    ]);
    if (exportButton) {
      await exportButton.click();
      await page.getByRole('dialog').first().waitFor({ state: 'visible', timeout: 30000 });
      await sleep(1000);
      await screenshot(page, 'project-export-dialog.png');
      await page.keyboard.press('Escape').catch(() => {});
      await sleep(400);
    }

    const expensesButton = await firstVisible(page, [
      'button[title*="Veure despeses"]',
      'button[title*="despeses"]',
      'button[title*="gastos"]',
    ]);
    if (expensesButton) {
      await Promise.all([
        page.waitForURL(/\/dashboard\/project-module\/expenses/, { timeout: 30000 }),
        expensesButton.click(),
      ]);
    } else {
      await page.goto(`${BASE_URL}/dashboard/project-module/expenses`, { waitUntil: 'domcontentloaded' });
    }
    await waitForAppIdle(page);
    await stabilize(page);
    await screenshot(page, 'project-expenses.png');

    const mobilePage = await context.newPage();
    await mobilePage.goto(`${BASE_URL.replace('/demo', '')}/demo/quick-expense`, { waitUntil: 'domcontentloaded' });
    await waitForAppIdle(mobilePage);
    await stabilize(mobilePage, MOBILE_VIEWPORT);
    await screenshot(mobilePage, 'quick-expense-mobile.png');
    await mobilePage.close();

    await page.goto(`${BASE_URL}/dashboard/informes`, { waitUntil: 'domcontentloaded' });
    await waitForAppIdle(page);
    await stabilize(page);
    const closingButton = await firstVisible(page, [
      'button:has-text("Generar paquet")',
      'button:has-text("Generar paquete")',
      'button:has-text("Paquet de tancament")',
    ]);
    if (closingButton) {
      await closingButton.click();
      await page.getByRole('dialog').first().waitFor({ state: 'visible', timeout: 30000 });
      await sleep(1000);
      await screenshot(page, 'closing-bundle-dialog.png');
    }
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

await main()
