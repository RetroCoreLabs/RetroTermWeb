/**
 * TDV2200 Glyph Validation Tests
 * Port of C# TDV2200GlyphValidationTests.cs + TDV2200NationalCharacterTests.cs
 *
 * Validates that FontTDV2200 returns correct bitmap data for each character
 * in all 4 character sets, including national characters in the control code range.
 */
import { describe, it, expect } from 'vitest';
import { FontTDV2200 } from '../../../src/fonts/FontTDV2200';
import { TDV2200Emulator } from '../../../src/emulators/tdv/TDV2200Emulator';

describe('TDV2200 Glyph Validation', () => {
  const font = new FontTDV2200();

  // --- Port of TDV2200GlyphValidationTests.cs ---

  describe('Character set 2 (fontNum=2) glyph coverage', () => {
    it('should return non-null glyphs for all printable chars 0x20-0x7E', () => {
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

  describe('Character set 3 (fontNum=3) glyph coverage', () => {
    it('should return non-null glyphs for all printable chars 0x20-0x7E', () => {
      const failures: string[] = [];
      for (let charCode = 0x20; charCode <= 0x7E; charCode++) {
        const bits = font.getFontBits(charCode, 3);
        if (bits === null) {
          failures.push(`0x${charCode.toString(16).padStart(2, '0')}`);
        }
      }
      expect(failures.length).toBe(0);
    });
  });

  describe('Character set 4 (fontNum=4) glyph coverage', () => {
    it('should return non-null glyphs for all printable chars 0x20-0x7E', () => {
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

  describe('Glyph array lengths', () => {
    it.each([0, 2, 3, 4])('fontNum=%i: all glyphs should have length 16', (fontNum) => {
      const failures: string[] = [];
      for (let charCode = 0x20; charCode <= 0x7E; charCode++) {
        const bits = font.getFontBits(charCode, fontNum);
        if (bits !== null && bits.length !== 16) {
          failures.push(`fontNum=${fontNum} char=0x${charCode.toString(16).padStart(2, '0')} length=${bits.length}`);
        }
      }
      expect(failures.length).toBe(0);
    });
  });

  describe('Letter A shape validation', () => {
    it('should have pixel content in rows 0-9', () => {
      const bits = font.getFontBits(0x41, 0);
      expect(bits).not.toBeNull();
      let hasContent = false;
      for (let i = 0; i < 10; i++) {
        if (bits![i] !== 0) { hasContent = true; break; }
      }
      expect(hasContent).toBe(true);
    });

    it('should have empty bottom rows (baseline padding)', () => {
      const bits = font.getFontBits(0x41, 0);
      expect(bits).not.toBeNull();
      expect(bits![14]).toBe(0);
      expect(bits![15]).toBe(0);
    });
  });

  describe('Space character in different font numbers', () => {
    it.each([0, 2, 3, 4])('fontNum=%i: space should return non-null 16-length glyph', (fontNum) => {
      const bits = font.getFontBits(0x20, fontNum);
      expect(bits).not.toBeNull();
      expect(bits!.length).toBe(16);
    });

    it('should map to correct glyph positions across charsets', () => {
      // Charset 0 space should be blank
      const bits0 = font.getFontBits(0x20, 0);
      let isBlank = true;
      for (let i = 0; i < bits0!.length; i++) {
        if (bits0![i] !== 0) { isBlank = false; break; }
      }
      expect(isBlank).toBe(true);

      // Other charsets space maps to different glyph positions (may have data)
      const bits2 = font.getFontBits(0x20, 2);
      const bits3 = font.getFontBits(0x20, 3);
      const bits4 = font.getFontBits(0x20, 4);
      expect(bits2).not.toBeNull();
      expect(bits3).not.toBeNull();
      expect(bits4).not.toBeNull();
    });
  });

  describe('Character set differentiation', () => {
    it('charset 2 should differ from charset 1 in at least 50 chars', () => {
      let differentCount = 0;
      for (let charCode = 0x21; charCode <= 0x7E; charCode++) {
        const bits1 = font.getFontBits(charCode, 0);
        const bits2 = font.getFontBits(charCode, 2);
        if (bits1 === null || bits2 === null) continue;
        let different = false;
        for (let i = 0; i < Math.min(bits1.length, bits2.length); i++) {
          if (bits1[i] !== bits2[i]) { different = true; break; }
        }
        if (different) differentCount++;
      }
      expect(differentCount).toBeGreaterThan(50);
    });

    it('charset 3 should differ from charset 1 in at least 30 chars', () => {
      let differentCount = 0;
      for (let charCode = 0x21; charCode <= 0x7E; charCode++) {
        const bits1 = font.getFontBits(charCode, 0);
        const bits3 = font.getFontBits(charCode, 3);
        if (bits1 === null || bits3 === null) continue;
        let different = false;
        for (let i = 0; i < Math.min(bits1.length, bits3.length); i++) {
          if (bits1[i] !== bits3[i]) { different = true; break; }
        }
        if (different) differentCount++;
      }
      expect(differentCount).toBeGreaterThan(30);
    });
  });

  describe('Line drawing characters in charset 2', () => {
    it('horizontal line (0x2D) and vertical line (0x7C) should have non-zero pixels', () => {
      const horizontalLine = font.getFontBits(0x2D, 2);
      const verticalLine = font.getFontBits(0x7C, 2);
      expect(horizontalLine).not.toBeNull();
      expect(verticalLine).not.toBeNull();

      let hasHorizContent = false;
      let hasVertContent = false;
      for (let i = 0; i < horizontalLine!.length; i++) {
        if (horizontalLine![i] !== 0) hasHorizContent = true;
        if (verticalLine![i] !== 0) hasVertContent = true;
      }
      expect(hasHorizContent).toBe(true);
      expect(hasVertContent).toBe(true);
    });
  });

  describe('Total glyph count', () => {
    it('should have at least 512 glyphs (4 sets x 128)', () => {
      const actualGlyphCount = font.glyphs.length / 16;
      expect(actualGlyphCount).toBeGreaterThanOrEqual(512);
    });
  });

  // --- Port of TDV2200NationalCharacterTests.cs ---

  describe('National character glyphs (control code range)', () => {
    it('position 0x01 should have A-umlaut glyph (row 1 = 0x0044)', () => {
      const bits = font.getFontBits(0x01, 0);
      expect(bits).not.toBeNull();
      expect(bits![1]).toBe(0x0044);
    });

    it('position 0x04 should have U-umlaut glyph (row 1 = 0x0044)', () => {
      const bits = font.getFontBits(0x04, 0);
      expect(bits).not.toBeNull();
      expect(bits![1]).toBe(0x0044);
    });

    it('position 0x06 should have O-slash glyph (non-zero pixels)', () => {
      const bits = font.getFontBits(0x06, 0);
      expect(bits).not.toBeNull();
      let hasPixels = false;
      for (let i = 0; i < 14; i++) {
        if (bits![i] !== 0) { hasPixels = true; break; }
      }
      expect(hasPixels).toBe(true);
    });

    it('position 0x11 should have lowercase a-umlaut glyph (row 1 = 0x0044)', () => {
      const bits = font.getFontBits(0x11, 0);
      expect(bits).not.toBeNull();
      expect(bits![1]).toBe(0x0044);
    });

    it('position 0x16 should have lowercase a-ring glyph (ring pattern rows 0-2)', () => {
      const bits = font.getFontBits(0x16, 0);
      expect(bits).not.toBeNull();
      expect(bits![0]).toBe(0x0030);
      expect(bits![1]).toBe(0x0048);
      expect(bits![2]).toBe(0x0030);
    });

    it('position 0x0A should have lowercase u-umlaut glyph (row 1 = 0x0048)', () => {
      const bits = font.getFontBits(0x0A, 0);
      expect(bits).not.toBeNull();
      expect(bits![1]).toBe(0x0048);
    });

    it('position 0x1C should have lowercase o-umlaut glyph (row 1 = 0x0048)', () => {
      const bits = font.getFontBits(0x1C, 0);
      expect(bits).not.toBeNull();
      expect(bits![1]).toBe(0x0048);
    });

    it('position 0x1D should have lowercase o-slash glyph (non-zero pixels)', () => {
      const bits = font.getFontBits(0x1D, 0);
      expect(bits).not.toBeNull();
      let hasPixels = false;
      for (let i = 0; i < 14; i++) {
        if (bits![i] !== 0) { hasPixels = true; break; }
      }
      expect(hasPixels).toBe(true);
    });

    it('position 0x10 should have ae-ligature glyph (non-zero pixels)', () => {
      const bits = font.getFontBits(0x10, 0);
      expect(bits).not.toBeNull();
      let hasPixels = false;
      for (let i = 0; i < 14; i++) {
        if (bits![i] !== 0) { hasPixels = true; break; }
      }
      expect(hasPixels).toBe(true);
    });
  });

  describe('ASCII character rendering in emulator', () => {
    it('@ (0x40) should render as @ sign, NOT map to A-umlaut', () => {
      const emulator = new TDV2200Emulator(80, 24);
      emulator.processData(new Uint8Array([0x40]));
      const cell = emulator.buffer.getCell(0, 0);
      expect(cell.codepoint).toBe(0x40); // '@'

      // Font glyph at 0x40 should NOT have the A-umlaut pattern
      const bits = font.getFontBits(0x40, 0);
      expect(bits).not.toBeNull();
      expect(bits![1]).not.toBe(0x0044);
    });

    it('brackets [, \\, ] should render unchanged', () => {
      const emulator = new TDV2200Emulator(80, 24);
      emulator.processData(new Uint8Array([0x5B, 0x5C, 0x5D]));
      expect(emulator.buffer.getCell(0, 0).codepoint).toBe(0x5B); // [
      expect(emulator.buffer.getCell(0, 1).codepoint).toBe(0x5C); // \
      expect(emulator.buffer.getCell(0, 2).codepoint).toBe(0x5D); // ]
    });

    it('braces {, |, } should render unchanged', () => {
      const emulator = new TDV2200Emulator(80, 24);
      emulator.processData(new Uint8Array([0x7B, 0x7C, 0x7D]));
      expect(emulator.buffer.getCell(0, 0).codepoint).toBe(0x7B); // {
      expect(emulator.buffer.getCell(0, 1).codepoint).toBe(0x7C); // |
      expect(emulator.buffer.getCell(0, 2).codepoint).toBe(0x7D); // }
    });

    it('tilde ~ should render unchanged', () => {
      const emulator = new TDV2200Emulator(80, 24);
      emulator.processData(new Uint8Array([0x7E]));
      expect(emulator.buffer.getCell(0, 0).codepoint).toBe(0x7E); // ~
    });
  });
});
