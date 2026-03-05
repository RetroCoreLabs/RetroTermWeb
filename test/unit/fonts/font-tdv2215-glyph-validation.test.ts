/**
 * TDV2215 Glyph Validation Tests
 * Port of C# TDV2215CharSetScreenshotTests.cs glyph validation parts.
 *
 * Validates FontTDV2215 glyph coverage for all character sets,
 * subscript/superscript ranges, and national variant differences.
 */
import { describe, it, expect } from 'vitest';
import { FontTDV2215 } from '../../../src/fonts/FontTDV2215';

describe('TDV2215 Glyph Validation', () => {
  describe('Character set 2 (Line Drawing) glyph coverage', () => {
    it('all printable chars 0x20-0x7E should return non-null glyphs', () => {
      const font = new FontTDV2215();
      const failures: string[] = [];
      for (let charCode = 0x20; charCode <= 0x7E; charCode++) {
        const bits = font.getFontBits(charCode, 2);
        if (bits === null) {
          failures.push(`0x${charCode.toString(16).padStart(2, '0')}`);
        }
      }
      expect(failures.length).toBe(0);
    });
  });

  describe('Character set 3 (Subscript) valid range', () => {
    it('positions 0x00-0x19 should have non-zero glyph data', () => {
      const font = new FontTDV2215();
      const failures: string[] = [];
      for (let charCode = 0x00; charCode <= 0x19; charCode++) {
        const bits = font.getFontBits(charCode, 3);
        if (bits === null) {
          failures.push(`0x${charCode.toString(16).padStart(2, '0')} (null)`);
          continue;
        }
        let hasData = false;
        for (let i = 0; i < bits.length; i++) {
          if (bits[i] !== 0) { hasData = true; break; }
        }
        if (!hasData) {
          failures.push(`0x${charCode.toString(16).padStart(2, '0')} (all zero)`);
        }
      }
      expect(failures.length).toBe(0);
    });

    it('subscript digits 0x00-0x09 should have distinct patterns', () => {
      const font = new FontTDV2215();
      const glyphs: Uint16Array[] = [];
      for (let ch = 0x00; ch <= 0x09; ch++) {
        const bits = font.getFontBits(ch, 3);
        expect(bits).not.toBeNull();
        glyphs.push(bits!);
      }
      // Each subscript digit should be unique
      for (let i = 0; i < glyphs.length; i++) {
        for (let j = i + 1; j < glyphs.length; j++) {
          let same = true;
          for (let k = 0; k < glyphs[i].length; k++) {
            if (glyphs[i][k] !== glyphs[j][k]) { same = false; break; }
          }
          expect(same).toBe(false);
        }
      }
    });

    it('superscript digits 0x10-0x19 should have non-zero data', () => {
      const font = new FontTDV2215();
      for (let ch = 0x10; ch <= 0x19; ch++) {
        const bits = font.getFontBits(ch, 3);
        expect(bits).not.toBeNull();
        let hasData = false;
        for (let i = 0; i < bits!.length; i++) {
          if (bits![i] !== 0) { hasData = true; break; }
        }
        expect(hasData).toBe(true);
      }
    });
  });

  describe('Character set 3 (Subscript) invalid range', () => {
    it('positions 0x60-0x7E should return all-zero arrays', () => {
      const font = new FontTDV2215();
      for (let charCode = 0x60; charCode <= 0x7E; charCode++) {
        const bits = font.getFontBits(charCode, 3);
        if (bits === null) continue; // null is also acceptable
        let allZero = true;
        for (let i = 0; i < bits.length; i++) {
          if (bits[i] !== 0) { allZero = false; break; }
        }
        expect(allZero).toBe(true);
      }
    });
  });

  describe('Character set 4 (Control Display) glyph coverage', () => {
    it('all printable chars 0x20-0x7E should return non-null glyphs', () => {
      const font = new FontTDV2215();
      const failures: string[] = [];
      for (let charCode = 0x20; charCode <= 0x7E; charCode++) {
        const bits = font.getFontBits(charCode, 4);
        if (bits === null) {
          failures.push(`0x${charCode.toString(16).padStart(2, '0')}`);
        }
      }
      expect(failures.length).toBe(0);
    });
  });

  describe('National variant differentiation', () => {
    const variantPositions = [0x5B, 0x5C, 0x5D, 0x7B, 0x7C, 0x7D, 0x7E];

    it('Norwegian variant should differ at all 7 variant positions', () => {
      const intlFont = new FontTDV2215();
      intlFont.characterSetVariant = 0;
      const norFont = new FontTDV2215();
      norFont.characterSetVariant = 1;

      for (const pos of variantPositions) {
        const intlBits = intlFont.getFontBits(pos, 0);
        const norBits = norFont.getFontBits(pos, 0);
        expect(intlBits).not.toBeNull();
        expect(norBits).not.toBeNull();
        let differs = false;
        for (let i = 0; i < intlBits!.length; i++) {
          if (intlBits![i] !== norBits![i]) { differs = true; break; }
        }
        expect(differs).toBe(true);
      }
    });

    it('Swedish variant should differ at all 7 variant positions', () => {
      const intlFont = new FontTDV2215();
      intlFont.characterSetVariant = 0;
      const sweFont = new FontTDV2215();
      sweFont.characterSetVariant = 2;

      for (const pos of variantPositions) {
        const intlBits = intlFont.getFontBits(pos, 0);
        const sweBits = sweFont.getFontBits(pos, 0);
        expect(intlBits).not.toBeNull();
        expect(sweBits).not.toBeNull();
        let differs = false;
        for (let i = 0; i < intlBits!.length; i++) {
          if (intlBits![i] !== sweBits![i]) { differs = true; break; }
        }
        expect(differs).toBe(true);
      }
    });

    it('German variant should differ at all 7 variant positions', () => {
      const intlFont = new FontTDV2215();
      intlFont.characterSetVariant = 0;
      const gerFont = new FontTDV2215();
      gerFont.characterSetVariant = 3;

      for (const pos of variantPositions) {
        const intlBits = intlFont.getFontBits(pos, 0);
        const gerBits = gerFont.getFontBits(pos, 0);
        expect(intlBits).not.toBeNull();
        expect(gerBits).not.toBeNull();
        let differs = false;
        for (let i = 0; i < intlBits!.length; i++) {
          if (intlBits![i] !== gerBits![i]) { differs = true; break; }
        }
        expect(differs).toBe(true);
      }
    });

    it('all variants should share standard ASCII at A (0x41) and 0 (0x30)', () => {
      const fonts: FontTDV2215[] = [];
      for (let v = 0; v <= 3; v++) {
        const f = new FontTDV2215();
        f.characterSetVariant = v;
        fonts.push(f);
      }
      // Check 'A' (0x41)
      const refA = fonts[0].getFontBits(0x41, 0)!;
      for (let v = 1; v <= 3; v++) {
        const bits = fonts[v].getFontBits(0x41, 0)!;
        for (let i = 0; i < refA.length; i++) {
          expect(bits[i]).toBe(refA[i]);
        }
      }
      // Check '0' (0x30)
      const ref0 = fonts[0].getFontBits(0x30, 0)!;
      for (let v = 1; v <= 3; v++) {
        const bits = fonts[v].getFontBits(0x30, 0)!;
        for (let i = 0; i < ref0.length; i++) {
          expect(bits[i]).toBe(ref0[i]);
        }
      }
    });
  });

  describe('Line Drawing vs ASCII differentiation', () => {
    it('at least 50 chars should differ between fontNum=0 and fontNum=2', () => {
      const font = new FontTDV2215();
      let differentCount = 0;
      for (let charCode = 0x21; charCode <= 0x7E; charCode++) {
        const bitsAscii = font.getFontBits(charCode, 0);
        const bitsLD = font.getFontBits(charCode, 2);
        if (bitsAscii === null || bitsLD === null) continue;
        let different = false;
        for (let i = 0; i < Math.min(bitsAscii.length, bitsLD.length); i++) {
          if (bitsAscii[i] !== bitsLD[i]) { different = true; break; }
        }
        if (different) differentCount++;
      }
      expect(differentCount).toBeGreaterThan(50);
    });
  });
});
