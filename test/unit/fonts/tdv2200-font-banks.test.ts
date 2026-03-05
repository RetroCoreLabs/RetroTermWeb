/**
 * TDV2200 font bank verification tests.
 * Validates that different font banks contain genuinely different glyph data
 * and that national variant redirects produce correct output.
 */
import { describe, it, expect } from 'vitest';
import { BitmapFontRenderer } from '../../../src/renderer/BitmapFontRenderer';
import { FontTDV2200 } from '../../../src/fonts/FontTDV2200';

describe('TDV2200 font banks', () => {
  const font = new FontTDV2200();
  const renderer = new BitmapFontRenderer(font);

  /**
   * Helper: compare two pixel grids and return whether they differ.
   */
  function pixelsDiffer(a: boolean[][], b: boolean[][]): boolean {
    if (a.length !== b.length) return true;
    for (let r = 0; r < a.length; r++) {
      if (a[r].length !== b[r].length) return true;
      for (let c = 0; c < a[r].length; c++) {
        if (a[r][c] !== b[r][c]) return true;
      }
    }
    return false;
  }

  /**
   * Helper: check if a pixel grid has any lit pixels.
   */
  function hasLitPixels(pixels: boolean[][]): boolean {
    for (let r = 0; r < pixels.length; r++) {
      for (let c = 0; c < pixels[r].length; c++) {
        if (pixels[r][c]) return true;
      }
    }
    return false;
  }

  describe('Banks contain genuinely different glyph data', () => {
    it('bank 0 and bank 2 differ for codepoint 0x60', () => {
      const bank0 = renderer.getGlyphPixels(0x60, 0);
      const bank2 = renderer.getGlyphPixels(0x60, 2);
      expect(bank0).not.toBeNull();
      expect(bank2).not.toBeNull();
      expect(pixelsDiffer(bank0!, bank2!)).toBe(true);
    });

    it('bank 0 and bank 3 differ for codepoint 0x60', () => {
      const bank0 = renderer.getGlyphPixels(0x60, 0);
      const bank3 = renderer.getGlyphPixels(0x60, 3);
      expect(bank0).not.toBeNull();
      expect(bank3).not.toBeNull();
      expect(pixelsDiffer(bank0!, bank3!)).toBe(true);
    });

    it('bank 2 and bank 3 differ for codepoint 0x60', () => {
      const bank2 = renderer.getGlyphPixels(0x60, 2);
      const bank3 = renderer.getGlyphPixels(0x60, 3);
      expect(bank2).not.toBeNull();
      expect(bank3).not.toBeNull();
      expect(pixelsDiffer(bank2!, bank3!)).toBe(true);
    });

    it('bank 0 and bank 4 differ for codepoint 0x41', () => {
      const bank0 = renderer.getGlyphPixels(0x41, 0);
      const bank4 = renderer.getGlyphPixels(0x41, 4);
      expect(bank0).not.toBeNull();
      expect(bank4).not.toBeNull();
      expect(pixelsDiffer(bank0!, bank4!)).toBe(true);
    });
  });

  describe('Each bank has populated glyphs', () => {
    it('bank 0 has non-empty glyphs for ASCII 0x21-0x7E', () => {
      for (let ch = 0x21; ch <= 0x7E; ch++) {
        const pixels = renderer.getGlyphPixels(ch, 0);
        expect(pixels).not.toBeNull();
        expect(hasLitPixels(pixels!)).toBe(true);
      }
    });

    it('bank 2 has non-empty glyphs for 0x21-0x7E', () => {
      for (let ch = 0x21; ch <= 0x7E; ch++) {
        const pixels = renderer.getGlyphPixels(ch, 2);
        expect(pixels).not.toBeNull();
        expect(hasLitPixels(pixels!)).toBe(true);
      }
    });

    it('bank 3 has non-empty glyphs for 0x21-0x7E', () => {
      for (let ch = 0x21; ch <= 0x7E; ch++) {
        const pixels = renderer.getGlyphPixels(ch, 3);
        expect(pixels).not.toBeNull();
        expect(hasLitPixels(pixels!)).toBe(true);
      }
    });

    it('bank 4 has non-empty glyphs for 0x21-0x7E', () => {
      for (let ch = 0x21; ch <= 0x7E; ch++) {
        const pixels = renderer.getGlyphPixels(ch, 4);
        expect(pixels).not.toBeNull();
        expect(hasLitPixels(pixels!)).toBe(true);
      }
    });
  });

  describe('National variant redirects work', () => {
    const variantPositions = [0x40, 0x5B, 0x5C, 0x5D, 0x5E, 0x60, 0x7B, 0x7C, 0x7D, 0x7E];

    it('fontNum 5 differs from fontNum 0 at Norwegian positions', () => {
      for (const ch of variantPositions) {
        const intl = renderer.getGlyphPixels(ch, 0);
        const norw = renderer.getGlyphPixels(ch, 5);
        expect(intl).not.toBeNull();
        expect(norw).not.toBeNull();
        expect(pixelsDiffer(intl!, norw!)).toBe(true);
      }
    });

    it('fontNum 6 differs from fontNum 0 at Swedish positions', () => {
      for (const ch of variantPositions) {
        const intl = renderer.getGlyphPixels(ch, 0);
        const swed = renderer.getGlyphPixels(ch, 6);
        expect(intl).not.toBeNull();
        expect(swed).not.toBeNull();
        expect(pixelsDiffer(intl!, swed!)).toBe(true);
      }
    });

    it('fontNum 7 differs from fontNum 0 at German positions', () => {
      // German has 8 redirects (0x5E and 0x60 are same as International)
      const germanPositions = [0x40, 0x5B, 0x5C, 0x5D, 0x7B, 0x7C, 0x7D, 0x7E];
      for (const ch of germanPositions) {
        const intl = renderer.getGlyphPixels(ch, 0);
        const germ = renderer.getGlyphPixels(ch, 7);
        expect(intl).not.toBeNull();
        expect(germ).not.toBeNull();
        expect(pixelsDiffer(intl!, germ!)).toBe(true);
      }
    });

    it('fontNum 5 matches fontNum 0 at non-variant positions', () => {
      // Standard letters must render identically
      for (const ch of [0x41, 0x42, 0x4D, 0x5A, 0x30, 0x35, 0x39, 0x61, 0x7A]) {
        const intl = renderer.getGlyphPixels(ch, 0);
        const norw = renderer.getGlyphPixels(ch, 5);
        expect(intl).not.toBeNull();
        expect(norw).not.toBeNull();
        expect(pixelsDiffer(intl!, norw!)).toBe(false);
      }
    });

    it('fontNum 6 matches fontNum 0 at non-variant positions', () => {
      for (const ch of [0x41, 0x42, 0x4D, 0x5A, 0x30, 0x35, 0x39, 0x61, 0x7A]) {
        const intl = renderer.getGlyphPixels(ch, 0);
        const swed = renderer.getGlyphPixels(ch, 6);
        expect(intl).not.toBeNull();
        expect(swed).not.toBeNull();
        expect(pixelsDiffer(intl!, swed!)).toBe(false);
      }
    });

    it('fontNum 7 matches fontNum 0 at non-variant positions', () => {
      for (const ch of [0x41, 0x42, 0x4D, 0x5A, 0x30, 0x35, 0x39, 0x61, 0x7A]) {
        const intl = renderer.getGlyphPixels(ch, 0);
        const germ = renderer.getGlyphPixels(ch, 7);
        expect(intl).not.toBeNull();
        expect(germ).not.toBeNull();
        expect(pixelsDiffer(intl!, germ!)).toBe(false);
      }
    });
  });
});
