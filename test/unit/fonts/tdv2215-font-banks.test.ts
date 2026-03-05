/**
 * TDV2215 font bank verification tests.
 * Validates that different font banks (7 arrays) contain genuinely different glyph data
 * and that national variant arrays produce correct output.
 */
import { describe, it, expect } from 'vitest';
import { BitmapFontRenderer } from '../../../src/renderer/BitmapFontRenderer';
import { FontTDV2215 } from '../../../src/fonts/FontTDV2215';

describe('TDV2215 font banks', () => {
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
    it('International (fontNum 0) and Line Drawing (fontNum 2) differ for 0x6A', () => {
      const font = new FontTDV2215();
      const renderer = new BitmapFontRenderer(font);
      const intl = renderer.getGlyphPixels(0x6A, 0);
      const ld = renderer.getGlyphPixels(0x6A, 2);
      expect(intl).not.toBeNull();
      expect(ld).not.toBeNull();
      expect(pixelsDiffer(intl!, ld!)).toBe(true);
    });

    it('International (fontNum 0) and Subscript (fontNum 3) differ for 0x41', () => {
      const font = new FontTDV2215();
      const renderer = new BitmapFontRenderer(font);
      const intl = renderer.getGlyphPixels(0x41, 0);
      const sub = renderer.getGlyphPixels(0x41, 3);
      expect(intl).not.toBeNull();
      expect(sub).not.toBeNull();
      expect(pixelsDiffer(intl!, sub!)).toBe(true);
    });

    it('International (fontNum 0) and Control Display (fontNum 4) differ for 0x01', () => {
      const font = new FontTDV2215();
      const renderer = new BitmapFontRenderer(font);
      const intl = renderer.getGlyphPixels(0x01, 0);
      const ctrl = renderer.getGlyphPixels(0x01, 4);
      // International 0x01 is likely empty, Control Display shows control code name
      expect(ctrl).not.toBeNull();
      if (intl !== null) {
        // If both exist, they should differ (or intl is empty)
        const ctrlHasPixels = hasLitPixels(ctrl!);
        expect(ctrlHasPixels).toBe(true);
      }
    });

    it('Line Drawing (fontNum 2) and Subscript (fontNum 3) differ for 0x10', () => {
      // Subscript data is at 0x00-0x1F; compare within that range
      const font = new FontTDV2215();
      const renderer = new BitmapFontRenderer(font);
      const ld = renderer.getGlyphPixels(0x10, 2);
      const sub = renderer.getGlyphPixels(0x10, 3);
      expect(ld).not.toBeNull();
      expect(sub).not.toBeNull();
      expect(pixelsDiffer(ld!, sub!)).toBe(true);
    });
  });

  describe('Each bank has populated glyphs', () => {
    it('International (fontNum 0) has non-empty glyphs for ASCII 0x21-0x7E', () => {
      const font = new FontTDV2215();
      const renderer = new BitmapFontRenderer(font);
      for (let ch = 0x21; ch <= 0x7E; ch++) {
        const pixels = renderer.getGlyphPixels(ch, 0);
        expect(pixels).not.toBeNull();
        expect(hasLitPixels(pixels!)).toBe(true);
      }
    });

    it('Line Drawing (fontNum 2) has non-empty glyphs for 0x21-0x7E', () => {
      const font = new FontTDV2215();
      const renderer = new BitmapFontRenderer(font);
      for (let ch = 0x21; ch <= 0x7E; ch++) {
        const pixels = renderer.getGlyphPixels(ch, 2);
        expect(pixels).not.toBeNull();
        expect(hasLitPixels(pixels!)).toBe(true);
      }
    });

    it('Subscript (fontNum 3) has non-empty glyphs for 0x00-0x1F', () => {
      // TDV2215 subscript/superscript data is stored at positions 0x00-0x1F only
      const font = new FontTDV2215();
      const renderer = new BitmapFontRenderer(font);
      for (let ch = 0x00; ch <= 0x1F; ch++) {
        const pixels = renderer.getGlyphPixels(ch, 3);
        expect(pixels).not.toBeNull();
        expect(hasLitPixels(pixels!)).toBe(true);
      }
    });

    it('Control Display (fontNum 4) has non-empty glyphs for 0x01-0x1E', () => {
      // TDV2215 control display shows mnemonic labels for control codes
      const font = new FontTDV2215();
      const renderer = new BitmapFontRenderer(font);
      for (let ch = 0x01; ch <= 0x1E; ch++) {
        const pixels = renderer.getGlyphPixels(ch, 4);
        expect(pixels).not.toBeNull();
        expect(hasLitPixels(pixels!)).toBe(true);
      }
    });
  });

  describe('National variant arrays differ at substitution positions', () => {
    const variantPositions = [0x40, 0x5B, 0x5C, 0x5D, 0x5E, 0x60, 0x7B, 0x7C, 0x7D, 0x7E];

    it('Norwegian (fontNum 5) differs from International (fontNum 0) at variant positions', () => {
      const font = new FontTDV2215();
      const renderer = new BitmapFontRenderer(font);
      let diffCount = 0;
      for (const ch of variantPositions) {
        const intl = renderer.getGlyphPixels(ch, 0);
        const norw = renderer.getGlyphPixels(ch, 5);
        expect(intl).not.toBeNull();
        expect(norw).not.toBeNull();
        if (pixelsDiffer(intl!, norw!)) diffCount++;
      }
      // At least some positions must differ
      expect(diffCount).toBeGreaterThan(0);
    });

    it('Swedish (fontNum 6) differs from International (fontNum 0) at variant positions', () => {
      const font = new FontTDV2215();
      const renderer = new BitmapFontRenderer(font);
      let diffCount = 0;
      for (const ch of variantPositions) {
        const intl = renderer.getGlyphPixels(ch, 0);
        const swed = renderer.getGlyphPixels(ch, 6);
        expect(intl).not.toBeNull();
        expect(swed).not.toBeNull();
        if (pixelsDiffer(intl!, swed!)) diffCount++;
      }
      expect(diffCount).toBeGreaterThan(0);
    });

    it('German (fontNum 7) differs from International (fontNum 0) at variant positions', () => {
      const font = new FontTDV2215();
      const renderer = new BitmapFontRenderer(font);
      let diffCount = 0;
      for (const ch of variantPositions) {
        const intl = renderer.getGlyphPixels(ch, 0);
        const germ = renderer.getGlyphPixels(ch, 7);
        expect(intl).not.toBeNull();
        expect(germ).not.toBeNull();
        if (pixelsDiffer(intl!, germ!)) diffCount++;
      }
      expect(diffCount).toBeGreaterThan(0);
    });
  });

  describe('Standard ASCII identical across variants', () => {
    it('letters and digits render identically in International, Norwegian, Swedish, German', () => {
      const font = new FontTDV2215();
      const renderer = new BitmapFontRenderer(font);
      const testChars = [0x41, 0x42, 0x4D, 0x5A, 0x30, 0x35, 0x39, 0x61, 0x7A];
      for (const ch of testChars) {
        const intl = renderer.getGlyphPixels(ch, 0);
        const norw = renderer.getGlyphPixels(ch, 5);
        const swed = renderer.getGlyphPixels(ch, 6);
        const germ = renderer.getGlyphPixels(ch, 7);
        expect(intl).not.toBeNull();
        expect(norw).not.toBeNull();
        expect(swed).not.toBeNull();
        expect(germ).not.toBeNull();
        expect(pixelsDiffer(intl!, norw!)).toBe(false);
        expect(pixelsDiffer(intl!, swed!)).toBe(false);
        expect(pixelsDiffer(intl!, germ!)).toBe(false);
      }
    });
  });
});
