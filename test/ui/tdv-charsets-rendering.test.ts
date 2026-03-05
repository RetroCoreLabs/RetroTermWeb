/**
 * UI tests for TDV graphic character set rendering.
 * Validates all 10 TDV character sets: USASCII, GraphicsI, GraphicsII,
 * Math, Greek, Diacritics, Box, NIX, T, ND — verifying correct
 * fontNumber assignment and character mapping through the full pipeline.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Terminal } from '../../src/terminal/Terminal';

describe('TDV Character Set Rendering', () => {
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

  // Input bytes 0x60-0x7E to test the character set mapping range
  // Note: 0x7F (DEL) is a control character, not printable
  const testBytes = new Uint8Array([
    0x60, 0x61, 0x62, 0x63, 0x64, 0x65, 0x66, 0x67,
    0x68, 0x69, 0x6A, 0x6B, 0x6C, 0x6D, 0x6E, 0x6F,
    0x70, 0x71, 0x72, 0x73, 0x74, 0x75, 0x76, 0x77,
    0x78, 0x79, 0x7A, 0x7B, 0x7C, 0x7D, 0x7E,
  ]);

  function designateG0(charsetNum: number): Uint8Array {
    // ESC ( N — designate charset N to G0
    return new Uint8Array([0x1B, 0x28, 0x30 + charsetNum]);
  }

  function writeCharsetTestRange(): void {
    term.write(testBytes);
  }

  describe('USASCII (charset 0)', () => {
    it('should render characters unchanged', () => {
      term.write(designateG0(0));
      writeCharsetTestRange();
      const buf = term.getEmulator().buffer;
      // USASCII: no mapping, characters pass through
      expect(buf.getCell(0, 0).codepoint).toBe(0x60); // `
      expect(buf.getCell(0, 1).codepoint).toBe(0x61); // a
      expect(buf.getCell(0, 26).codepoint).toBe(0x7A); // z
    });

    it('should have fontNumber 0 for all characters', () => {
      term.write('ABCDEF');
      const buf = term.getEmulator().buffer;
      for (let i = 0; i < 6; i++) {
        expect(buf.getCellRef(0, i).fontNumber).toBe(0);
      }
    });
  });

  describe('Graphics I (charset 1)', () => {
    it('should set fontNumber 2 via SS2', () => {
      // SS2 invokes G2 which defaults to GraphicsI
      term.write('\x1bNA');
      const buf = term.getEmulator().buffer;
      expect(buf.getCellRef(0, 0).fontNumber).toBe(2);
    });

    it('should set fontNumber 2 via LS2 for all characters', () => {
      term.write('\x1bn'); // LS2 -> invoke G2 (GraphicsI)
      writeCharsetTestRange();
      const buf = term.getEmulator().buffer;
      for (let i = 0; i < testBytes.length; i++) {
        expect(buf.getCellRef(0, i).fontNumber).toBe(2);
      }
    });

    it('should store raw bytes for Graphics I (fontNumber=2)', () => {
      // Designate GraphicsI to G0 and write test chars
      term.write(designateG0(1));
      writeCharsetTestRange();
      const buf = term.getEmulator().buffer;
      // GraphicsI has fontNumber=2, so buffer stores RAW INPUT BYTES
      expect(buf.getCell(0, 0).codepoint).toBe(0x60); // raw byte (renders as ◆)
      expect(buf.getCell(0, 1).codepoint).toBe(0x61); // raw byte (renders as ▒)
      expect(buf.getCell(0, 2).codepoint).toBe(0x62); // raw byte (renders as ▓)
      expect(buf.getCell(0, 3).codepoint).toBe(0x63); // raw byte (renders as │)
      // 0x6F, 0x70
      expect(buf.getCell(0, 15).codepoint).toBe(0x6F); // raw byte (renders as ┐)
      expect(buf.getCell(0, 16).codepoint).toBe(0x70); // raw byte (renders as └)
      // 0x74, 0x75
      expect(buf.getCell(0, 20).codepoint).toBe(0x74); // raw byte (renders as ─)
      expect(buf.getCell(0, 21).codepoint).toBe(0x75); // raw byte (renders as ┼)
      // 0x7D, 0x7E
      expect(buf.getCell(0, 29).codepoint).toBe(0x7D); // raw byte (renders as ═)
      expect(buf.getCell(0, 30).codepoint).toBe(0x7E); // raw byte (renders as ╬)
    });
  });

  describe('Graphics II (charset 2)', () => {
    it('should set fontNumber 3 via SS3', () => {
      // SS3 invokes G3 which defaults to GraphicsII
      term.write('\x1bOA');
      const buf = term.getEmulator().buffer;
      expect(buf.getCellRef(0, 0).fontNumber).toBe(3);
    });

    it('should set fontNumber 3 via LS3 for all characters', () => {
      term.write('\x1bo'); // LS3 -> invoke G3 (GraphicsII)
      writeCharsetTestRange();
      const buf = term.getEmulator().buffer;
      for (let i = 0; i < testBytes.length; i++) {
        expect(buf.getCellRef(0, i).fontNumber).toBe(3);
      }
    });

    it('should store raw bytes for Graphics II (fontNumber=3)', () => {
      term.write(designateG0(2));
      writeCharsetTestRange();
      const buf = term.getEmulator().buffer;
      // GraphicsII has fontNumber=3, so buffer stores RAW INPUT BYTES
      expect(buf.getCell(0, 0).codepoint).toBe(0x60); // raw byte (renders as •)
      expect(buf.getCell(0, 1).codepoint).toBe(0x61); // raw byte (renders as ○)
      expect(buf.getCell(0, 2).codepoint).toBe(0x62); // raw byte (renders as ●)
      // 0x6F, 0x70
      expect(buf.getCell(0, 15).codepoint).toBe(0x6F); // raw byte (renders as ←)
      expect(buf.getCell(0, 16).codepoint).toBe(0x70); // raw byte (renders as →)
      // 0x76, 0x77
      expect(buf.getCell(0, 22).codepoint).toBe(0x76); // raw byte (renders as ✓)
      expect(buf.getCell(0, 23).codepoint).toBe(0x77); // raw byte (renders as ✗)
    });
  });

  describe('Math (charset 3)', () => {
    it('should store raw bytes with fontNumber 2 (Greek/Math ROM bank)', () => {
      term.write(designateG0(3));
      writeCharsetTestRange();
      const buf = term.getEmulator().buffer;
      expect(buf.getCell(0, 0).codepoint).toBe(0x60);
      expect(buf.getCell(0, 1).codepoint).toBe(0x61);
      expect(buf.getCell(0, 2).codepoint).toBe(0x62);
      expect(buf.getCellRef(0, 0).fontNumber).toBe(2);
      expect(buf.getCell(0, 9).codepoint).toBe(0x69);
      expect(buf.getCell(0, 10).codepoint).toBe(0x6A);
      expect(buf.getCell(0, 21).codepoint).toBe(0x75);
      expect(buf.getCell(0, 22).codepoint).toBe(0x76);
      expect(buf.getCell(0, 23).codepoint).toBe(0x77);
    });
  });

  describe('Greek (charset 4)', () => {
    it('should store raw bytes with fontNumber 2 (Greek/Math ROM bank)', () => {
      term.write(designateG0(4));
      writeCharsetTestRange();
      const buf = term.getEmulator().buffer;
      expect(buf.getCell(0, 0).codepoint).toBe(0x60);
      expect(buf.getCell(0, 1).codepoint).toBe(0x61);
      expect(buf.getCell(0, 2).codepoint).toBe(0x62);
      expect(buf.getCellRef(0, 0).fontNumber).toBe(2);
      expect(buf.getCell(0, 7).codepoint).toBe(0x67);
      expect(buf.getCell(0, 23).codepoint).toBe(0x77);
      expect(buf.getCell(0, 24).codepoint).toBe(0x78);
      expect(buf.getCell(0, 25).codepoint).toBe(0x79);
    });
  });

  describe('Diacritics (charset 5)', () => {
    it('should store raw bytes with fontNumber 0 (main ASCII)', () => {
      term.write(designateG0(5));
      writeCharsetTestRange();
      const buf = term.getEmulator().buffer;
      expect(buf.getCell(0, 0).codepoint).toBe(0x60);
      expect(buf.getCell(0, 1).codepoint).toBe(0x61);
      expect(buf.getCell(0, 2).codepoint).toBe(0x62);
      expect(buf.getCellRef(0, 0).fontNumber).toBe(0);
      expect(buf.getCell(0, 6).codepoint).toBe(0x66);
      expect(buf.getCell(0, 7).codepoint).toBe(0x67);
      expect(buf.getCell(0, 30).codepoint).toBe(0x7E);
    });
  });

  describe('Box Drawing (charset 6)', () => {
    it('should store raw bytes with fontNumber 2 (graphic symbols)', () => {
      term.write(designateG0(6));
      writeCharsetTestRange();
      const buf = term.getEmulator().buffer;
      expect(buf.getCell(0, 0).codepoint).toBe(0x60);
      expect(buf.getCell(0, 1).codepoint).toBe(0x61);
      expect(buf.getCell(0, 2).codepoint).toBe(0x62);
      expect(buf.getCell(0, 3).codepoint).toBe(0x63);
      expect(buf.getCellRef(0, 0).fontNumber).toBe(2);
      expect(buf.getCell(0, 9).codepoint).toBe(0x69);
      expect(buf.getCell(0, 10).codepoint).toBe(0x6A);
      expect(buf.getCell(0, 30).codepoint).toBe(0x7E);
    });
  });

  describe('NIX/Nordic (charset 7)', () => {
    it('should store raw bytes with fontNumber 0 (main ASCII)', () => {
      term.write(designateG0(7));
      writeCharsetTestRange();
      const buf = term.getEmulator().buffer;
      expect(buf.getCell(0, 0).codepoint).toBe(0x60);
      expect(buf.getCell(0, 1).codepoint).toBe(0x61);
      expect(buf.getCell(0, 2).codepoint).toBe(0x62);
      expect(buf.getCellRef(0, 0).fontNumber).toBe(0);
      expect(buf.getCell(0, 12).codepoint).toBe(0x6C);
      expect(buf.getCell(0, 13).codepoint).toBe(0x6D);
      expect(buf.getCell(0, 14).codepoint).toBe(0x6E);
    });
  });

  describe('Technical (charset 8)', () => {
    it('should store raw bytes with fontNumber 2 (closest ROM match)', () => {
      term.write(designateG0(8));
      writeCharsetTestRange();
      const buf = term.getEmulator().buffer;
      expect(buf.getCell(0, 0).codepoint).toBe(0x60);
      expect(buf.getCell(0, 1).codepoint).toBe(0x61);
      expect(buf.getCell(0, 4).codepoint).toBe(0x64);
      expect(buf.getCellRef(0, 0).fontNumber).toBe(2);
      expect(buf.getCell(0, 30).codepoint).toBe(0x7E);
    });
  });

  describe('ND Private (charset 9)', () => {
    it('should store raw bytes with fontNumber 4 (control display ROM bank)', () => {
      term.write(designateG0(9));
      writeCharsetTestRange();
      const buf = term.getEmulator().buffer;
      expect(buf.getCell(0, 0).codepoint).toBe(0x60);
      expect(buf.getCell(0, 1).codepoint).toBe(0x61);
      expect(buf.getCell(0, 2).codepoint).toBe(0x62);
      expect(buf.getCellRef(0, 0).fontNumber).toBe(4);
      expect(buf.getCell(0, 15).codepoint).toBe(0x6F);
      expect(buf.getCell(0, 16).codepoint).toBe(0x70);
      expect(buf.getCell(0, 17).codepoint).toBe(0x71);
      expect(buf.getCell(0, 18).codepoint).toBe(0x72);
      expect(buf.getCell(0, 30).codepoint).toBe(0x7E);
    });
  });

  describe('Character set switching between multiple sets', () => {
    it('should switch from GraphicsI to Math and back', () => {
      term.write(designateG0(1)); // GraphicsI
      term.write(new Uint8Array([0x60])); // raw byte (renders as ◆)
      term.write(designateG0(3)); // Math
      term.write(new Uint8Array([0x60])); // raw byte (Math now passes through)
      term.write(designateG0(1)); // GraphicsI again
      term.write(new Uint8Array([0x60])); // raw byte (renders as ◆)
      const buf = term.getEmulator().buffer;
      expect(buf.getCell(0, 0).codepoint).toBe(0x60); // raw byte for GraphicsI
      expect(buf.getCellRef(0, 0).fontNumber).toBe(2);
      expect(buf.getCell(0, 1).codepoint).toBe(0x60); // Math: raw byte pass-through
      expect(buf.getCellRef(0, 1).fontNumber).toBe(2);
      expect(buf.getCell(0, 2).codepoint).toBe(0x60); // raw byte for GraphicsI
      expect(buf.getCellRef(0, 2).fontNumber).toBe(2);
    });

    it('should handle characters outside mapping range unchanged', () => {
      term.write(designateG0(4)); // Greek
      term.write('ABC'); // 0x41-0x43 are outside 0x60-0x7F range
      const buf = term.getEmulator().buffer;
      expect(buf.getCell(0, 0).codepoint).toBe(0x41); // A unchanged
      expect(buf.getCell(0, 1).codepoint).toBe(0x42); // B unchanged
    });

    it('should preserve fontNumber through mixed operations', () => {
      // LS2, write, SS3 (single char), continue with LS2
      term.write('\x1bn'); // LS2 (fontNumber 2)
      term.write('A');
      term.write('\x1bOB'); // SS3 (fontNumber 3 for B only)
      term.write('C'); // back to LS2 (fontNumber 2)
      const buf = term.getEmulator().buffer;
      expect(buf.getCellRef(0, 0).fontNumber).toBe(2); // A via LS2
      expect(buf.getCellRef(0, 1).fontNumber).toBe(3); // B via SS3
      expect(buf.getCellRef(0, 2).fontNumber).toBe(2); // C back to LS2
    });
  });

  describe('Character set after RIS', () => {
    it('should reset all character sets to defaults', () => {
      // Set up non-default state
      term.write(designateG0(4)); // Greek to G0
      term.write('\x1bn'); // LS2
      term.write('A');
      // RIS
      term.write('\x1bc');
      term.write('B');
      const buf = term.getEmulator().buffer;
      // After RIS, G0=USASCII, no locking shift
      expect(buf.getCellRef(0, 0).fontNumber).toBe(0);
      expect(buf.getCell(0, 0).codepoint).toBe(0x42); // B unchanged
    });
  });
});
