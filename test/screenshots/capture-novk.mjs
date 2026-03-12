/**
 * Capture screenshots WITHOUT virtual keyboard to test the default layout.
 */
import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, 'output');
mkdirSync(outDir, { recursive: true });

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto('http://localhost:3000/demo/', { waitUntil: 'networkidle0' });
  await page.waitForSelector('canvas.retroterm-canvas');
  await new Promise(r => setTimeout(r, 500));

  // Run a test (NO virtual keyboard)
  await page.select('#test-select', 'charsets');
  await page.click('#run-test');
  await new Promise(r => setTimeout(r, 500));

  // Default - no VK
  await page.screenshot({ path: join(outDir, 'novk-default.png'), fullPage: false });
  console.log('Captured novk-default.png');

  // Now toggle VK on
  await page.click('#vk-toggle');
  await new Promise(r => setTimeout(r, 300));
  await page.screenshot({ path: join(outDir, 'novk-then-vk.png'), fullPage: false });
  console.log('Captured novk-then-vk.png');

  // Toggle VK back off
  await page.click('#vk-toggle');
  await new Promise(r => setTimeout(r, 300));
  await page.screenshot({ path: join(outDir, 'novk-vk-off-again.png'), fullPage: false });
  console.log('Captured novk-vk-off-again.png');

  await browser.close();
  console.log('\nDone');
}

run().catch(err => { console.error(err); process.exit(1); });
