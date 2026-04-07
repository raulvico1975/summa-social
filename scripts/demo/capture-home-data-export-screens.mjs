#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';

const ROOT = process.cwd();
const BASE_URL = process.env.DEMO_BASE_URL || 'http://localhost:9002/demo';
const EMAIL = process.env.DEMO_RECORDER_EMAIL || 'demo.recorder@summasocial.local';
const PASSWORD = process.env.DEMO_RECORDER_PASSWORD || 'DemoRecorder!2026';
const OUTPUT_DIR = path.join(ROOT, 'output', 'playwright', 'data-export-home');
const PDF_PATH = path.join(OUTPUT_DIR, 'data-export-summary.pdf');
const SHARE_SUMMARY_SCREEN = path.join(OUTPUT_DIR, 'data-export-share-summary.png');
const PDF_PAGE_SCREEN = path.join(OUTPUT_DIR, 'data-export-pdf-page.png');
const PDF_VIEWER_SCREEN = path.join(OUTPUT_DIR, 'data-export-pdf-viewer.png');
const RECORDING_SUMMARY = path.join(OUTPUT_DIR, 'recording-summary.json');

function resetDir(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
  fs.mkdirSync(dirPath, { recursive: true });
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
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

async function waitForDashboard(page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForFunction(() => {
    const body = document.body?.innerText || '';
    const euroMatches = body.match(/\d{1,3}(?:\.\d{3})*,\d{2}\s€/g) || [];
    return body.includes('Compartir resum') && body.includes('Obligacions fiscals') && euroMatches.length >= 6;
  }, null, { timeout: 30000 });
}

async function login(page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('#email').fill(EMAIL);
  await page.locator('#password').fill(PASSWORD);
  await Promise.all([
    page.waitForURL(/\/demo\/dashboard(?:$|\?)/, { timeout: 30000 }),
    page.getByRole('button', { name: /Acceder|Accedir/i }).click(),
  ]);
  await waitForDashboard(page);
}

async function main() {
  resetDir(OUTPUT_DIR);

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({
    acceptDownloads: true,
    viewport: { width: 1920, height: 1080 },
    locale: 'ca-ES',
  });

  try {
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
    await page.keyboard.press('Escape').catch(() => {});
    await page.mouse.move(960, 40);
    await sleep(1200);
    await hideNoise(page);

    await page.getByRole('button', { name: /Compartir resum|Compartir resumen/i }).evaluate((el) => el.click());
    const shareDialog = page.getByRole('dialog');
    await shareDialog.waitFor({ state: 'visible', timeout: 30000 });
    await sleep(1200);

    await page.screenshot({
      path: SHARE_SUMMARY_SCREEN,
      fullPage: false,
      animations: 'disabled',
    });

    const downloadPromise = page.waitForEvent('download');
    await shareDialog.getByRole('button', { name: /Exportar PDF/i }).evaluate((el) => el.click());
    const download = await downloadPromise;
    await download.saveAs(PDF_PATH);

    run('qlmanage', ['-t', '-s', '2000', '-o', OUTPUT_DIR, PDF_PATH]);
    const quickLookOutput = path.join(OUTPUT_DIR, `${path.basename(PDF_PATH)}.png`);
    if (fs.existsSync(quickLookOutput)) {
      fs.renameSync(quickLookOutput, PDF_PAGE_SCREEN);
    }

    const viewer = await context.newPage();
    await viewer.setViewportSize({ width: 1600, height: 1200 });
    await viewer.goto(`file://${PDF_PATH}`);
    await sleep(2200);

    await viewer.screenshot({
      path: PDF_VIEWER_SCREEN,
      fullPage: false,
      animations: 'disabled',
    });

    fs.writeFileSync(
      RECORDING_SUMMARY,
      JSON.stringify(
        {
          scenario: 'data-export-home',
          createdAt: new Date().toISOString(),
          pdfPath: PDF_PATH,
          shareSummaryScreenshot: SHARE_SUMMARY_SCREEN,
          pdfPageScreenshot: PDF_PAGE_SCREEN,
          pdfViewerScreenshot: PDF_VIEWER_SCREEN,
          pdfSuggestedFilename: download.suggestedFilename(),
        },
        null,
        2
      )
    );

    console.log(`[capture-home-data-export-screens] PDF: ${PDF_PATH}`);
    console.log(`[capture-home-data-export-screens] Screenshot: ${PDF_VIEWER_SCREEN}`);
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

await main();
