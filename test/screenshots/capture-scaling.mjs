/**
 * Capture screenshots to diagnose scaling issues.
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

  // Screenshot 1: Default VT100
  await page.screenshot({ path: join(outDir, 'scale-vt100-default.png'), fullPage: false });
  console.log('Captured scale-vt100-default.png');

  // Get canvas dimensions
  const canvasInfo = await page.evaluate(() => {
    const c = document.querySelector('canvas.retroterm-canvas');
    if (!c) return null;
    const rect = c.getBoundingClientRect();
    return {
      canvasWidth: c.width,
      canvasHeight: c.height,
      cssWidth: rect.width,
      cssHeight: rect.height,
      style: c.style.cssText,
      className: c.className,
      containerWidth: c.parentElement?.clientWidth,
      containerHeight: c.parentElement?.clientHeight,
    };
  });
  console.log('VT100 canvas info:', JSON.stringify(canvasInfo, null, 2));

  // Run echo test to get some content
  await page.select('#test-select', 'echo');
  await page.click('#run-test');
  await new Promise(r => setTimeout(r, 300));
  await page.screenshot({ path: join(outDir, 'scale-vt100-echo.png'), fullPage: false });
  console.log('Captured scale-vt100-echo.png');

  // Switch to TDV2200
  await page.select('#emulator-type', 'tdv2200');
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: join(outDir, 'scale-tdv2200.png'), fullPage: false });

  const tdvInfo = await page.evaluate(() => {
    const c = document.querySelector('canvas.retroterm-canvas');
    if (!c) return null;
    const rect = c.getBoundingClientRect();
    return {
      canvasWidth: c.width,
      canvasHeight: c.height,
      cssWidth: rect.width,
      cssHeight: rect.height,
      style: c.style.cssText,
      className: c.className,
    };
  });
  console.log('TDV2200 canvas info:', JSON.stringify(tdvInfo, null, 2));

  // Run charsets test on TDV2200
  await page.select('#test-select', 'charsets');
  await page.click('#run-test');
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: join(outDir, 'scale-tdv2200-charsets.png'), fullPage: false });
  console.log('Captured scale-tdv2200-charsets.png');

  // Switch to TDV2215
  await page.select('#emulator-type', 'tdv2215');
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: join(outDir, 'scale-tdv2215.png'), fullPage: false });

  const tdv15Info = await page.evaluate(() => {
    const c = document.querySelector('canvas.retroterm-canvas');
    if (!c) return null;
    const rect = c.getBoundingClientRect();
    return {
      canvasWidth: c.width,
      canvasHeight: c.height,
      cssWidth: rect.width,
      cssHeight: rect.height,
      style: c.style.cssText,
      className: c.className,
    };
  });
  console.log('TDV2215 canvas info:', JSON.stringify(tdv15Info, null, 2));

  await browser.close();
  console.log('\nDone');
}

run().catch(err => { console.error(err); process.exit(1); });
