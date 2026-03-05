/**
 * TDV2215 bitmap font rendering validation tests.
 * Verifies SS2/SS3, LS2/LS3, ISO 646 variant rendering,
 * and that fontNumber values are correctly derived from charset types.
 *
 * Key behavior:
 * - GraphicsI (type 1) → fontNumber=2 (raw bytes, bitmap font bank 2)
 * - GraphicsII (type 2) → fontNumber=3 (raw bytes, bitmap font bank 3)
 * - Charsets 3-9 map to closest ROM bank (Math/Greek/Box/Technical→2, Diacritics/NIX→0, ND→4)
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Terminal } from '../../src/terminal/Terminal';
import { BitmapFontRenderer } from '../../src/renderer/BitmapFontRenderer';
import { FontTDV2215 } from '../../src/fonts/FontTDV2215';

describe('TDV2215 Rendering Validation', () => {
  let container: HTMLElement;
  let term: Terminal;

  beforeEach(() => {
    container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '400px';
    document.body.appendChild(container);
    term = new Terminal({ rows: 24, cols: 80, emulatorType: 'tdv2215' });
    term.open(container);
  });

  afterEach(() => {
    term.dispose();
    document.body.innerHTML = '';
  });

  function emu(): any { return term.getEmulator(); }
  function buf() { return emu().buffer; }

  describe('SS2 rendering with fontNumber', () => {
    it('SS2 should set fontNumber from G2 charset (default GraphicsI, fontNum=2)', () => {
      term.write('\x1b[1;1H');
      term.write('\x1bN');   // SS2
      term.write(String.fromCharCode(0x60)); // one char from G2

      const cell = buf().getCellRef(0, 0);
      expect(cell.fontNumber).toBe(2); // GraphicsI default
      expect(cell.codepoint).toBe(0x60); // raw byte
    });

    it('SS2 should clear after one character', () => {
      term.write('\x1b[1;1H');
      term.write('\x1bN');   // SS2
      term.write(String.fromCharCode(0x60)); // G2 char
      term.write(String.fromCharCode(0x60)); // back to default (G0=USASCII)

      expect(buf().getCellRef(0, 0).fontNumber).toBe(2); // G2
      expect(buf().getCellRef(0, 1).fontNumber).toBe(0); // G0=USASCII
    });

    it('SS2 with Math charset should store raw bytes (fontNum=2)', () => {
      emu().setCharacterSet(2, 3); // G2 = Math
      term.write('\x1b[1;1H');
      term.write('\x1bN');   // SS2
      term.write(String.fromCharCode(0x65));

      const cell = buf().getCellRef(0, 0);
      expect(cell.fontNumber).toBe(2); // Math → bank 2
      expect(cell.codepoint).toBe(0x65); // raw byte pass-through
    });

    it('SS2 with Greek charset should store raw bytes (fontNum=2)', () => {
      emu().setCharacterSet(2, 4); // G2 = Greek
      term.write('\x1b[1;1H');
      term.write('\x1bN');
      term.write(String.fromCharCode(0x60));

      const cell = buf().getCellRef(0, 0);
      expect(cell.fontNumber).toBe(2); // Greek → bank 2
      expect(cell.codepoint).toBe(0x60); // raw byte pass-through
    });
  });

  describe('SS3 rendering with fontNumber', () => {
    it('SS3 should set fontNumber from G3 charset (default GraphicsII, fontNum=3)', () => {
      term.write('\x1b[1;1H');
      term.write('\x1bO');   // SS3
      term.write(String.fromCharCode(0x60)); // one char from G3

      const cell = buf().getCellRef(0, 0);
      expect(cell.fontNumber).toBe(3); // GraphicsII default
      expect(cell.codepoint).toBe(0x60); // raw byte
    });

    it('SS3 should clear after one character', () => {
      term.write('\x1b[1;1H');
      term.write('\x1bO');   // SS3
      term.write(String.fromCharCode(0x60)); // G3 char
      term.write(String.fromCharCode(0x60)); // back to default

      expect(buf().getCellRef(0, 0).fontNumber).toBe(3); // G3
      expect(buf().getCellRef(0, 1).fontNumber).toBe(0); // G0=USASCII
    });

    it('SS3 with Diacritics charset should store raw bytes (fontNum=0)', () => {
      emu().setCharacterSet(3, 5); // G3 = Diacritics
      term.write('\x1b[1;1H');
      term.write('\x1bO');
      term.write(String.fromCharCode(0x60));

      const cell = buf().getCellRef(0, 0);
      expect(cell.fontNumber).toBe(0); // Diacritics → main ASCII
      expect(cell.codepoint).toBe(0x60); // raw byte pass-through
    });

    it('SS3 renders control-range bytes for subscript digits', () => {
      // TDV2215 uses SS3 + control bytes for subscript/superscript
      term.write('\x1b[1;1H');
      term.write('\x1bO');   // SS3
      term.write(String.fromCharCode(0x00)); // subscript 0

      const cell = buf().getCellRef(0, 0);
      expect(cell.fontNumber).toBe(3); // G3=GraphicsII
      expect(cell.codepoint).toBe(0x00); // raw byte preserved
    });
  });

  describe('LS2 locking shift with persistent fontNumber', () => {
    it('ESC n should lock to G2 and set fontNumber for all subsequent chars', () => {
      term.write('\x1b[1;1H');
      term.write('\x1bn');   // LS2 — lock to G2 (GraphicsI)
      term.write(String.fromCharCode(0x60));
      term.write(String.fromCharCode(0x61));
      term.write(String.fromCharCode(0x62));

      for (let i = 0; i < 3; i++) {
        expect(buf().getCellRef(0, i).fontNumber).toBe(2); // GraphicsI
        expect(buf().getCellRef(0, i).codepoint).toBe(0x60 + i); // raw bytes
      }
    });

    it('LS2 with custom G2 charset (Box) should store raw bytes with fontNum=2', () => {
      emu().setCharacterSet(2, 6); // G2 = Box
      term.write('\x1b[1;1H');
      term.write('\x1bn');   // LS2
      term.write(String.fromCharCode(0x60));

      const cell = buf().getCellRef(0, 0);
      expect(cell.fontNumber).toBe(2); // Box → bank 2
      expect(cell.codepoint).toBe(0x60); // raw byte pass-through
    });

    it('LS2 should persist across multiple writes', () => {
      term.write('\x1b[1;1H');
      term.write('\x1bn');   // LS2
      term.write('ABC'); // ASCII chars with G2 font
      term.write(String.fromCharCode(0x60, 0x61, 0x62));

      // All chars should have G2 fontNumber
      for (let i = 0; i < 6; i++) {
        expect(buf().getCellRef(0, i).fontNumber).toBe(2); // GraphicsI
      }
    });
  });

  describe('LS3 locking shift with persistent fontNumber', () => {
    it('ESC o should lock to G3 and set fontNumber for all subsequent chars', () => {
      term.write('\x1b[1;1H');
      term.write('\x1bo');   // LS3 — lock to G3 (GraphicsII)
      term.write(String.fromCharCode(0x60));
      term.write(String.fromCharCode(0x61));

      for (let i = 0; i < 2; i++) {
        expect(buf().getCellRef(0, i).fontNumber).toBe(3); // GraphicsII
        expect(buf().getCellRef(0, i).codepoint).toBe(0x60 + i); // raw bytes
      }
    });

    it('LS3 with NIX charset should store raw bytes (fontNum=0)', () => {
      emu().setCharacterSet(3, 7); // G3 = NIX
      term.write('\x1b[1;1H');
      term.write('\x1bo');   // LS3
      term.write(String.fromCharCode(0x60));

      const cell = buf().getCellRef(0, 0);
      expect(cell.fontNumber).toBe(0); // NIX → main ASCII
      expect(cell.codepoint).toBe(0x60); // raw byte pass-through
    });
  });

  describe('Locking shift reset', () => {
    it('reset should clear locking shift state', () => {
      term.write('\x1bn');   // LS2
      term.write('\x1b[1;1H');
      term.write(String.fromCharCode(0x60));
      expect(buf().getCellRef(0, 0).fontNumber).toBe(2); // GraphicsI

      // Reset
      term.write('\x1bc'); // RIS (Reset to Initial State)
      term.write(String.fromCharCode(0x41)); // 'A'

      expect(buf().getCellRef(0, 0).fontNumber).toBe(0); // USASCII
    });
  });

  describe('SS2/SS3 interaction with locking shifts', () => {
    it('SS2 should temporarily override LS3, then return to LS3', () => {
      // Keep G2 as GraphicsI (default, fontNum=2)
      term.write('\x1b[1;1H');
      term.write('\x1bo');   // LS3 — lock to G3 (GraphicsII)
      term.write(String.fromCharCode(0x60)); // from G3

      // SS2 override for one char
      term.write('\x1bN');   // SS2
      term.write(String.fromCharCode(0x60)); // from G2 (GraphicsI)

      // Back to LS3
      term.write(String.fromCharCode(0x60)); // from G3 again

      expect(buf().getCellRef(0, 0).fontNumber).toBe(3); // G3=GraphicsII
      expect(buf().getCellRef(0, 1).fontNumber).toBe(2); // G2=GraphicsI (SS2)
      expect(buf().getCellRef(0, 2).fontNumber).toBe(3); // G3=GraphicsII (back to LS3)
    });
  });

  describe('ISO 646 variant rendering', () => {
    it('Norwegian variant should be settable via ESC % N', () => {
      // Set Norwegian variant: ESC % N (0x4E)
      term.write('\x1b%N');
      expect(emu().characterSetVariant).toBe(1); // Norwegian
    });

    it('Swedish variant should be settable via ESC % S', () => {
      term.write('\x1b%S');
      expect(emu().characterSetVariant).toBe(2); // Swedish
    });

    it('German variant should be settable via ESC % G', () => {
      term.write('\x1b%G');
      expect(emu().characterSetVariant).toBe(3); // German
    });

    it('International variant should be settable via ESC % I', () => {
      term.write('\x1b%N'); // Set Norwegian first
      expect(emu().characterSetVariant).toBe(1);
      term.write('\x1b%I'); // Back to International
      expect(emu().characterSetVariant).toBe(0);
    });
  });

  describe('FontTDV2215 glyph availability for TDV2215 rendering', () => {
    it('BitmapFontRenderer should have glyphs for ASCII range', () => {
      const renderer = new BitmapFontRenderer(new FontTDV2215());
      let nullCount = 0;
      for (let ch = 0x21; ch <= 0x7E; ch++) {
        const pixels = renderer.getGlyphPixels(ch, 0);
        if (pixels === null) nullCount++;
      }
      expect(nullCount).toBeLessThan(5);
    });

    it('drawCharacter should return true for ASCII chars', () => {
      const renderer = new BitmapFontRenderer(new FontTDV2215());
      const ctx = {
        fillStyle: '',
        fillRect: vi.fn(),
      } as unknown as CanvasRenderingContext2D;

      let successCount = 0;
      for (let ch = 0x21; ch <= 0x7E; ch++) {
        const result = renderer.drawCharacter(
          ctx, ch, 0, 0, 0, 0, '#fff', 9, 14,
        );
        if (result) successCount++;
      }
      expect(successCount).toBeGreaterThan(85); // most of 94 printable chars
    });
  });

  describe('Full terminal integration', () => {
    it('should have renderer configured with bitmap font', () => {
      term.write('Hello TDV2215');
      const renderer = (term as any)._renderer;
      expect(renderer).toBeDefined();
      expect(renderer.isBitmapFontActive).toBe(true);
    });

    it('mixed ASCII and charset text should set correct fontNumbers', () => {
      term.write('\x1b[1;1H');
      term.write('A'); // ASCII
      term.write('\x1bN'); // SS2
      term.write(String.fromCharCode(0x60)); // G2 char
      term.write('B'); // back to ASCII

      expect(buf().getCellRef(0, 0).fontNumber).toBe(0); // ASCII
      expect(buf().getCellRef(0, 0).codepoint).toBe(0x41); // 'A'
      expect(buf().getCellRef(0, 1).fontNumber).toBe(2); // G2=GraphicsI
      expect(buf().getCellRef(0, 1).codepoint).toBe(0x60); // raw byte
      expect(buf().getCellRef(0, 2).fontNumber).toBe(0); // ASCII
      expect(buf().getCellRef(0, 2).codepoint).toBe(0x42); // 'B'
    });
  });
});
