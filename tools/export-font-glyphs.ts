/**
 * Glyph export tool — generates PNG glyph sheets from TDV font data.
 *
 * Usage: npx tsx tools/export-font-glyphs.ts
 * Output: docs/fonts/exports/*.png
 *
 * Requires: npm install --save-dev canvas
 */

import { createCanvas } from 'canvas';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { FontTDV2200 } from '../src/fonts/FontTDV2200';
import { FontTDV2215 } from '../src/fonts/FontTDV2215';
import { FontBase } from '../src/fonts/FontBase';

const EXPORT_DIR = join(__dirname, '..', 'docs', 'fonts', 'exports');
const SCALE = 4; // Each font pixel = 4x4 screen pixels
const COLS = 16; // 16 columns in the glyph grid
const LABEL_HEIGHT = 14; // Pixel height for hex label above each glyph
const PADDING = 2; // Pixels between glyphs
const BG_COLOR = '#000000';
const FG_COLOR = '#FFFFFF';
const LABEL_COLOR = '#888888';
const GRID_COLOR = '#222222';

interface ExportConfig {
  filename: string;
  font: FontBase;
  fontNum: number;
  startChar: number;
  endChar: number;
  title: string;
}

function renderGlyphSheet(config: ExportConfig): void {
  const { font, fontNum, startChar, endChar, title, filename } = config;
  const charCount = endChar - startChar + 1;
  const rows = Math.ceil(charCount / COLS);

  const fontWidth = font.width;
  const heightToUse = font.heightToUse > 0 ? font.heightToUse : font.height;

  const cellW = fontWidth * SCALE + PADDING * 2;
  const cellH = heightToUse * SCALE + PADDING * 2 + LABEL_HEIGHT;

  const canvasW = COLS * cellW;
  const canvasH = rows * cellH + 24; // Extra space for title

  const canvas = createCanvas(canvasW, canvasH);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Title
  ctx.fillStyle = LABEL_COLOR;
  ctx.font = '12px monospace';
  ctx.fillText(title, 4, 14);

  for (let i = 0; i < charCount; i++) {
    const charCode = startChar + i;
    const col = i % COLS;
    const row = Math.floor(i / COLS);

    const cellX = col * cellW;
    const cellY = row * cellH + 24;

    // Grid line
    ctx.strokeStyle = GRID_COLOR;
    ctx.strokeRect(cellX, cellY, cellW, cellH);

    // Hex label
    ctx.fillStyle = LABEL_COLOR;
    ctx.font = '10px monospace';
    const label = charCode.toString(16).toUpperCase().padStart(2, '0');
    ctx.fillText(label, cellX + PADDING, cellY + 10);

    // Get font bits
    const fontBits = font.getFontBits(charCode, fontNum);
    if (fontBits === null) continue;

    const glyphY = cellY + LABEL_HEIGHT;

    // Render glyph pixels
    ctx.fillStyle = FG_COLOR;
    for (let r = 0; r < heightToUse && r < fontBits.length; r++) {
      const rowBits = fontBits[r];
      if (rowBits === 0) continue;

      for (let c = 0; c < fontWidth; c++) {
        const bitIndex = fontWidth - 1 - c;
        const pixelOn = (rowBits & (1 << bitIndex)) !== 0;

        if (pixelOn) {
          const px = cellX + PADDING + c * SCALE;
          const py = glyphY + PADDING + r * SCALE;
          ctx.fillRect(px, py, SCALE, SCALE);
        }
      }
    }
  }

  const outPath = join(EXPORT_DIR, filename);
  writeFileSync(outPath, canvas.toBuffer('image/png'));
  console.log(`  ${filename} (${charCount} glyphs, ${canvasW}x${canvasH}px)`);
}

function main(): void {
  mkdirSync(EXPORT_DIR, { recursive: true });
  console.log('Exporting TDV font glyph sheets...\n');

  const tdv2200 = new FontTDV2200();
  const tdv2215 = new FontTDV2215();

  // TDV2200 banks
  console.log('TDV2200 (8x16):');

  const tdv2200Configs: ExportConfig[] = [
    {
      filename: 'tdv2200-bank0-ascii.png',
      font: tdv2200, fontNum: 0,
      startChar: 0x20, endChar: 0x7F,
      title: 'TDV2200 Bank 0 — International ASCII (fontNum 0)',
    },
    {
      filename: 'tdv2200-bank2-greek-math.png',
      font: tdv2200, fontNum: 2,
      startChar: 0x00, endChar: 0x7F,
      title: 'TDV2200 Bank 2 — Greek/Math/Graphics I (fontNum 2)',
    },
    {
      filename: 'tdv2200-bank3-subscript.png',
      font: tdv2200, fontNum: 3,
      startChar: 0x00, endChar: 0x7F,
      title: 'TDV2200 Bank 3 — Subscript/Superscript (fontNum 3)',
    },
    {
      filename: 'tdv2200-bank4-control.png',
      font: tdv2200, fontNum: 4,
      startChar: 0x00, endChar: 0x7F,
      title: 'TDV2200 Bank 4 — Control Code Display (fontNum 4)',
    },
    {
      filename: 'tdv2200-variants.png',
      font: tdv2200, fontNum: 0,
      startChar: 0x00, endChar: 0x1F,
      title: 'TDV2200 Variant Characters (ROM positions 0-31)',
    },
  ];

  for (const config of tdv2200Configs) {
    renderGlyphSheet(config);
  }

  // TDV2215 banks
  console.log('\nTDV2215 (9x14):');

  const tdv2215Configs: ExportConfig[] = [
    {
      filename: 'tdv2215-international.png',
      font: tdv2215, fontNum: 0,
      startChar: 0x20, endChar: 0x7F,
      title: 'TDV2215 International ASCII (fontNum 0)',
    },
    {
      filename: 'tdv2215-line-drawing.png',
      font: tdv2215, fontNum: 2,
      startChar: 0x20, endChar: 0x7F,
      title: 'TDV2215 Line Drawing (fontNum 2)',
    },
    {
      filename: 'tdv2215-subscript.png',
      font: tdv2215, fontNum: 3,
      startChar: 0x20, endChar: 0x7F,
      title: 'TDV2215 Subscript/Superscript (fontNum 3)',
    },
    {
      filename: 'tdv2215-control.png',
      font: tdv2215, fontNum: 4,
      startChar: 0x00, endChar: 0x7F,
      title: 'TDV2215 Control Code Display (fontNum 4)',
    },
  ];

  for (const config of tdv2215Configs) {
    renderGlyphSheet(config);
  }

  console.log(`\nDone. Output: ${EXPORT_DIR}`);
}

main();
