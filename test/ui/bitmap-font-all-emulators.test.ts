/**
 * Bitmap font rendering tests for all emulator types.
 * Verifies that VT100, TDV2200, and TDV2215 all use bitmap fonts,
 * produce correct font instances, and render glyphs via BitmapFontRenderer.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Terminal } from '../../src/terminal/Terminal';
import { CanvasRenderer } from '../../src/renderer/CanvasRenderer';
import { BitmapFontRenderer } from '../../src/renderer/BitmapFontRenderer';
import { FontVT100 } from '../../src/fonts/FontVT100';
import { FontTDV2200 } from '../../src/fonts/FontTDV2200';
import { FontTDV2215 } from '../../src/fonts/FontTDV2215';

describe('Bitmap font rendering — all emulators', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '400px';
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('VT100 bitmap font', () => {
    it('should use bitmap font by default', () => {
      const term = new Terminal({ rows: 24, cols: 80, emulatorType: 'vt100' });
      term.open(container);
      const renderer = (term as any)._renderer as CanvasRenderer;
      expect(renderer.isBitmapFontActive).toBe(true);
      expect(renderer.bitmapFontRenderer).not.toBeNull();
      term.dispose();
    });

    it('should use FontVT100 class', () => {
      const term = new Terminal({ rows: 24, cols: 80, emulatorType: 'vt100' });
      term.open(container);
      const renderer = (term as any)._renderer as CanvasRenderer;
      expect(renderer.bitmapFontRenderer!.font).toBeInstanceOf(FontVT100);
      term.dispose();
    });

    it('should have 8x10 cell size', () => {
      const term = new Terminal({ rows: 24, cols: 80, emulatorType: 'vt100' });
      term.open(container);
      const renderer = (term as any)._renderer as CanvasRenderer;
      expect(renderer.charWidth).toBe(8);
      expect(renderer.charHeight).toBe(10);
      term.dispose();
    });

    it('canvas dimensions should match 8x10 cell size', () => {
      const term = new Terminal({ rows: 24, cols: 80, emulatorType: 'vt100' });
      term.open(container);
      const renderer = (term as any)._renderer as CanvasRenderer;
      expect(renderer.canvas.width).toBe(8 * 80);
      expect(renderer.canvas.height).toBe(10 * 24);
      term.dispose();
    });

    it('canvas should have retroterm-bitmap class', () => {
      const term = new Terminal({ rows: 24, cols: 80, emulatorType: 'vt100' });
      term.open(container);
      const canvas = container.querySelector('canvas')!;
      expect(canvas.className).toContain('retroterm-bitmap');
      term.dispose();
    });

    it('canvas should have pixelated image rendering', () => {
      const term = new Terminal({ rows: 24, cols: 80, emulatorType: 'vt100' });
      term.open(container);
      const canvas = container.querySelector('canvas')!;
      expect(canvas.style.imageRendering).toBe('pixelated');
      term.dispose();
    });

    it('should render ASCII glyphs via bitmap', () => {
      const renderer = new BitmapFontRenderer(new FontVT100());
      const ctx = {
        fillStyle: '',
        fillRect: vi.fn(),
      } as unknown as CanvasRenderingContext2D;

      // 'A' (0x41) should succeed
      const result = renderer.drawCharacter(ctx, 0x41, 0, 0, 0, 0, '#fff', 8, 10);
      expect(result).toBe(true);
      expect((ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(0);
    });

    it('should have non-empty pixels for A-Z', () => {
      const renderer = new BitmapFontRenderer(new FontVT100());
      for (let c = 0x41; c <= 0x5A; c++) {
        const pixels = renderer.getGlyphPixels(c, 0);
        expect(pixels).not.toBeNull();
        // At least some pixels should be set
        let hasPixels = false;
        for (let r = 0; r < pixels!.length; r++) {
          for (let col = 0; col < pixels![r].length; col++) {
            if (pixels![r][col]) hasPixels = true;
          }
        }
        expect(hasPixels).toBe(true);
      }
    });

    it('should have non-empty pixels for 0-9', () => {
      const renderer = new BitmapFontRenderer(new FontVT100());
      for (let c = 0x30; c <= 0x39; c++) {
        const pixels = renderer.getGlyphPixels(c, 0);
        expect(pixels).not.toBeNull();
        let hasPixels = false;
        for (let r = 0; r < pixels!.length; r++) {
          for (let col = 0; col < pixels![r].length; col++) {
            if (pixels![r][col]) hasPixels = true;
          }
        }
        expect(hasPixels).toBe(true);
      }
    });

    it('should have 10 rows and 8 columns per glyph', () => {
      const renderer = new BitmapFontRenderer(new FontVT100());
      const pixels = renderer.getGlyphPixels(0x41, 0);
      expect(pixels).not.toBeNull();
      expect(pixels!.length).toBe(10);
      expect(pixels![0].length).toBe(8);
    });

    it('space glyph should be empty', () => {
      const renderer = new BitmapFontRenderer(new FontVT100());
      const pixels = renderer.getGlyphPixels(0x20, 0);
      expect(pixels).not.toBeNull();
      let hasPixels = false;
      for (let r = 0; r < pixels!.length; r++) {
        for (let col = 0; col < pixels![r].length; col++) {
          if (pixels![r][col]) hasPixels = true;
        }
      }
      expect(hasPixels).toBe(false);
    });

    it('different letters should have different pixel patterns', () => {
      const renderer = new BitmapFontRenderer(new FontVT100());
      const pixA = renderer.getGlyphPixels(0x41, 0)!;
      const pixB = renderer.getGlyphPixels(0x42, 0)!;
      let differs = false;
      for (let r = 0; r < pixA.length; r++) {
        for (let col = 0; col < pixA[r].length; col++) {
          if (pixA[r][col] !== pixB[r][col]) differs = true;
        }
      }
      expect(differs).toBe(true);
    });

    it('DEC Special Graphics chars (0x01-0x1F) should have populated glyphs', () => {
      const renderer = new BitmapFontRenderer(new FontVT100());
      let populatedCount = 0;
      for (let c = 0x01; c <= 0x1F; c++) {
        const pixels = renderer.getGlyphPixels(c, 0);
        if (pixels) {
          let hasPixels = false;
          for (let r = 0; r < pixels.length; r++) {
            for (let col = 0; col < pixels[r].length; col++) {
              if (pixels[r][col]) hasPixels = true;
            }
          }
          if (hasPixels) populatedCount++;
        }
      }
      // Most special chars should have pixels (diamond, checker, box drawing, etc.)
      expect(populatedCount).toBeGreaterThan(20);
    });
  });

  describe('TDV2200 bitmap font', () => {
    it('should use bitmap font', () => {
      const term = new Terminal({ rows: 24, cols: 80, emulatorType: 'tdv2200' });
      term.open(container);
      const renderer = (term as any)._renderer as CanvasRenderer;
      expect(renderer.isBitmapFontActive).toBe(true);
      expect(renderer.bitmapFontRenderer!.font).toBeInstanceOf(FontTDV2200);
      term.dispose();
    });

    it('should have 8px wide cells', () => {
      const term = new Terminal({ rows: 24, cols: 80, emulatorType: 'tdv2200' });
      term.open(container);
      const renderer = (term as any)._renderer as CanvasRenderer;
      expect(renderer.charWidth).toBe(8);
      term.dispose();
    });

    it('should render ASCII via bitmap', () => {
      const renderer = new BitmapFontRenderer(new FontTDV2200());
      const ctx = {
        fillStyle: '',
        fillRect: vi.fn(),
      } as unknown as CanvasRenderingContext2D;
      const result = renderer.drawCharacter(ctx, 0x41, 0, 0, 0, 0, '#fff', 8, 14);
      expect(result).toBe(true);
    });

    it('should render Graphics I bank (fontNum 2)', () => {
      const renderer = new BitmapFontRenderer(new FontTDV2200());
      const ctx = {
        fillStyle: '',
        fillRect: vi.fn(),
      } as unknown as CanvasRenderingContext2D;
      const result = renderer.drawCharacter(ctx, 0x60, 2, 0, 0, 0, '#fff', 8, 14);
      expect(result).toBe(true);
    });

    it('different banks produce different pixels', () => {
      const renderer = new BitmapFontRenderer(new FontTDV2200());
      const ascii = renderer.getGlyphPixels(0x60, 0);
      const graphI = renderer.getGlyphPixels(0x60, 2);
      expect(ascii).not.toBeNull();
      expect(graphI).not.toBeNull();
      let differs = false;
      for (let r = 0; r < ascii!.length; r++) {
        for (let col = 0; col < ascii![r].length; col++) {
          if (ascii![r][col] !== graphI![r][col]) differs = true;
        }
      }
      expect(differs).toBe(true);
    });
  });

  describe('TDV2215 bitmap font', () => {
    it('should use bitmap font', () => {
      const term = new Terminal({ rows: 24, cols: 80, emulatorType: 'tdv2215' });
      term.open(container);
      const renderer = (term as any)._renderer as CanvasRenderer;
      expect(renderer.isBitmapFontActive).toBe(true);
      expect(renderer.bitmapFontRenderer!.font).toBeInstanceOf(FontTDV2215);
      term.dispose();
    });

    it('should have 9px wide cells', () => {
      const term = new Terminal({ rows: 24, cols: 80, emulatorType: 'tdv2215' });
      term.open(container);
      const renderer = (term as any)._renderer as CanvasRenderer;
      expect(renderer.charWidth).toBe(9);
      term.dispose();
    });

    it('should render ASCII via bitmap', () => {
      const renderer = new BitmapFontRenderer(new FontTDV2215());
      const ctx = {
        fillStyle: '',
        fillRect: vi.fn(),
      } as unknown as CanvasRenderingContext2D;
      const result = renderer.drawCharacter(ctx, 0x41, 0, 0, 0, 0, '#fff', 9, 14);
      expect(result).toBe(true);
    });
  });

  describe('Emulator switching preserves bitmap mode', () => {
    it('switching VT100 -> TDV2200 -> VT100 maintains bitmap font', () => {
      const term = new Terminal({ rows: 24, cols: 80, emulatorType: 'vt100' });
      term.open(container);
      const renderer = (term as any)._renderer as CanvasRenderer;

      expect(renderer.isBitmapFontActive).toBe(true);
      expect(renderer.bitmapFontRenderer!.font).toBeInstanceOf(FontVT100);

      term.setEmulatorType('tdv2200');
      expect(renderer.isBitmapFontActive).toBe(true);
      expect(renderer.bitmapFontRenderer!.font).toBeInstanceOf(FontTDV2200);

      term.setEmulatorType('vt100');
      expect(renderer.isBitmapFontActive).toBe(true);
      expect(renderer.bitmapFontRenderer!.font).toBeInstanceOf(FontVT100);

      term.dispose();
    });

    it('switching TDV2200 -> TDV2215 changes font instance', () => {
      const term = new Terminal({ rows: 24, cols: 80, emulatorType: 'tdv2200' });
      term.open(container);
      const renderer = (term as any)._renderer as CanvasRenderer;

      const first = renderer.bitmapFontRenderer;
      term.setEmulatorType('tdv2215');
      const second = renderer.bitmapFontRenderer;

      expect(second).not.toBe(first);
      expect(second!.font).toBeInstanceOf(FontTDV2215);

      term.dispose();
    });

    it('switching updates canvas dimensions to match new font', () => {
      const term = new Terminal({ rows: 24, cols: 80, emulatorType: 'vt100' });
      term.open(container);
      const renderer = (term as any)._renderer as CanvasRenderer;

      // VT100: 8x10
      expect(renderer.canvas.width).toBe(8 * 80);
      expect(renderer.canvas.height).toBe(10 * 24);

      term.setEmulatorType('tdv2200');
      // TDV2200: 8x14 or 8x16
      const cw = renderer.charWidth;
      const ch = renderer.charHeight;
      expect(renderer.canvas.width).toBe(cw * 80);
      expect(renderer.canvas.height).toBe(ch * 24);
      expect(cw).toBe(8);

      term.dispose();
    });

    it('canvas always has retroterm-bitmap class regardless of emulator', () => {
      const term = new Terminal({ rows: 24, cols: 80, emulatorType: 'vt100' });
      term.open(container);
      const canvas = container.querySelector('canvas')!;

      expect(canvas.className).toContain('retroterm-bitmap');

      term.setEmulatorType('tdv2200');
      expect(canvas.className).toContain('retroterm-bitmap');

      term.setEmulatorType('tdv2215');
      expect(canvas.className).toContain('retroterm-bitmap');

      term.setEmulatorType('vt100');
      expect(canvas.className).toContain('retroterm-bitmap');

      term.dispose();
    });
  });

  describe('VT100 DEC Special Graphics via bitmap font', () => {
    it('ESC(0 writes DEC special chars with correct codepoints in buffer', () => {
      const term = new Terminal({ rows: 24, cols: 80, emulatorType: 'vt100' });
      term.open(container);

      term.write('\x1b(0');
      term.write('lqk'); // top-left, horizontal, top-right
      const emu = term.getEmulator() as any;
      // 'l' maps to 0x250C (box drawing upper left corner)
      expect(emu.buffer.getCellRef(0, 0).codepoint).toBe(0x250C);
      // 'q' maps to 0x2500 (horizontal line)
      expect(emu.buffer.getCellRef(0, 1).codepoint).toBe(0x2500);
      // 'k' maps to 0x2510 (upper right corner)
      expect(emu.buffer.getCellRef(0, 2).codepoint).toBe(0x2510);

      term.dispose();
    });

    it('ESC(B restores US ASCII', () => {
      const term = new Terminal({ rows: 24, cols: 80, emulatorType: 'vt100' });
      term.open(container);

      term.write('\x1b(0');
      term.write('\x1b(B');
      term.write('A');
      const emu = term.getEmulator() as any;
      expect(emu.buffer.getCellRef(0, 0).codepoint).toBe(0x41);

      term.dispose();
    });
  });

  describe('Write and render with bitmap font active', () => {
    it('VT100 write produces canvas output', () => {
      const term = new Terminal({ rows: 24, cols: 80, emulatorType: 'vt100' });
      term.open(container);
      term.write('Hello World');

      const renderer = (term as any)._renderer as CanvasRenderer;
      expect(renderer.canvas.width).toBeGreaterThan(0);
      expect(renderer.canvas.height).toBeGreaterThan(0);

      term.dispose();
    });

    it('TDV2200 write produces canvas output', () => {
      const term = new Terminal({ rows: 24, cols: 80, emulatorType: 'tdv2200' });
      term.open(container);
      term.write('Hello World');

      const renderer = (term as any)._renderer as CanvasRenderer;
      expect(renderer.canvas.width).toBeGreaterThan(0);

      term.dispose();
    });

    it('TDV2215 write produces canvas output', () => {
      const term = new Terminal({ rows: 24, cols: 80, emulatorType: 'tdv2215' });
      term.open(container);
      term.write('Hello World');

      const renderer = (term as any)._renderer as CanvasRenderer;
      expect(renderer.canvas.width).toBeGreaterThan(0);

      term.dispose();
    });
  });

  describe('Font cell size comparison', () => {
    it('VT100 = 8x10, TDV2200 = 8xN, TDV2215 = 9xN', () => {
      const vt = new Terminal({ rows: 24, cols: 80, emulatorType: 'vt100' });
      vt.open(container);
      const vtr = (vt as any)._renderer as CanvasRenderer;
      expect(vtr.charWidth).toBe(8);
      expect(vtr.charHeight).toBe(10);
      vt.dispose();
      document.body.innerHTML = '';

      const c2 = document.createElement('div');
      c2.style.width = '800px';
      c2.style.height = '400px';
      document.body.appendChild(c2);
      const tdv = new Terminal({ rows: 24, cols: 80, emulatorType: 'tdv2200' });
      tdv.open(c2);
      const tdvr = (tdv as any)._renderer as CanvasRenderer;
      expect(tdvr.charWidth).toBe(8);
      tdv.dispose();
      document.body.innerHTML = '';

      const c3 = document.createElement('div');
      c3.style.width = '800px';
      c3.style.height = '400px';
      document.body.appendChild(c3);
      const t15 = new Terminal({ rows: 24, cols: 80, emulatorType: 'tdv2215' });
      t15.open(c3);
      const t15r = (t15 as any)._renderer as CanvasRenderer;
      expect(t15r.charWidth).toBe(9);
      t15.dispose();
    });
  });
});
