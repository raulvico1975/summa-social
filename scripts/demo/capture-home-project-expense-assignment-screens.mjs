#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { chromium } from 'playwright';
import { getBlockVideoPreset } from './video-block-standards.mjs';

const BASE_URL = process.env.DEMO_BASE_URL || 'http://localhost:9002/demo';
const EMAIL = process.env.DEMO_RECORDER_EMAIL || 'demo.recorder@summasocial.local';
const PASSWORD = process.env.DEMO_RECORDER_PASSWORD || 'DemoRecorder!2026';
const OUTPUT_DIR = path.join(process.cwd(), 'output', 'playwright', 'project-expense-assignment-home');
const BLOCK_VIDEO_PRESET = getBlockVideoPreset();
const VIEWPORT = BLOCK_VIDEO_PRESET.captureViewport;

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
  await sleep(1400);
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

async function findCandidateRow(page) {
  const row = page
    .locator('tbody tr')
    .filter({ hasText: /Imputada/ })
    .filter({ hasText: /(?:2|3) proj\./ })
    .first();

  await row.waitFor({ state: 'visible', timeout: 20000 });
  return row;
}

async function main() {
  resetDir(OUTPUT_DIR);
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: VIEWPORT, locale: 'ca-ES' });
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

    await login(page);
    await page.goto(`${BASE_URL}/dashboard/project-module/expenses`, { waitUntil: 'domcontentloaded' });
    await waitForAppIdle(page);
    await hideNoise(page);
    await page.keyboard.press('Escape').catch(() => {});
    await page.mouse.move(VIEWPORT.width * 0.5, 40);
    await sleep(1000);

    const row = await findCandidateRow(page);
    await row.scrollIntoViewIfNeeded();
    await sleep(800);

    await page.screenshot({
      path: path.join(OUTPUT_DIR, 'project-expense-assignment-closed.png'),
      fullPage: false,
      animations: 'disabled',
    });

    const statusBadge = row.getByText(/^Imputada$/).first();
    await statusBadge.click();
    await page.locator('[data-radix-popper-content-wrapper]').filter({ hasText: /€/ }).first().waitFor({
      state: 'visible',
      timeout: 10000,
    });
    await sleep(700);

    await page.screenshot({
      path: path.join(OUTPUT_DIR, 'project-expense-assignment-open.png'),
      fullPage: false,
      animations: 'disabled',
    });

    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'recording-summary.json'),
      JSON.stringify(
        {
          scenario: 'project-expense-assignment-home',
          mode: 'screens',
          captureViewport: `${VIEWPORT.width}x${VIEWPORT.height}`,
          rowText: (await row.textContent())?.replace(/\s+/g, ' ').trim() ?? '',
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
