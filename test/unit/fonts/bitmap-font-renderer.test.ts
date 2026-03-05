/**
 * Tests for BitmapFontRenderer — pixel-level bitmap glyph rendering.
 */
import { describe, it, expect } from 'vitest';
import { FontBase } from '../../../src/fonts/FontBase';
import { BitmapFontRenderer } from '../../../src/renderer/BitmapFontRenderer';

/** Create a minimal test font with known glyph data */
function createTestFont(): FontBase {
  const font = new FontBase();
  font.height = 4;
  font.heightToUse = 4;
  font.width = 4;
  font.stretchY = 1;
  font.fontNumOffset = [0, 0];

  // 2 characters × 4 rows = 8 values
  // Char 0: all zeros (space)
  // Char 1: simple cross pattern
  font.glyphs = new Uint16Array([
    // Char 0 (space/null)
    0b0000, 0b0000, 0b0000, 0b0000,
    // Char 1 (cross)
    0b0100, // .X..
    0b1110, // XXX.
    0b0100, // .X..
    0b0000, // ....
  ]);

  return font;
}

describe('BitmapFontRenderer', () => {
  describe('Construction', () => {
    it('should report font dimensions', () => {
      const font = createTestFont();
      const renderer = new BitmapFontRenderer(font);
      expect(renderer.charWidth).toBe(4);
      expect(renderer.charHeight).toBe(4);
    });

    it('should use heightToUse for charHeight', () => {
      const font = createTestFont();
      font.heightToUse = 3;
      const renderer = new BitmapFontRenderer(font);
      expect(renderer.charHeight).toBe(3);
    });

    it('should expose the underlying font', () => {
      const font = createTestFont();
      const renderer = new BitmapFontRenderer(font);
      expect(renderer.font).toBe(font);
    });
  });

  describe('getGlyphPixels', () => {
    it('should return null for missing glyph', () => {
      const font = createTestFont();
      const renderer = new BitmapFontRenderer(font);
      const pixels = renderer.getGlyphPixels(0xFF);
      expect(pixels).toBeNull();
    });

    it('should return all-false for space character', () => {
      const font = createTestFont();
      font.mapSpaceChar = 0; // space maps to char 0
      const renderer = new BitmapFontRenderer(font);
      const pixels = renderer.getGlyphPixels(0x20);
      expect(pixels).not.toBeNull();
      for (let row = 0; row < pixels!.length; row++) {
        for (let col = 0; col < pixels![row].length; col++) {
          expect(pixels![row][col]).toBe(false);
        }
      }
    });

    it('should return correct pixel pattern for cross glyph', () => {
      const font = createTestFont();
      const renderer = new BitmapFontRenderer(font);
      const pixels = renderer.getGlyphPixels(1);
      expect(pixels).not.toBeNull();
      expect(pixels!.length).toBe(4);
      expect(pixels![0].length).toBe(4);

      // Row 0: 0100 = .X..
      expect(pixels![0]).toEqual([false, true, false, false]);
      // Row 1: 1110 = XXX.
      expect(pixels![1]).toEqual([true, true, true, false]);
      // Row 2: 0100 = .X..
      expect(pixels![2]).toEqual([false, true, false, false]);
      // Row 3: 0000 = ....
      expect(pixels![3]).toEqual([false, false, false, false]);
    });

    it('should handle MSB-first bit ordering', () => {
      const font = new FontBase();
      font.height = 1;
      font.heightToUse = 1;
      font.width = 8;
      font.stretchY = 1;
      font.fontNumOffset = [];
      // Single char: 0x80 = 10000000 (only leftmost pixel set)
      font.glyphs = new Uint16Array([0x80]);

      const renderer = new BitmapFontRenderer(font);
      const pixels = renderer.getGlyphPixels(0x20); // space maps to 0
      expect(pixels).not.toBeNull();
      expect(pixels![0][0]).toBe(true);  // MSB = leftmost
      expect(pixels![0][1]).toBe(false);
      expect(pixels![0][7]).toBe(false); // LSB = rightmost
    });
  });

  describe('FontBase.getFontBits with stretchY', () => {
    it('should stretch rows with stretchY=2', () => {
      const font = new FontBase();
      font.height = 4;
      font.heightToUse = 4;
      font.width = 4;
      font.stretchY = 2;
      font.fontNumOffset = [];
      // With stretchY=2, each glyph stores height/stretchY = 2 rows
      // Char 0 at position 0: 2 source rows
      font.glyphs = new Uint16Array([
        0b1010, // Row A
        0b0101, // Row B
      ]);

      const bits = font.getFontBits(0x20, 0); // space maps to 0
      expect(bits).not.toBeNull();
      expect(bits!.length).toBe(4);
      // stretchY=2: even rows get data, odd rows get 0
      expect(bits![0]).toBe(0b1010); // Row A
      expect(bits![1]).toBe(0);      // blank (odd)
      expect(bits![2]).toBe(0b0101); // Row B
      expect(bits![3]).toBe(0);      // blank (odd)
    });
  });

  describe('FontBase.getFontBits with fontNum offset', () => {
    it('should apply font number offset', () => {
      const font = new FontBase();
      font.height = 2;
      font.heightToUse = 2;
      font.width = 4;
      font.stretchY = 1;
      font.fontNumOffset = [0, 0, 4]; // fontNum 2 adds 4 to char code
      // Need enough glyphs: char codes 0-7 (8 chars), 2 rows each = 16 values
      font.glyphs = new Uint16Array([
        // chars 0-3 (fontNum 0/1)
        0x00, 0x00, // char 0
        0x01, 0x01, // char 1
        0x02, 0x02, // char 2
        0x03, 0x03, // char 3
        // chars 4-7 (fontNum 2 offset: char 0+4=4, etc.)
        0xAA, 0xBB, // char 4 (= char 0 in fontNum 2)
        0xCC, 0xDD, // char 5 (= char 1 in fontNum 2)
        0xEE, 0xFF, // char 6
        0x11, 0x22, // char 7
      ]);

      // fontNum 0, char 1 → direct lookup
      const bits0 = font.getFontBits(1, 0);
      expect(bits0).not.toBeNull();
      expect(bits0![0]).toBe(0x01);

      // fontNum 2, char 1 → char 1 + offset 4 = char 5 → 0xCC, 0xDD
      const bits2 = font.getFontBits(1, 2);
      expect(bits2).not.toBeNull();
      expect(bits2![0]).toBe(0xCC);
      expect(bits2![1]).toBe(0xDD);
    });
  });
});
