/**
 * Direct font glyph availability tests.
 * Verifies that bitmap font data is present and non-blank for all character banks.
 *
 * FontTDV2200 has 5 banks: [0, 0, 128, 256, 384]
 *   - fontNum 0/1 → bank 0 (ASCII, offset 0)
 *   - fontNum 2 → bank 1 (GraphicsI, offset 128)
 *   - fontNum 3 → bank 2 (GraphicsII, offset 256)
 *   - fontNum 4 → bank 3 (subscript/superscript, offset 384)
 */
import { describe, it, expect } from 'vitest';
import { FontTDV2200 } from '../../../src/fonts/FontTDV2200';
import { FontTDV2215 } from '../../../src/fonts/FontTDV2215';
import { BitmapFontRenderer } from '../../../src/renderer/BitmapFontRenderer';

describe('FontTDV2200 — Glyph Coverage', () => {
  const font = new FontTDV2200();
  const renderer = new BitmapFontRenderer(font);

  // All banks in the TDV2200 ROM (fontNumOffset has 5 entries)
  const ALL_BANKS = [0, 1, 2, 3, 4];

  describe('Active banks: glyph data present for printable chars', () => {
    for (const fontNum of ALL_BANKS) {
      describe(`fontNum ${fontNum} (bank ${fontNum})`, () => {
        it('should return non-null glyphs for 0x21-0x7E', () => {
          let nullCount = 0;
          for (let ch = 0x21; ch <= 0x7E; ch++) {
            const pixels = renderer.getGlyphPixels(ch, fontNum);
            if (pixels === null) nullCount++;
          }
          // Allow some nulls for fontNum 0 (ASCII space area), but most should exist
          expect(nullCount).toBeLessThan(10);
        });

        it('should have non-blank glyphs (at least one non-zero row)', () => {
          let blankCount = 0;
          for (let ch = 0x21; ch <= 0x7E; ch++) {
            const pixels = renderer.getGlyphPixels(ch, fontNum);
            if (pixels === null) continue;
            const hasContent = pixels.some(row => row.some(pixel => pixel));
            if (!hasContent) blankCount++;
          }
          // Most glyphs should have visible content
          expect(blankCount).toBeLessThan(10);
        });
      });
    }
  });

  describe('Banks produce distinct glyph data', () => {
    it('bank 0 (ASCII) and bank 1 (GraphicsI) should have different glyphs', () => {
      let differences = 0;
      for (let ch = 0x60; ch <= 0x7E; ch++) {
        const p0 = renderer.getGlyphPixels(ch, 0);
        const p1 = renderer.getGlyphPixels(ch, 2); // fontNum 2 = bank 1
        if (p0 === null || p1 === null) continue;
        const same = p0.every((row, ri) => row.every((px, ci) => px === p1[ri][ci]));
        if (!same) differences++;
      }
      expect(differences).toBeGreaterThan(0);
    });

    it('bank 1 (GraphicsI) and bank 2 (GraphicsII) should have different glyphs', () => {
      let differences = 0;
      for (let ch = 0x60; ch <= 0x7E; ch++) {
        const p1 = renderer.getGlyphPixels(ch, 2); // fontNum 2 = bank 1
        const p2 = renderer.getGlyphPixels(ch, 3); // fontNum 3 = bank 2
        if (p1 === null || p2 === null) continue;
        const same = p1.every((row, ri) => row.every((px, ci) => px === p2[ri][ci]));
        if (!same) differences++;
      }
      expect(differences).toBeGreaterThan(0);
    });
  });

  describe('Font dimensions', () => {
    it('fontNumOffset should have 5 entries matching C# ROM', () => {
      expect(font.fontNumOffset).toEqual([0, 0, 128, 256, 384]);
    });

    it('glyph data has correct dimensions', () => {
      const pixels = renderer.getGlyphPixels(0x41, 0); // 'A'
      expect(pixels).not.toBeNull();
      expect(pixels!.length).toBe(14); // heightToUse
      expect(pixels![0].length).toBe(8); // width
    });
  });
});

describe('FontTDV2215 — Glyph Coverage', () => {
  const font = new FontTDV2215();
  const renderer = new BitmapFontRenderer(font);

  it('should have glyph data loaded', () => {
    expect(font.glyphs.length).toBeGreaterThan(0);
  });

  it('should return non-null glyphs for ASCII printable range', () => {
    let nullCount = 0;
    for (let ch = 0x21; ch <= 0x7E; ch++) {
      const pixels = renderer.getGlyphPixels(ch, 0);
      if (pixels === null) nullCount++;
    }
    expect(nullCount).toBeLessThan(5);
  });

  it('ASCII glyphs should have visible content', () => {
    let blankCount = 0;
    for (let ch = 0x21; ch <= 0x7E; ch++) {
      const pixels = renderer.getGlyphPixels(ch, 0);
      if (pixels === null) continue;
      const hasContent = pixels.some(row => row.some(pixel => pixel));
      if (!hasContent) blankCount++;
    }
    expect(blankCount).toBeLessThan(5);
  });

  it('glyph data has correct dimensions', () => {
    const pixels = renderer.getGlyphPixels(0x41, 0); // 'A'
    expect(pixels).not.toBeNull();
    expect(pixels!.length).toBe(font.heightToUse > 0 ? font.heightToUse : font.height);
    expect(pixels![0].length).toBe(font.width);
  });
});
