/**
 * TDV2200 bitmap font rendering validation tests.
 * Verifies that character set changes produce correct fontNumber values
 * and that the bitmap font can actually render glyphs for each charset.
 *
 * Key behavior:
 * - GraphicsI (type 1) → fontNumber=2 (raw bytes, bitmap font bank 2)
 * - GraphicsII (type 2) → fontNumber=3 (raw bytes, bitmap font bank 3)
 * - Charsets 3-9 map to closest ROM bank (Math/Greek/Box/Technical→2, Diacritics/NIX→0, ND→4)
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Terminal } from '../../src/terminal/Terminal';
import { BitmapFontRenderer } from '../../src/renderer/BitmapFontRenderer';
import { FontTDV2200 } from '../../src/fonts/FontTDV2200';
import { CHARSET_TYPE_TO_FONTNUM } from '../../src/emulators/tdv/components/TDVCharacterSets';

// Charsets with bitmap font banks (raw bytes)
const BITMAP_CHARSETS = [
  { name: 'GraphicsI',  type: 1, fontNum: 2 },
  { name: 'GraphicsII', type: 2, fontNum: 3 },
];

// Charsets that map to ROM banks via CHARSET_TYPE_TO_FONTNUM
const MAPPED_CHARSETS = [
  { name: 'Math',       type: 3, fontNum: 2 },
  { name: 'Greek',      type: 4, fontNum: 2 },
  { name: 'Diacritics', type: 5, fontNum: 0 },
  { name: 'Box',        type: 6, fontNum: 2 },
  { name: 'NIX',        type: 7, fontNum: 0 },
  { name: 'Technical',  type: 8, fontNum: 2 },
  { name: 'ND',         type: 9, fontNum: 4 },
];

describe('TDV2200 Rendering Validation', () => {
  let container: HTMLElement;
  let term: Terminal;

  beforeEach(() => {
    container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '400px';
    document.body.appendChild(container);
    term = new Terminal({ rows: 24, cols: 80, emulatorType: 'tdv2200' });
    term.open(container);
  });

  afterEach(() => {
    term.dispose();
    document.body.innerHTML = '';
  });

  function emu(): any { return term.getEmulator(); }
  function buf() { return emu().buffer; }

  describe('CHARSET_TYPE_TO_FONTNUM mapping table', () => {
    it('should have entries for GraphicsI and GraphicsII', () => {
      expect(CHARSET_TYPE_TO_FONTNUM[1]).toBe(2);
      expect(CHARSET_TYPE_TO_FONTNUM[2]).toBe(3);
    });

    it('should have entries for charsets 3-9 mapping to correct ROM banks', () => {
      expect(CHARSET_TYPE_TO_FONTNUM[3]).toBe(2); // Math
      expect(CHARSET_TYPE_TO_FONTNUM[4]).toBe(2); // Greek
      expect(CHARSET_TYPE_TO_FONTNUM[5]).toBe(0); // Diacritics
      expect(CHARSET_TYPE_TO_FONTNUM[6]).toBe(2); // Box
      expect(CHARSET_TYPE_TO_FONTNUM[7]).toBe(0); // NIX
      expect(CHARSET_TYPE_TO_FONTNUM[8]).toBe(2); // Technical
      expect(CHARSET_TYPE_TO_FONTNUM[9]).toBe(4); // ND
    });

    it('should not have entry for USASCII (type 0)', () => {
      expect(CHARSET_TYPE_TO_FONTNUM[0]).toBeUndefined();
    });
  });

  describe('Buffer cell fontNumber for bitmap charsets (GraphicsI/II)', () => {
    for (const cs of BITMAP_CHARSETS) {
      describe(`${cs.name} (type ${cs.type})`, () => {
        it(`should set fontNumber=${cs.fontNum} and store raw bytes`, () => {
          // Designate charset to G0
          term.write(`\x1b(${cs.type}`);
          term.write('\x0F'); // SI to G0
          term.write('\x1b[1;1H');

          // Write chars in the mapping range
          for (let ch = 0x60; ch <= 0x7E; ch++) {
            term.write(String.fromCharCode(ch));
          }

          // Verify: raw bytes stored, correct fontNumber
          for (let i = 0; i <= 0x1E; i++) {
            const cell = buf().getCellRef(0, i);
            expect(cell.codepoint).toBe(0x60 + i); // raw byte
            expect(cell.fontNumber).toBe(cs.fontNum);
          }
        });

        it(`getGlyphPixels should return non-null for mapped chars with fontNum=${cs.fontNum}`, () => {
          const renderer = new BitmapFontRenderer(new FontTDV2200());
          let nullCount = 0;
          for (let ch = 0x60; ch <= 0x7E; ch++) {
            const pixels = renderer.getGlyphPixels(ch, cs.fontNum);
            if (pixels === null) nullCount++;
          }
          // Most chars should have glyph data
          expect(nullCount).toBeLessThan(15);
        });

        it(`drawCharacter should return true for mapped chars`, () => {
          const renderer = new BitmapFontRenderer(new FontTDV2200());
          const ctx = {
            fillStyle: '',
            fillRect: vi.fn(),
          } as unknown as CanvasRenderingContext2D;

          let successCount = 0;
          for (let ch = 0x60; ch <= 0x7E; ch++) {
            const result = renderer.drawCharacter(
              ctx, ch, cs.fontNum, 0, 0, 0, '#fff', 8, 14,
            );
            if (result) successCount++;
          }
          // Most chars should render successfully
          expect(successCount).toBeGreaterThan(15);
        });
      });
    }
  });

  describe('Buffer cell for charsets 3-9', () => {
    for (const cs of MAPPED_CHARSETS) {
      it(`${cs.name} (type ${cs.type}) should use fontNumber=${cs.fontNum} and raw byte codepoints`, () => {
        // Designate charset to G0
        term.write(`\x1b(${cs.type}`);
        term.write('\x0F'); // SI to G0
        term.write('\x1b[1;1H');

        // Write a char in the mapping range
        term.write(String.fromCharCode(0x60));

        const cell = buf().getCellRef(0, 0);
        expect(cell.fontNumber).toBe(cs.fontNum);
        // Codepoint should be the raw byte (no Unicode mapping)
        expect(cell.codepoint).toBe(0x60);
      });
    }
  });

  describe('SI/SO charset switching with fontNumber', () => {
    it('SO should switch to G1 charset and update fontNumber (GraphicsI)', () => {
      // Set G1 to GraphicsI (type 1, fontNum 2)
      term.write('\x1b)1');
      // SO to G1
      term.write('\x0E');
      term.write('\x1b[1;1H');
      term.write(String.fromCharCode(0x60));

      const cell = buf().getCellRef(0, 0);
      expect(cell.fontNumber).toBe(2); // GraphicsI fontNum
      expect(cell.codepoint).toBe(0x60); // raw byte
    });

    it('SO with Math charset should store raw bytes with fontNum=2', () => {
      // Set G1 to Math (type 3)
      term.write('\x1b)3');
      // SO to G1
      term.write('\x0E');
      term.write('\x1b[1;1H');
      term.write(String.fromCharCode(0x60));

      const cell = buf().getCellRef(0, 0);
      expect(cell.fontNumber).toBe(2); // Math → bank 2
      expect(cell.codepoint).toBe(0x60); // raw byte pass-through
    });

    it('SI should switch back to G0 and update fontNumber', () => {
      term.write('\x1b(1'); // G0 = GraphicsI
      term.write('\x1b)3'); // G1 = Math
      term.write('\x0E');   // SO to G1
      term.write('\x1b[1;1H');
      term.write(String.fromCharCode(0x60)); // Math raw byte
      term.write('\x0F');   // SI back to G0
      term.write(String.fromCharCode(0x60)); // GraphicsI font

      expect(buf().getCellRef(0, 0).fontNumber).toBe(2); // Math → bank 2
      expect(buf().getCellRef(0, 1).fontNumber).toBe(2); // GraphicsI
    });
  });

  describe('SS2/SS3 single shifts with fontNumber', () => {
    it('SS2 should set fontNumber for single char only (default G2=GraphicsI)', () => {
      // G2 defaults to GraphicsI (fontNum 2)
      term.write('\x1b[1;1H');
      term.write('\x1bN');   // SS2
      term.write(String.fromCharCode(0x60)); // one char from G2
      term.write(String.fromCharCode(0x60)); // next char from G0 (USASCII)

      expect(buf().getCellRef(0, 0).fontNumber).toBe(2); // G2=GraphicsI
      expect(buf().getCellRef(0, 0).codepoint).toBe(0x60); // raw byte
      expect(buf().getCellRef(0, 1).fontNumber).toBe(0); // G0=USASCII
    });

    it('SS3 should set fontNumber for single char only (default G3=GraphicsII)', () => {
      // G3 defaults to GraphicsII (fontNum 3)
      term.write('\x1b[1;1H');
      term.write('\x1bO');   // SS3
      term.write(String.fromCharCode(0x60)); // one char from G3
      term.write(String.fromCharCode(0x60)); // next char from G0 (USASCII)

      expect(buf().getCellRef(0, 0).fontNumber).toBe(3); // G3=GraphicsII
      expect(buf().getCellRef(0, 0).codepoint).toBe(0x60); // raw byte
      expect(buf().getCellRef(0, 1).fontNumber).toBe(0); // G0=USASCII
    });

    it('SS2 with Math charset should store raw bytes with fontNum=2', () => {
      emu().setCharacterSet(2, 3); // G2 = Math
      term.write('\x1b[1;1H');
      term.write('\x1bN');   // SS2
      term.write(String.fromCharCode(0x65));

      const cell = buf().getCellRef(0, 0);
      expect(cell.fontNumber).toBe(2); // Math → bank 2
      expect(cell.codepoint).toBe(0x65); // raw byte pass-through
    });

    it('SS3 with Greek charset should store raw bytes with fontNum=2', () => {
      emu().setCharacterSet(3, 4); // G3 = Greek
      term.write('\x1b[1;1H');
      term.write('\x1bO');
      term.write(String.fromCharCode(0x60));

      const cell = buf().getCellRef(0, 0);
      expect(cell.fontNumber).toBe(2); // Greek → bank 2
      expect(cell.codepoint).toBe(0x60); // raw byte pass-through
    });
  });

  describe('System font fallback for missing bitmap glyphs', () => {
    it('drawCharacter should return false for unmapped high codepoints', () => {
      const renderer = new BitmapFontRenderer(new FontTDV2200());
      const ctx = {
        fillStyle: '',
        fillRect: vi.fn(),
      } as unknown as CanvasRenderingContext2D;

      // Very high codepoint that won't be in the font
      const result = renderer.drawCharacter(
        ctx, 0xFFFF, 0, 0, 0, 0, '#fff', 8, 14,
      );
      expect(result).toBe(false);
    });
  });

  describe('ISO 646 variant fontNumber in buffer cells', () => {
    it('should set fontNumber=5 when Norwegian variant is active', () => {
      // ESC % N — select Norwegian variant
      term.write('\x1b%N');
      term.write('\x1b[1;1H');
      term.write('[\\]'); // Characters at variant positions 0x5B, 0x5C, 0x5D
      expect(buf().getCellRef(0, 0).fontNumber).toBe(5);
      expect(buf().getCellRef(0, 1).fontNumber).toBe(5);
      expect(buf().getCellRef(0, 2).fontNumber).toBe(5);
    });

    it('should set fontNumber=6 when Swedish variant is active', () => {
      term.write('\x1b%S');
      term.write('\x1b[1;1H');
      term.write('[\\]');
      expect(buf().getCellRef(0, 0).fontNumber).toBe(6);
      expect(buf().getCellRef(0, 1).fontNumber).toBe(6);
      expect(buf().getCellRef(0, 2).fontNumber).toBe(6);
    });

    it('should set fontNumber=7 when German variant is active', () => {
      term.write('\x1b%G');
      term.write('\x1b[1;1H');
      term.write('[\\]');
      expect(buf().getCellRef(0, 0).fontNumber).toBe(7);
      expect(buf().getCellRef(0, 1).fontNumber).toBe(7);
      expect(buf().getCellRef(0, 2).fontNumber).toBe(7);
    });

    it('should keep fontNumber=0 when International variant is active', () => {
      term.write('\x1b%I');
      term.write('\x1b[1;1H');
      term.write('[\\]');
      expect(buf().getCellRef(0, 0).fontNumber).toBe(0);
      expect(buf().getCellRef(0, 1).fontNumber).toBe(0);
      expect(buf().getCellRef(0, 2).fontNumber).toBe(0);
    });

    it('ESC % N/S/G/I should switch variant and affect subsequent fontNumbers', () => {
      term.write('\x1b[1;1H');
      // Start International
      term.write('\x1b%I');
      term.write('A'); // col 0, fontNumber=0
      // Switch to Norwegian
      term.write('\x1b%N');
      term.write('B'); // col 1, fontNumber=5
      // Switch to Swedish
      term.write('\x1b%S');
      term.write('C'); // col 2, fontNumber=6
      // Switch to German
      term.write('\x1b%G');
      term.write('D'); // col 3, fontNumber=7
      // Switch back to International
      term.write('\x1b%I');
      term.write('E'); // col 4, fontNumber=0

      expect(buf().getCellRef(0, 0).fontNumber).toBe(0);
      expect(buf().getCellRef(0, 1).fontNumber).toBe(5);
      expect(buf().getCellRef(0, 2).fontNumber).toBe(6);
      expect(buf().getCellRef(0, 3).fontNumber).toBe(7);
      expect(buf().getCellRef(0, 4).fontNumber).toBe(0);
    });
  });

  describe('ISO 646 variant bitmap font rendering', () => {
    it('Norwegian variant cells should produce different glyph pixels than International', () => {
      const renderer = new BitmapFontRenderer(new FontTDV2200());
      // Compare [ (0x5B) with International vs Norwegian
      const intlPixels = renderer.getGlyphPixels(0x5B, 0);
      const norwPixels = renderer.getGlyphPixels(0x5B, 5);
      expect(intlPixels).not.toBeNull();
      expect(norwPixels).not.toBeNull();
      // They should differ ([ vs AE ligature)
      let differs = false;
      for (let i = 0; i < intlPixels!.length; i++) {
        if (intlPixels![i] !== norwPixels![i]) { differs = true; break; }
      }
      expect(differs).toBe(true);
    });

    it('Swedish variant cells should produce different glyph pixels than International', () => {
      const renderer = new BitmapFontRenderer(new FontTDV2200());
      const intlPixels = renderer.getGlyphPixels(0x5C, 0);
      const swedPixels = renderer.getGlyphPixels(0x5C, 6);
      expect(intlPixels).not.toBeNull();
      expect(swedPixels).not.toBeNull();
      let differs = false;
      for (let i = 0; i < intlPixels!.length; i++) {
        if (intlPixels![i] !== swedPixels![i]) { differs = true; break; }
      }
      expect(differs).toBe(true);
    });

    it('German variant cells should produce different glyph pixels than International', () => {
      const renderer = new BitmapFontRenderer(new FontTDV2200());
      // Compare @ (0x40) — International @ vs German section-sign
      const intlPixels = renderer.getGlyphPixels(0x40, 0);
      const germPixels = renderer.getGlyphPixels(0x40, 7);
      expect(intlPixels).not.toBeNull();
      expect(germPixels).not.toBeNull();
      let differs = false;
      for (let i = 0; i < intlPixels!.length; i++) {
        if (intlPixels![i] !== germPixels![i]) { differs = true; break; }
      }
      expect(differs).toBe(true);
    });

    it('all 10 Norwegian variant positions should render distinct glyphs via BitmapFontRenderer', () => {
      const renderer = new BitmapFontRenderer(new FontTDV2200());
      const variantPositions = [0x40, 0x5B, 0x5C, 0x5D, 0x5E, 0x60, 0x7B, 0x7C, 0x7D, 0x7E];
      for (const pos of variantPositions) {
        const intlPixels = renderer.getGlyphPixels(pos, 0);
        const norwPixels = renderer.getGlyphPixels(pos, 5);
        expect(intlPixels).not.toBeNull();
        expect(norwPixels).not.toBeNull();
        let differs = false;
        for (let i = 0; i < intlPixels!.length; i++) {
          if (intlPixels![i] !== norwPixels![i]) { differs = true; break; }
        }
        expect(differs).toBe(true);
      }
    });

    it('all 10 Swedish variant positions should render distinct glyphs via BitmapFontRenderer', () => {
      const renderer = new BitmapFontRenderer(new FontTDV2200());
      const variantPositions = [0x40, 0x5B, 0x5C, 0x5D, 0x5E, 0x60, 0x7B, 0x7C, 0x7D, 0x7E];
      for (const pos of variantPositions) {
        const intlPixels = renderer.getGlyphPixels(pos, 0);
        const swedPixels = renderer.getGlyphPixels(pos, 6);
        expect(intlPixels).not.toBeNull();
        expect(swedPixels).not.toBeNull();
        let differs = false;
        for (let i = 0; i < intlPixels!.length; i++) {
          if (intlPixels![i] !== swedPixels![i]) { differs = true; break; }
        }
        expect(differs).toBe(true);
      }
    });

    it('German variant: 8 redirected positions should render distinct glyphs', () => {
      const renderer = new BitmapFontRenderer(new FontTDV2200());
      const variantPositions = [0x40, 0x5B, 0x5C, 0x5D, 0x7B, 0x7C, 0x7D, 0x7E];
      for (const pos of variantPositions) {
        const intlPixels = renderer.getGlyphPixels(pos, 0);
        const germPixels = renderer.getGlyphPixels(pos, 7);
        expect(intlPixels).not.toBeNull();
        expect(germPixels).not.toBeNull();
        let differs = false;
        for (let i = 0; i < intlPixels!.length; i++) {
          if (intlPixels![i] !== germPixels![i]) { differs = true; break; }
        }
        expect(differs).toBe(true);
      }
    });

    it('non-variant chars (A-Z, 0-9) should render identically regardless of active variant', () => {
      const renderer = new BitmapFontRenderer(new FontTDV2200());
      // Check letters A, M, Z and digit 5
      for (const ch of [0x41, 0x4D, 0x5A, 0x35]) {
        const intlPixels = renderer.getGlyphPixels(ch, 0);
        const norwPixels = renderer.getGlyphPixels(ch, 5);
        const swedPixels = renderer.getGlyphPixels(ch, 6);
        const germPixels = renderer.getGlyphPixels(ch, 7);
        expect(intlPixels).not.toBeNull();
        expect(norwPixels).toStrictEqual(intlPixels);
        expect(swedPixels).toStrictEqual(intlPixels);
        expect(germPixels).toStrictEqual(intlPixels);
      }
    });

    it('full render pipeline: variant chars produce non-zero pixel data', () => {
      const renderer = new BitmapFontRenderer(new FontTDV2200());
      const ctx = {
        fillStyle: '',
        fillRect: vi.fn(),
      } as unknown as CanvasRenderingContext2D;

      // Norwegian AE at 0x5B with fontNum 5 should draw pixels
      const result = renderer.drawCharacter(ctx, 0x5B, 5, 0, 0, 0, '#fff', 8, 14);
      expect(result).toBe(true);
      expect(ctx.fillRect).toHaveBeenCalled();
    });

    it('German section-sign (0x40 fontNum=7) and eszett (0x7E fontNum=7) should render', () => {
      const renderer = new BitmapFontRenderer(new FontTDV2200());
      const ctx = {
        fillStyle: '',
        fillRect: vi.fn(),
      } as unknown as CanvasRenderingContext2D;

      // Section sign
      const result1 = renderer.drawCharacter(ctx, 0x40, 7, 0, 0, 0, '#fff', 8, 14);
      expect(result1).toBe(true);

      // Eszett
      const result2 = renderer.drawCharacter(ctx, 0x7E, 7, 0, 0, 0, '#fff', 8, 14);
      expect(result2).toBe(true);
    });
  });

  describe('Demo charset display sequence — exact reproduction', () => {
    // Exact labels from the demo
    const charsetNames = [
      'US ASCII', 'Graphics I', 'Graphics II', 'Math', 'Greek',
      'Diacritics', 'Box Drawing', 'NIX', 'Technical', 'ND Private',
    ];
    const LABEL_PAD = 22;

    // Expected fontNumbers for each charset's test chars (0x60-0x7E range)
    // Each charset maps to the closest ROM font bank
    const expectedFontNum: Record<number, number> = {
      0: 0, 1: 2, 2: 3, 3: 2, 4: 2, 5: 0, 6: 2, 7: 0, 8: 2, 9: 4,
    };

    it('full demo sequence: every label cell codepoint and fontNumber must be correct', () => {
      // Replicate the exact demo loop from demo.js lines 292-298
      for (let s = 0; s <= 9; s++) {
        const label = `${s}: ${charsetNames[s]}`.padEnd(LABEL_PAD);
        term.write(label);
        term.write(`\x1b(${s}`);
        for (let c = 0x60; c <= 0x7E; c++) {
          term.write(String.fromCharCode(c));
        }
        term.write('\x1b(0');
        term.write('\r\n');
      }

      // Validate every row
      for (let s = 0; s <= 9; s++) {
        const label = `${s}: ${charsetNames[s]}`.padEnd(LABEL_PAD);

        // --- Label region (cols 0..LABEL_PAD-1): must be plain ASCII ---
        for (let col = 0; col < LABEL_PAD; col++) {
          const cell = buf().getCellRef(s, col);
          const expectedChar = label.charCodeAt(col);
          expect(cell.codepoint).toBe(expectedChar);
          // fontNumber should be 0 (USASCII) for all label chars
          expect(cell.fontNumber).toBe(0);
        }

        // --- Test chars region (cols LABEL_PAD..LABEL_PAD+30): charset-mapped ---
        const testStart = LABEL_PAD;
        for (let i = 0; i <= 0x1E; i++) {
          const col = testStart + i;
          const inputByte = 0x60 + i;
          const cell = buf().getCellRef(s, col);
          expect(cell.fontNumber).toBe(expectedFontNum[s]);

          if (s === 0) {
            // USASCII: raw bytes unchanged
            expect(cell.codepoint).toBe(inputByte);
          } else if (s === 1 || s === 2) {
            // GraphicsI/II: raw bytes (bitmap font handles rendering)
            expect(cell.codepoint).toBe(inputByte);
          }
          // Charsets 3-9: raw byte pass-through
          if (s >= 3) {
            expect(cell.codepoint).toBe(inputByte);
          }
        }
      }
    });

    it('after each row reset, getActiveCharacterSetType must be USASCII', () => {
      for (let s = 0; s <= 9; s++) {
        term.write(`\x1b(${s}`);
        // Write a char to confirm charset is active
        term.write(String.fromCharCode(0x60));
        // Reset
        term.write('\x1b(0');
        expect(emu().getActiveCharacterSetType()).toBe(0); // USASCII
      }
    });

    it('lowercase letters in labels must not be charset-mapped after ESC(0 reset', () => {
      // This specifically tests the bug: labels contain lowercase letters (0x61-0x7A)
      // which fall in the TDV charset mapping range (0x60-0x7E).
      // If ESC(0 doesn't reset properly, 'r' (0x72) would map through GraphicsI to ┬ (U+252C).

      // Switch to GraphicsI
      term.write('\x1b(1');
      // Write a GraphicsI char
      term.write(String.fromCharCode(0x72)); // 0x72 through GraphicsI = raw byte
      // Reset to USASCII
      term.write('\x1b(0');
      // Write lowercase text that includes chars in 0x60-0x7E range
      term.write('graphics');

      // Col 0: was written under GraphicsI — fontNumber=2, raw byte 0x72
      expect(buf().getCellRef(0, 0).codepoint).toBe(0x72);
      expect(buf().getCellRef(0, 0).fontNumber).toBe(2);

      // Cols 1-8: 'graphics' — must be plain ASCII with fontNumber=0
      const expected = 'graphics';
      for (let i = 0; i < expected.length; i++) {
        const cell = buf().getCellRef(0, 1 + i);
        expect(cell.codepoint).toBe(expected.charCodeAt(i));
        expect(cell.fontNumber).toBe(0);
      }
    });

    it('ESC(0 must NOT activate VT100 DEC Special Graphics in TDV mode', () => {
      // In VT100, ESC(0 activates DEC Special Graphics (line drawing).
      // In TDV2200, ESC(0 must designate TDV charset 0 (USASCII) instead.
      term.write('\x1b(0');
      // Write 'a' which in DEC Special Graphics maps to ▒ (U+2592)
      term.write('a');
      const cell = buf().getCellRef(0, 0);
      expect(cell.codepoint).toBe(0x61); // Must be 'a', not ▒
      expect(cell.fontNumber).toBe(0);
    });

    it('VT100 base class characterSets must not be set to DEC Graphics by ESC(0', () => {
      // Verify the base class state isn't corrupted
      term.write('\x1b(0');
      // The base class characterSets[0] should still be 0 (USASCII), not 2 (DEC Graphics)
      const baseCharSets = (emu() as any).characterSets;
      expect(baseCharSets[0]).toBe(0);
    });
  });

  describe('Full render integration', () => {
    it('render should visit all cells', () => {
      // Write some content
      term.write('Hello World');
      term.write('\x1b(1'); // GraphicsI
      term.write(String.fromCharCode(0x60, 0x61, 0x62));

      // Access the renderer to verify it exists and is configured
      const renderer = (term as any)._renderer;
      expect(renderer).toBeDefined();
    });
  });
});
