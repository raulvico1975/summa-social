#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

import { chromium } from 'playwright';

const BASE_URL = process.env.DEMO_BASE_URL || 'http://localhost:9002/demo';
const EMAIL = process.env.DEMO_RECORDER_EMAIL || 'demo.recorder@summasocial.local';
const PASSWORD = process.env.DEMO_RECORDER_PASSWORD || 'DemoRecorder!2026';
const OUTPUT_DIR = path.join(process.cwd(), 'output', 'playwright', 'dashboard-control-demo');
const VIEWPORT = { width: 1920, height: 1080 };

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function resetDir(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
  ensureDir(dirPath);
}

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: 'pipe',
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || `${command} failed`);
  }
}

function findFirstFile(dirPath, extension) {
  if (!fs.existsSync(dirPath)) return null;
  const match = fs.readdirSync(dirPath).find((name) => name.toLowerCase().endsWith(extension));
  return match ? path.join(dirPath, match) : null;
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForDashboard(page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForFunction(() => {
    const text = document.body?.innerText || '';
    return text.includes('Compartir resum') || text.includes('Compartir resumen');
  }, null, { timeout: 60000 });
}

async function login(page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('#email').fill(EMAIL);
  await page.locator('#password').fill(PASSWORD);
  await page.getByRole('button', { name: /Acceder|Accedir/i }).click();
  await Promise.race([
    page.waitForURL(/\/demo\/dashboard(?:$|\?)/, { timeout: 60000 }),
    waitForDashboard(page),
  ]);
  await waitForDashboard(page);
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
      [data-sonner-toaster],
      [role="status"],
      div[class*="fixed bottom-6 right-6 z-50"],
      div[class*="fixed bottom-6 left-4 z-50"] {
        display: none !important;
      }
    `,
  }).catch(() => {});
}

async function screenshot(page, filename) {
  await page.screenshot({
    path: path.join(OUTPUT_DIR, filename),
    fullPage: false,
    animations: 'disabled',
  });
}

async function main() {
  resetDir(OUTPUT_DIR);
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: VIEWPORT, locale: 'ca-ES', acceptDownloads: true });
  const page = await context.newPage();
  const previewTmpDir = path.join(OUTPUT_DIR, 'pdf-preview');

  try {
    await context.addCookies([
      {
        name: 'sidebar_state',
        value: 'false',
        url: 'http://localhost:9002',
        sameSite: 'Lax',
      },
    ]);

    await login(page);
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await waitForDashboard(page);
    await hideNoise(page);
    await page.keyboard.press('Escape').catch(() => {});
    await page.mouse.move(VIEWPORT.width * 0.5, 40);
    await sleep(1600);
    await screenshot(page, 'dashboard-start.png');

    const yearCombo = page.getByRole('combobox').first();
    await yearCombo.click();
    await sleep(450);
    const yearOption = page.getByRole('option', { name: /Any|Año/i }).first();
    if (await yearOption.isVisible().catch(() => false)) {
      await yearOption.click();
      await sleep(1500);
    }
    await screenshot(page, 'dashboard-overview.png');

    const shareButton = page.getByRole('button', { name: /Compartir resum|Compartir resumen/i }).first();
    await shareButton.click();
    const dialog = page.getByRole('dialog').first();
    await dialog.waitFor({ state: 'visible', timeout: 30000 });
    await sleep(1400);
    await screenshot(page, 'dashboard-share-summary.png');

    const pdfButton = dialog.getByRole('button', { name: /Exportar PDF|Exporter PDF/i }).first();
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
    await pdfButton.click();
    const download = await downloadPromise;
    const pdfPath = path.join(OUTPUT_DIR, download.suggestedFilename());
    await download.saveAs(pdfPath);

    resetDir(previewTmpDir);
    run('qlmanage', ['-t', '-s', '2200', '-o', previewTmpDir, pdfPath]);
    const previewPath = findFirstFile(previewTmpDir, '.png');
    if (previewPath) {
      fs.copyFileSync(previewPath, path.join(OUTPUT_DIR, 'dashboard-share-pdf-preview.png'));
    }

    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'recording-summary.json'),
      JSON.stringify(
        {
          scenario: 'dashboard-control-demo',
          mode: 'screenshots-only',
          createdAt: new Date().toISOString(),
        },
        null,
        2
      )
    );
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

await main();
