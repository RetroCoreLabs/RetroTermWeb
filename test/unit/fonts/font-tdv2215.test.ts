/**
 * Tests for FontTDV2215 — TDV2215 bitmap font with national variant support.
 */
import { describe, it, expect } from 'vitest';
import { FontTDV2215 } from '../../../src/fonts/FontTDV2215';

describe('FontTDV2215', () => {
  describe('Font properties', () => {
    it('should have correct dimensions', () => {
      const font = new FontTDV2215();
      expect(font.height).toBe(14);
      expect(font.heightToUse).toBe(14);
      expect(font.width).toBe(9);
      expect(font.stretchY).toBe(1);
    });

    it('should default to International variant', () => {
      const font = new FontTDV2215();
      expect(font.characterSetVariant).toBe(0);
    });
  });

  describe('GetFontBits', () => {
    it('should return 14 rows for each character', () => {
      const font = new FontTDV2215();
      const bits = font.getFontBits(0x41, 0); // 'A'
      expect(bits).not.toBeNull();
      expect(bits!.length).toBe(14);
    });

    it('should return non-zero data for letter A', () => {
      const font = new FontTDV2215();
      const bits = font.getFontBits(0x41, 0);
      expect(bits).not.toBeNull();
      let hasNonZero = false;
      for (let i = 0; i < bits!.length; i++) {
        if (bits![i] !== 0) hasNonZero = true;
      }
      expect(hasNonZero).toBe(true);
    });

    it('should return null for out-of-range character (>= 0x80)', () => {
      const font = new FontTDV2215();
      const bits = font.getFontBits(0x80, 0);
      expect(bits).toBeNull();
    });

    it('should return null for invalid fontNum', () => {
      const font = new FontTDV2215();
      const bits = font.getFontBits(0x41, 8);
      expect(bits).toBeNull();
    });

    it('should return Norwegian glyphs for fontNum 5', () => {
      const font = new FontTDV2215();
      const bits = font.getFontBits(0x41, 5);
      expect(bits).not.toBeNull();
    });

    it('should return Swedish glyphs for fontNum 6', () => {
      const font = new FontTDV2215();
      const bits = font.getFontBits(0x41, 6);
      expect(bits).not.toBeNull();
    });

    it('should return German glyphs for fontNum 7', () => {
      const font = new FontTDV2215();
      const bits = font.getFontBits(0x41, 7);
      expect(bits).not.toBeNull();
    });
  });

  describe('Character set variants', () => {
    it('should switch to Norwegian variant', () => {
      const font = new FontTDV2215();
      font.characterSetVariant = 1;
      expect(font.characterSetVariant).toBe(1);
      // Norwegian 0x5B should be Æ (different from International [)
      const bitsInt = new FontTDV2215(); // fresh international
      const bitsIntl = bitsInt.getFontBits(0x5B, 0);
      const bitsNor = font.getFontBits(0x5B, 0);
      expect(bitsIntl).not.toBeNull();
      expect(bitsNor).not.toBeNull();
      // The glyphs should differ ([ vs Æ)
      let differs = false;
      for (let i = 0; i < 14; i++) {
        if (bitsIntl![i] !== bitsNor![i]) { differs = true; break; }
      }
      expect(differs).toBe(true);
    });

    it('should switch to Swedish variant', () => {
      const font = new FontTDV2215();
      font.characterSetVariant = 2;
      expect(font.characterSetVariant).toBe(2);
      const bits = font.getFontBits(0x5B, 0); // Ä in Swedish
      expect(bits).not.toBeNull();
    });

    it('should switch to German variant', () => {
      const font = new FontTDV2215();
      font.characterSetVariant = 3;
      expect(font.characterSetVariant).toBe(3);
      const bits = font.getFontBits(0x5B, 0); // Ä in German
      expect(bits).not.toBeNull();
    });

    it('should clamp invalid variant to 0', () => {
      const font = new FontTDV2215();
      font.characterSetVariant = 5;
      expect(font.characterSetVariant).toBe(0);
      font.characterSetVariant = -1;
      expect(font.characterSetVariant).toBe(0);
    });

    it('should not change if setting same variant', () => {
      const font = new FontTDV2215();
      font.characterSetVariant = 1;
      const bits1 = font.getFontBits(0x5B, 0);
      font.characterSetVariant = 1; // no change
      const bits2 = font.getFontBits(0x5B, 0);
      expect(bits1).not.toBeNull();
      expect(bits2).not.toBeNull();
      for (let i = 0; i < 14; i++) {
        expect(bits1![i]).toBe(bits2![i]);
      }
    });

    it('should share standard ASCII across all variants', () => {
      // Standard letters like 'A' (0x41) should be the same in all variants
      const fonts: FontTDV2215[] = [];
      for (let v = 0; v <= 3; v++) {
        const f = new FontTDV2215();
        f.characterSetVariant = v;
        fonts.push(f);
      }
      const refBits = fonts[0].getFontBits(0x41, 0)!;
      for (let v = 1; v <= 3; v++) {
        const bits = fonts[v].getFontBits(0x41, 0)!;
        for (let i = 0; i < 14; i++) {
          expect(bits[i]).toBe(refBits[i]);
        }
      }
    });
  });

  describe('Character sets (fontNum)', () => {
    it('should return glyph for fontNum 0 (ASCII)', () => {
      const font = new FontTDV2215();
      const bits = font.getFontBits(0x41, 0);
      expect(bits).not.toBeNull();
    });

    it('should return same glyph for fontNum 1 as fontNum 0', () => {
      const font = new FontTDV2215();
      const bits0 = font.getFontBits(0x41, 0);
      const bits1 = font.getFontBits(0x41, 1);
      expect(bits0).not.toBeNull();
      expect(bits1).not.toBeNull();
      for (let i = 0; i < 14; i++) {
        expect(bits0![i]).toBe(bits1![i]);
      }
    });

    it('should return glyph for fontNum 2 (Line Drawing)', () => {
      const font = new FontTDV2215();
      const bits = font.getFontBits(0x30, 2);
      expect(bits).not.toBeNull();
    });

    it('should return glyph for fontNum 3 (Subscript)', () => {
      const font = new FontTDV2215();
      const bits = font.getFontBits(0x30, 3);
      expect(bits).not.toBeNull();
    });

    it('should return glyph for fontNum 4 (Control Display)', () => {
      const font = new FontTDV2215();
      const bits = font.getFontBits(0x01, 4);
      expect(bits).not.toBeNull();
    });

    it('should have different glyphs for Line Drawing vs ASCII', () => {
      const font = new FontTDV2215();
      const bitsAscii = font.getFontBits(0x6A, 0); // 'j'
      const bitsLD = font.getFontBits(0x6A, 2); // line drawing char
      expect(bitsAscii).not.toBeNull();
      expect(bitsLD).not.toBeNull();
      let differs = false;
      for (let i = 0; i < 14; i++) {
        if (bitsAscii![i] !== bitsLD![i]) { differs = true; break; }
      }
      expect(differs).toBe(true);
    });
  });

  describe('Glyph data integrity', () => {
    it('should have printable ASCII characters with non-empty glyphs', () => {
      const font = new FontTDV2215();
      for (let ch = 0x21; ch <= 0x7E; ch++) {
        const bits = font.getFontBits(ch, 0);
        expect(bits).not.toBeNull();
        let hasNonZero = false;
        for (let i = 0; i < bits!.length; i++) {
          if (bits![i] !== 0) { hasNonZero = true; break; }
        }
        expect(hasNonZero).toBe(true);
      }
    });
  });
});
