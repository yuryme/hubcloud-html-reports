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
  const alreadyReady = await isServerReady(reportUrl);
  if (alreadyReady) {
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

  try {
    proc.kill();
  } catch (_) {
    // no-op
  }
  throw new Error('Dev server did not start in time');
}

async function waitForRows(page) {
  await page.waitForFunction(() => {
    const rows = document.querySelectorAll('.tab-panel.is-active tbody tr[title]');
    return rows.length > 0;
  }, { timeout: 15000 });
}

async function run() {
  console.log('rm2-smoke: start');

  const reportUrl = 'http://127.0.0.1:8000/reports/rabochee-mesto-2/sandbox.html?mode=mock';
  const server = await ensureDevServer(reportUrl);
  const edgePath = resolveEdgeExecutablePath();
  let browser;

  try {
    browser = await chromium.launch({
      headless: true,
      executablePath: edgePath || undefined
    });

    const context = await browser.newContext({
      acceptDownloads: true,
      viewport: { width: 1440, height: 900 }
    });
    const page = await context.newPage();

    await page.goto(reportUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForRows(page);

    await page.locator('.tabs .tab-button').nth(1).click();
    await page.waitForSelector('.summary-by-item-table');
    await page.locator('.tabs .tab-button').nth(2).click();
    await page.waitForSelector('.kpi-table');
    await page.locator('.tabs .tab-button').nth(0).click();
    await waitForRows(page);

    const orderSelect = page.locator('.settings-filters select').nth(0);
    const beforeCount = await page.locator('.tab-panel.is-active tbody tr[title]').count();
    await orderSelect.selectOption({ index: 1 });
    await waitForRows(page);
    const afterCount = await page.locator('.tab-panel.is-active tbody tr[title]').count();
    assert(afterCount > 0, 'Order filter should keep at least one row');
    assert(afterCount <= beforeCount, 'Order filter should not increase row count');
    await orderSelect.selectOption('');
    await waitForRows(page);

    await page.locator('.tab-panel.is-active .inline-editor-display').first().click();
    const expenseInput = page.locator('.tab-panel.is-active .inline-editor-input').first();
    await expenseInput.fill('tmp comment');
    await expenseInput.press('Escape');
    await page.waitForTimeout(150);
    assert((await page.locator('.tab-panel.is-active .inline-editor-input').count()) === 0, 'Expenses inline editor should close on Escape');

    await page.locator('.tabs .tab-button').nth(2).click();
    await page.waitForSelector('.kpi-table');
    await page.locator('.kpi-table .inline-editor-display').first().click();
    const kpiInput = page.locator('.kpi-inline-editor-input').first();
    await kpiInput.fill('tmp kpi comment');
    await kpiInput.press('Escape');
    await page.waitForTimeout(150);
    assert((await page.locator('.kpi-inline-editor-input').count()) === 0, 'KPI inline editor should close on Escape');

    await page.locator('.tabs .tab-button').nth(2).click();
    await page.waitForSelector('.kpi-table');
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
    await page.click('.excel-btn');
    await page.waitForSelector('.excel-preview-modal');
    await page.waitForSelector('.excel-preview-modal th:has-text("Номер Заказа")');
    await page.click('.excel-preview-download-btn');
    const download = await downloadPromise;
    const fileName = download.suggestedFilename();
    assert(/\.xlsx$/i.test(fileName), 'Export should produce xlsx file');
    assert(fileName.indexOf('po_kp_') === 0, 'Export file name should match active KPI tab');

    await context.close();
    console.log('rm2-smoke: PASS');
  } finally {
    if (browser) {
      await browser.close();
    }
    if (server.started && server.proc) {
      try {
        server.proc.kill();
      } catch (_) {
        // no-op
      }
    }
  }
}

run().catch((error) => {
  console.error('rm2-smoke: FAIL');
  console.error(error && error.stack ? error.stack : String(error));
  process.exit(1);
});
