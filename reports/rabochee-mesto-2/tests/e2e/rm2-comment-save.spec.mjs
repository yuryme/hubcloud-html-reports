import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveEdgeExecutablePath() {
  const candidates = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return '';
}

async function isServerReady(url) {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch (_) {
    return false;
  }
}

async function ensureDevServer(reportUrl) {
  const rootDir = path.resolve(process.cwd(), '..', '..');
  const scriptPath = path.join(rootDir, 'dev-server.js');
  if (await isServerReady(reportUrl)) {
    return { started: false, proc: null };
  }

  const proc = spawn('node', [scriptPath], {
    cwd: rootDir,
    stdio: 'ignore',
    windowsHide: true
  });

  for (let i = 0; i < 40; ++i) {
    if (await isServerReady(reportUrl)) {
      return { started: true, proc };
    }
    await delay(500);
  }

  try { proc.kill(); } catch (_) {}
  throw new Error('Dev server did not start in time');
}

async function waitForRows(page) {
  await page.waitForFunction(() => document.querySelectorAll('.tab-panel.is-active tbody tr[title]').length > 0, { timeout: 15000 });
}

async function run() {
  const reportUrl = 'http://127.0.0.1:8000/reports/rabochee-mesto-2/sandbox.html?mode=mock';
  const server = await ensureDevServer(reportUrl);
  const edgePath = resolveEdgeExecutablePath();
  let browser;

  const captured = [];
  const runtimeErrors = [];

  try {
    browser = await chromium.launch({
      headless: true,
      executablePath: edgePath || undefined
    });

    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    page.on('pageerror', (error) => runtimeErrors.push(String(error && error.message ? error.message : error)));
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        runtimeErrors.push(msg.text());
      }
    });

    await page.route('**/api/v1/workflowinner/await/', async (route) => {
      const request = route.request();
      captured.push({
        method: request.method(),
        postData: request.postData() || ''
      });
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ isOK: true })
      });
    });

    await page.goto(reportUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForRows(page);

    await page.locator('.tab-panel.is-active .inline-editor-display').first().click();
    const expenseInput = page.locator('.tab-panel.is-active .inline-editor-input').first();
    await expenseInput.fill('comment-enter-expense');
    await expenseInput.press('Enter');

    await page.locator('.tabs .tab-button').nth(2).click();
    await page.waitForSelector('.kpi-table');
    await page.locator('.kpi-table .inline-editor-display').first().click();
    const kpiInput = page.locator('.kpi-inline-editor-input').first();
    await kpiInput.fill('comment-enter-kpi');
    await kpiInput.press('Enter');

    await page.waitForTimeout(500);

    var filteredRuntimeErrors = runtimeErrors.filter((message) => !/404/i.test(message));
    assert(filteredRuntimeErrors.length === 0, `Unexpected runtime errors: ${filteredRuntimeErrors.join(' | ')}`);

    // Option 2 contract: in mode=mock save is a deterministic no-op.
    // Network request is optional; mandatory criteria are: no runtime crash + stable user feedback.
    var toasts = await page.$$eval('.toast span', (elements) => elements.map((el) => String(el.textContent || '').trim()));
    assert(toasts.some((text) => text.indexOf('Комментарий отправлен в процесс.') >= 0), 'Expected expenses success toast is missing');
    assert(toasts.some((text) => text.indexOf('Комментарий КП отправлен в процесс.') >= 0), 'Expected KPI success toast is missing');

    if (captured.length > 0) {
      console.log('rm2-comment-save: note: mock mode produced request count = ' + captured.length);
    }

    await context.close();
    console.log('rm2-comment-save: PASS');
  } finally {
    if (browser) {
      await browser.close();
    }
    if (server.started && server.proc) {
      try { server.proc.kill(); } catch (_) {}
    }
  }
}

run().catch((error) => {
  console.error('rm2-comment-save: FAIL');
  console.error(error && error.stack ? error.stack : String(error));
  process.exit(1);
});
