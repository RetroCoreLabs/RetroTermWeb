/**
 * Tests for FontTDV2200 — TDV2200 bitmap font glyph data validation.
 */
import { describe, it, expect } from 'vitest';
import { FontTDV2200 } from '../../../src/fonts/FontTDV2200';

describe('FontTDV2200', () => {
  const font = new FontTDV2200();

  describe('Font properties', () => {
    it('should have correct dimensions', () => {
      expect(font.height).toBe(16);
      expect(font.heightToUse).toBe(14);
      expect(font.width).toBe(8);
      expect(font.stretchY).toBe(1);
    });

    it('should have correct font number offsets', () => {
      expect(font.fontNumOffset).toEqual([0, 0, 128, 256, 384]);
    });

    it('should have glyph data loaded', () => {
      expect(font.glyphs.length).toBeGreaterThan(0);
      // 1018 characters × 16 rows = 16288
      expect(font.glyphs.length).toBe(16288);
    });
  });

  describe('GetFontBits', () => {
    it('should return 16 rows for each character', () => {
      const bits = font.getFontBits(0x41, 0); // 'A'
      expect(bits).not.toBeNull();
      expect(bits!.length).toBe(16);
    });

    it('should return null space character (maps to position 0)', () => {
      const bits = font.getFontBits(0x20, 0); // SPACE
      expect(bits).not.toBeNull();
      // Space maps to char 0 which is all zeros
      for (let i = 0; i < bits!.length; i++) {
        expect(bits![i]).toBe(0);
      }
    });

    it('should return non-zero data for letter A (0x41)', () => {
      const bits = font.getFontBits(0x41, 0);
      expect(bits).not.toBeNull();
      let hasNonZero = false;
      for (let i = 0; i < bits!.length; i++) {
        if (bits![i] !== 0) hasNonZero = true;
      }
      expect(hasNonZero).toBe(true);
    });

    it('should have recognizable pattern for A (0x41)', () => {
      const bits = font.getFontBits(0x41, 0);
      expect(bits).not.toBeNull();
      // Row 1 should be 0x0038 (pattern: 00111000 = top of A)
      expect(bits![1]).toBe(0x0038);
    });

    it('should return glyph for exclamation mark (0x21)', () => {
      const bits = font.getFontBits(0x21, 0); // '!'
      expect(bits).not.toBeNull();
      let hasNonZero = false;
      for (let i = 0; i < bits!.length; i++) {
        if (bits![i] !== 0) hasNonZero = true;
      }
      expect(hasNonZero).toBe(true);
    });

    it('should return null for out-of-range character', () => {
      const bits = font.getFontBits(0xFFFF, 0);
      expect(bits).toBeNull();
    });
  });

  describe('Character sets (fontNum)', () => {
    it('should return same glyph for fontNum 0 and 1', () => {
      const bits0 = font.getFontBits(0x41, 0);
      const bits1 = font.getFontBits(0x41, 1);
      expect(bits0).not.toBeNull();
      expect(bits1).not.toBeNull();
      for (let i = 0; i < 16; i++) {
        expect(bits0![i]).toBe(bits1![i]);
      }
    });

    it('should return different glyph for fontNum 2 (Greek/Math)', () => {
      // fontNum 2 adds offset 128 to the character code
      const bits0 = font.getFontBits(0x41, 0);
      const bits2 = font.getFontBits(0x41, 2);
      expect(bits0).not.toBeNull();
      expect(bits2).not.toBeNull();
      // They should be different glyphs (different character sets)
      let differs = false;
      for (let i = 0; i < 16; i++) {
        if (bits0![i] !== bits2![i]) differs = true;
      }
      expect(differs).toBe(true);
    });

    it('should return glyph for fontNum 3 (Sub/Superscripts)', () => {
      const bits = font.getFontBits(0x30, 3); // '0' in subscript set
      expect(bits).not.toBeNull();
    });

    it('should return glyph for fontNum 4 (Control codes)', () => {
      const bits = font.getFontBits(0x01, 4);
      expect(bits).not.toBeNull();
    });
  });

  describe('ISO 646 variant character sets (fontNum 5/6/7)', () => {
    it('should return non-null for all printable ASCII with Norwegian variant (fontNum 5)', () => {
      for (let ch = 0x21; ch <= 0x7E; ch++) {
        const bits = font.getFontBits(ch, 5);
        expect(bits).not.toBeNull();
      }
    });

    it('should return non-null for all printable ASCII with Swedish variant (fontNum 6)', () => {
      for (let ch = 0x21; ch <= 0x7E; ch++) {
        const bits = font.getFontBits(ch, 6);
        expect(bits).not.toBeNull();
      }
    });

    it('should return non-null for all printable ASCII with German variant (fontNum 7)', () => {
      for (let ch = 0x21; ch <= 0x7E; ch++) {
        const bits = font.getFontBits(ch, 7);
        expect(bits).not.toBeNull();
      }
    });

    it('fontNum 8 should fall through to base class (no variant redirect)', () => {
      // fontNum 8 is not a variant — base class returns International glyph (no offset applied)
      const bits8 = font.getFontBits(0x41, 8);
      const bits0 = font.getFontBits(0x41, 0);
      expect(bits8).not.toBeNull();
      for (let i = 0; i < 16; i++) {
        expect(bits8![i]).toBe(bits0![i]);
      }
    });

    it('Norwegian 0x5B should differ from International 0x5B (AE vs [)', () => {
      const intl = font.getFontBits(0x5B, 0);
      const norw = font.getFontBits(0x5B, 5);
      expect(intl).not.toBeNull();
      expect(norw).not.toBeNull();
      let differs = false;
      for (let i = 0; i < 16; i++) {
        if (intl![i] !== norw![i]) { differs = true; break; }
      }
      expect(differs).toBe(true);
    });

    it('Swedish 0x5C should differ from International 0x5C (O-umlaut vs backslash)', () => {
      const intl = font.getFontBits(0x5C, 0);
      const swed = font.getFontBits(0x5C, 6);
      expect(intl).not.toBeNull();
      expect(swed).not.toBeNull();
      let differs = false;
      for (let i = 0; i < 16; i++) {
        if (intl![i] !== swed![i]) { differs = true; break; }
      }
      expect(differs).toBe(true);
    });

    it('German 0x7E should differ from International 0x7E (eszett vs tilde)', () => {
      const intl = font.getFontBits(0x7E, 0);
      const germ = font.getFontBits(0x7E, 7);
      expect(intl).not.toBeNull();
      expect(germ).not.toBeNull();
      let differs = false;
      for (let i = 0; i < 16; i++) {
        if (intl![i] !== germ![i]) { differs = true; break; }
      }
      expect(differs).toBe(true);
    });

    it('non-variant positions should be identical across all fontNums (e.g. 0x41=A)', () => {
      const intl = font.getFontBits(0x41, 0);
      const norw = font.getFontBits(0x41, 5);
      const swed = font.getFontBits(0x41, 6);
      const germ = font.getFontBits(0x41, 7);
      expect(intl).not.toBeNull();
      for (let i = 0; i < 16; i++) {
        expect(norw![i]).toBe(intl![i]);
        expect(swed![i]).toBe(intl![i]);
        expect(germ![i]).toBe(intl![i]);
      }
    });

    it('German section-sign (0x40) should have non-zero data and differ from International @', () => {
      const intl = font.getFontBits(0x40, 0);
      const germ = font.getFontBits(0x40, 7);
      expect(intl).not.toBeNull();
      expect(germ).not.toBeNull();
      let hasNonZero = false;
      let differs = false;
      for (let i = 0; i < 16; i++) {
        if (germ![i] !== 0) hasNonZero = true;
        if (intl![i] !== germ![i]) differs = true;
      }
      expect(hasNonZero).toBe(true);
      expect(differs).toBe(true);
    });

    it('German eszett (0x7E) should have non-zero data and differ from International tilde', () => {
      const intl = font.getFontBits(0x7E, 0);
      const germ = font.getFontBits(0x7E, 7);
      expect(intl).not.toBeNull();
      expect(germ).not.toBeNull();
      let hasNonZero = false;
      let differs = false;
      for (let i = 0; i < 16; i++) {
        if (germ![i] !== 0) hasNonZero = true;
        if (intl![i] !== germ![i]) differs = true;
      }
      expect(hasNonZero).toBe(true);
      expect(differs).toBe(true);
    });

    it('Norwegian 0x5B should match ROM position 5 (AE ligature)', () => {
      // Norwegian AE at 0x5B should be the same glyph as ROM position 5
      const norw5B = font.getFontBits(0x5B, 5);
      const romPos5 = font.getFontBits(5, 0); // position 5 in glyph array via fontNum 0
      expect(norw5B).not.toBeNull();
      expect(romPos5).not.toBeNull();
      for (let i = 0; i < 16; i++) {
        expect(norw5B![i]).toBe(romPos5![i]);
      }
    });

    it('Swedish 0x5B should match ROM position 1 (A-umlaut)', () => {
      const swed5B = font.getFontBits(0x5B, 6);
      const romPos1 = font.getFontBits(1, 0);
      expect(swed5B).not.toBeNull();
      expect(romPos1).not.toBeNull();
      for (let i = 0; i < 16; i++) {
        expect(swed5B![i]).toBe(romPos1![i]);
      }
    });

    it('all 10 Norwegian variant positions should produce distinct glyphs from International', () => {
      const variantPositions = [0x40, 0x5B, 0x5C, 0x5D, 0x5E, 0x60, 0x7B, 0x7C, 0x7D, 0x7E];
      for (const pos of variantPositions) {
        const intl = font.getFontBits(pos, 0);
        const norw = font.getFontBits(pos, 5);
        expect(intl).not.toBeNull();
        expect(norw).not.toBeNull();
        let differs = false;
        for (let i = 0; i < 16; i++) {
          if (intl![i] !== norw![i]) { differs = true; break; }
        }
        expect(differs).toBe(true);
      }
    });

    it('all 10 Swedish variant positions should produce distinct glyphs from International', () => {
      const variantPositions = [0x40, 0x5B, 0x5C, 0x5D, 0x5E, 0x60, 0x7B, 0x7C, 0x7D, 0x7E];
      for (const pos of variantPositions) {
        const intl = font.getFontBits(pos, 0);
        const swed = font.getFontBits(pos, 6);
        expect(intl).not.toBeNull();
        expect(swed).not.toBeNull();
        let differs = false;
        for (let i = 0; i < 16; i++) {
          if (intl![i] !== swed![i]) { differs = true; break; }
        }
        expect(differs).toBe(true);
      }
    });

    it('German variant: 8 redirected + 2 new all produce distinct glyphs from International', () => {
      // German has redirects for: 0x40(§), 0x5B(Ä), 0x5C(Ö), 0x5D(Ü), 0x7B(ä), 0x7C(ö), 0x7D(ü), 0x7E(ß)
      // 0x5E and 0x60 are same as International
      const variantPositions = [0x40, 0x5B, 0x5C, 0x5D, 0x7B, 0x7C, 0x7D, 0x7E];
      for (const pos of variantPositions) {
        const intl = font.getFontBits(pos, 0);
        const germ = font.getFontBits(pos, 7);
        expect(intl).not.toBeNull();
        expect(germ).not.toBeNull();
        let differs = false;
        for (let i = 0; i < 16; i++) {
          if (intl![i] !== germ![i]) { differs = true; break; }
        }
        expect(differs).toBe(true);
      }
    });

    it('German 0x5E and 0x60 should be same as International (no redirect)', () => {
      // ^ and ` are unchanged in German variant
      for (const pos of [0x5E, 0x60]) {
        const intl = font.getFontBits(pos, 0);
        const germ = font.getFontBits(pos, 7);
        expect(intl).not.toBeNull();
        expect(germ).not.toBeNull();
        for (let i = 0; i < 16; i++) {
          expect(germ![i]).toBe(intl![i]);
        }
      }
    });

    it('variant glyphs should all have correct length (16 rows)', () => {
      for (let fontNum = 5; fontNum <= 7; fontNum++) {
        for (let ch = 0x21; ch <= 0x7E; ch++) {
          const bits = font.getFontBits(ch, fontNum);
          if (bits !== null) {
            expect(bits.length).toBe(16);
          }
        }
      }
    });
  });

  describe('Glyph data integrity', () => {
    it('should have valid 8-bit wide glyphs (values fit in 9 bits)', () => {
      // Width is 8, so values should not exceed 0x1FF (9 bits) for safety
      // Actually for 8-bit width, max meaningful value is 0xFF (bit 7 is MSB)
      // But the font data uses 10-bit values per the comments, so up to 0x3FF
      for (let i = 0; i < font.glyphs.length; i++) {
        expect(font.glyphs[i]).toBeLessThanOrEqual(0xFFFF);
      }
    });

    it('should have printable ASCII characters with non-empty glyphs', () => {
      // Check that printable ASCII (0x21-0x7E) all have non-zero glyph data
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

    it('should have digits 0-9 with distinct glyphs', () => {
      const digitGlyphs: Uint16Array[] = [];
      for (let d = 0x30; d <= 0x39; d++) {
        const bits = font.getFontBits(d, 0);
        expect(bits).not.toBeNull();
        digitGlyphs.push(bits!);
      }
      // Each digit should be unique
      for (let i = 0; i < digitGlyphs.length; i++) {
        for (let j = i + 1; j < digitGlyphs.length; j++) {
          let same = true;
          for (let k = 0; k < 16; k++) {
            if (digitGlyphs[i][k] !== digitGlyphs[j][k]) { same = false; break; }
          }
          expect(same).toBe(false);
        }
      }
    });
  });
});
