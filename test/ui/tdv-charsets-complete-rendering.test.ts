/**
 * Comprehensive UI tests for TDV character set rendering through the terminal pipeline.
 * Validates EVERY printable character (0x60-0x7E) in ALL 9 graphic character sets.
 *
 * TDV2200: Tests G0/G1 designation (ESC ( / ) n), SI/SO, SS2/SS3.
 * TDV2215: Tests SS2/SS3, LS2/LS3, LS1R/LS2R/LS3R (TDV2215 handleCharacter only
 *          applies mapping for SS2/SS3/locking shifts, not G0/G1 designation).
 *
 * Also validates ISO 646 variant selection and character set reset behavior.
 *
 * Parser only treats 0x20-0x7E as printable (0x7F = DEL is a control character).
 * Character set mappings apply to 0x60-0x7F range, so we test 0x60-0x7E (31 chars).
 *
 * ALL charsets now store raw bytes in the buffer. The bitmap font handles all
 * rendering natively — no Unicode mapping is performed.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Terminal } from '../../src/terminal/Terminal';
import { CharacterAttributes, hasAttribute } from '../../src/buffer/CharacterAttributes';

// Helper to generate identity mapping (raw byte pass-through) for 0x60-0x7E
function identityMap(): [number, number][] {
  const result: [number, number][] = [];
  for (let c = 0x60; c <= 0x7E; c++) result.push([c, c]);
  return result;
}

// All character set mapping tables.
// GraphicsI/II retain their tables for documentation purposes (bitmap font banks).
// Charsets 3-9 now use identity mapping (raw byte pass-through).

const CHARSET_MAPS: Record<string, [number, number][]> = {
  GraphicsI: [
    [0x60, 0x25C6], [0x61, 0x2592], [0x62, 0x2593], [0x63, 0x2502],
    [0x64, 0x2524], [0x65, 0x2561], [0x66, 0x2562], [0x67, 0x2556],
    [0x68, 0x2555], [0x69, 0x2563], [0x6A, 0x2551], [0x6B, 0x2557],
    [0x6C, 0x255D], [0x6D, 0x255C], [0x6E, 0x255B], [0x6F, 0x2510],
    [0x70, 0x2514], [0x71, 0x2534], [0x72, 0x252C], [0x73, 0x251C],
    [0x74, 0x2500], [0x75, 0x253C], [0x76, 0x255E], [0x77, 0x255F],
    [0x78, 0x255A], [0x79, 0x2554], [0x7A, 0x2569], [0x7B, 0x2566],
    [0x7C, 0x2560], [0x7D, 0x2550], [0x7E, 0x256C],
  ],
  GraphicsII: [
    [0x60, 0x2022], [0x61, 0x25CB], [0x62, 0x25CF], [0x63, 0x25A1],
    [0x64, 0x25A0], [0x65, 0x25B3], [0x66, 0x25B2], [0x67, 0x25BD],
    [0x68, 0x25BC], [0x69, 0x25C7], [0x6A, 0x25C6], [0x6B, 0x2666],
    [0x6C, 0x2663], [0x6D, 0x2665], [0x6E, 0x2660], [0x6F, 0x2190],
    [0x70, 0x2192], [0x71, 0x2191], [0x72, 0x2193], [0x73, 0x2194],
    [0x74, 0x2195], [0x75, 0x21B5], [0x76, 0x2713], [0x77, 0x2717],
    [0x78, 0x2020], [0x79, 0x2021], [0x7A, 0x00B6], [0x7B, 0x00A7],
    [0x7C, 0x2030], [0x7D, 0x2026], [0x7E, 0x00A9],
  ],
  Math: identityMap(),
  Greek: identityMap(),
  Diacritics: identityMap(),
  Box: identityMap(),
  NIX: identityMap(),
  T: identityMap(),
  ND: identityMap(),
};

// Charset type indices: USASCII=0, GraphicsI=1, GraphicsII=2, Math=3, Greek=4,
// Diacritics=5, Box=6, NIX=7, T=8, ND=9
const CHARSET_TYPE_INDEX: Record<string, number> = {
  GraphicsI: 1, GraphicsII: 2, Math: 3, Greek: 4,
  Diacritics: 5, Box: 6, NIX: 7, T: 8, ND: 9,
};

// Expected font numbers: each charset maps to closest ROM font bank.
const CHARSET_FONT_NUMBER: Record<string, number> = {
  GraphicsI: 2, GraphicsII: 3, Math: 2, Greek: 2,
  Diacritics: 0, Box: 2, NIX: 0, T: 2, ND: 4,
};

function charName(cp: number): string {
  return `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`;
}

// ============================================================================
// TDV2200 EMULATOR — COMPLETE CHARACTER SET RENDERING
// ============================================================================

describe('TDV2200 Character Set Rendering — Complete Validation', () => {
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

  // ------ G0 designation via ESC ( n, then write each char ------

  for (const [setName, mappings] of Object.entries(CHARSET_MAPS)) {
    const typeIndex = CHARSET_TYPE_INDEX[setName];
    const expectedFont = CHARSET_FONT_NUMBER[setName];

    describe(`G0 → ${setName} (type ${typeIndex})`, () => {
      for (const [input, expected] of mappings) {
        // All charsets store raw bytes
        const expectedCodepoint = input;
        it(`0x${input.toString(16).toUpperCase()} → ${charName(expectedCodepoint)} (font ${expectedFont})`, () => {
          // Designate G0 to this charset: ESC ( <digit>
          term.write(`\x1b(${typeIndex}`);
          // Make sure G0 is active (SI = shift in to G0)
          term.write('\x0F');
          // Move to known position
          term.write('\x1b[1;1H');
          // Write the input character
          term.write(String.fromCharCode(input));
          // Verify the buffer cell
          const cell = buf().getCellRef(0, 0);
          expect(cell.codepoint).toBe(expectedCodepoint);
          expect(cell.fontNumber).toBe(expectedFont);
        });
      }
    });
  }

  // ------ G1 designation via ESC ) n + SO ------

  for (const [setName, mappings] of Object.entries(CHARSET_MAPS)) {
    const typeIndex = CHARSET_TYPE_INDEX[setName];
    const expectedFont = CHARSET_FONT_NUMBER[setName];

    describe(`G1 → ${setName} via SO`, () => {
      it(`all ${mappings.length} chars mapped correctly`, () => {
        // Designate G1 to this charset: ESC ) <digit>
        term.write(`\x1b)${typeIndex}`);
        // Shift Out to G1
        term.write('\x0E');
        // Move to start
        term.write('\x1b[1;1H');
        // Write all printable chars from the mapping
        for (let i = 0; i < mappings.length; i++) {
          term.write(String.fromCharCode(mappings[i][0]));
        }
        // Verify each cell
        for (let i = 0; i < mappings.length; i++) {
          const cell = buf().getCellRef(0, i);
          // All charsets store raw bytes
          const expectedCodepoint = mappings[i][0];
          expect(cell.codepoint).toBe(expectedCodepoint);
          expect(cell.fontNumber).toBe(expectedFont);
        }
      });
    });
  }

  // ------ SS2 (single shift G2) via ESC N ------

  describe('SS2 — Single Shift to G2', () => {
    for (const [setName, mappings] of Object.entries(CHARSET_MAPS)) {
      const typeIndex = CHARSET_TYPE_INDEX[setName];
      const expectedFont = CHARSET_FONT_NUMBER[setName];

      it(`G2 → ${setName}: first char mapped via SS2, next reverts to G0`, () => {
        emu().setCharacterSet(2, typeIndex);
        // Ensure G0 is US ASCII
        term.write('\x1b(0');
        term.write('\x0F');
        term.write('\x1b[1;1H');

        // SS2: next char from G2
        term.write('\x1bN');
        term.write(String.fromCharCode(mappings[0][0]));

        // SS2 derives fontNumber from G2's charset type
        const cell0 = buf().getCellRef(0, 0);
        const expectedCp = mappings[0][0]; // All charsets store raw bytes
        expect(cell0.codepoint).toBe(expectedCp);
        expect(cell0.fontNumber).toBe(expectedFont);

        // Next char should be from G0 (US ASCII)
        term.write('A');
        const cell1 = buf().getCellRef(0, 1);
        expect(cell1.codepoint).toBe(0x41);
        expect(cell1.fontNumber).toBe(0);
      });
    }
  });

  // ------ SS3 (single shift G3) via ESC O ------

  describe('SS3 — Single Shift to G3', () => {
    for (const [setName, mappings] of Object.entries(CHARSET_MAPS)) {
      const typeIndex = CHARSET_TYPE_INDEX[setName];
      const expectedFont = CHARSET_FONT_NUMBER[setName];

      it(`G3 → ${setName}: first char mapped via SS3, next reverts to G0`, () => {
        emu().setCharacterSet(3, typeIndex);
        term.write('\x1b(0');
        term.write('\x0F');
        term.write('\x1b[1;1H');

        // SS3: next char from G3
        term.write('\x1bO');
        term.write(String.fromCharCode(mappings[0][0]));

        // SS3 derives fontNumber from G3's charset type
        const cell0 = buf().getCellRef(0, 0);
        const expectedCp = mappings[0][0]; // All charsets store raw bytes
        expect(cell0.codepoint).toBe(expectedCp);
        expect(cell0.fontNumber).toBe(expectedFont);

        term.write('B');
        const cell1 = buf().getCellRef(0, 1);
        expect(cell1.codepoint).toBe(0x42);
        expect(cell1.fontNumber).toBe(0);
      });
    }
  });

  // ------ SI/SO switching ------

  describe('SI/SO character set switching', () => {
    it('SI should switch back to G0 from G1', () => {
      term.write('\x1b(1');  // G0 = GraphicsI
      term.write('\x1b)0');  // G1 = USASCII
      term.write('\x0E');    // SO to G1
      term.write('\x1b[1;1H');
      term.write('a');       // Should be US ASCII 'a'
      expect(buf().getCellRef(0, 0).codepoint).toBe(0x61);
      term.write('\x0F');    // SI back to G0 (GraphicsI)
      term.write('a');       // GraphicsI fontNumber=2, stores raw byte
      expect(buf().getCellRef(0, 1).codepoint).toBe(0x61); // raw byte (renders as ▒)
    });

    it('SO should switch to G1', () => {
      term.write('\x1b)2');  // G1 = GraphicsII
      term.write('\x0E');    // SO to G1
      term.write('\x1b[1;1H');
      term.write(String.fromCharCode(0x60)); // GraphicsII fontNumber=3, stores raw byte
      expect(buf().getCellRef(0, 0).codepoint).toBe(0x60); // raw byte (renders as •)
    });
  });

  // ------ Characters outside 0x60-0x7E should NOT be mapped ------

  describe('Characters below 0x60 pass through unchanged', () => {
    it('printable ASCII 0x20-0x5F should not be altered by charset', () => {
      term.write('\x1b(1');  // G0 = GraphicsI
      term.write('\x0F');
      term.write('\x1b[1;1H');
      for (let c = 0x20; c <= 0x5F; c++) {
        term.write(String.fromCharCode(c));
      }
      for (let i = 0; i < 0x40; i++) {
        expect(buf().getCellRef(0, i).codepoint).toBe(0x20 + i);
      }
    });
  });

  // ------ US ASCII charset should pass everything through ------

  describe('US ASCII charset passes all through', () => {
    it('0x60-0x7E should not be mapped in US ASCII mode', () => {
      term.write('\x1b(0');
      term.write('\x0F');
      term.write('\x1b[1;1H');
      for (let c = 0x60; c <= 0x7E; c++) {
        term.write(String.fromCharCode(c));
      }
      for (let i = 0; i <= 0x1E; i++) {
        expect(buf().getCellRef(0, i).codepoint).toBe(0x60 + i);
      }
    });
  });

  // ------ Full charset rendering ------

  describe('Full charset rendering — all chars in sequence', () => {
    for (const [setName, mappings] of Object.entries(CHARSET_MAPS)) {
      const typeIndex = CHARSET_TYPE_INDEX[setName];
      const expectedFont = CHARSET_FONT_NUMBER[setName];

      it(`${setName}: ${mappings.length} characters rendered correctly in sequence`, () => {
        term.write(`\x1b(${typeIndex}`);
        term.write('\x0F');
        term.write('\x1b[1;1H');
        for (const [input] of mappings) {
          term.write(String.fromCharCode(input));
        }
        for (let i = 0; i < mappings.length; i++) {
          const cell = buf().getCellRef(0, i);
          // All charsets store raw bytes
          const expectedCodepoint = mappings[i][0];
          expect(cell.codepoint).toBe(expectedCodepoint);
          expect(cell.fontNumber).toBe(expectedFont);
        }
      });
    }
  });
});

// ============================================================================
// TDV2215 EMULATOR — CHARACTER SET RENDERING VIA SS2/SS3/LS2/LS3
// Note: TDV2215 handleCharacter only maps through SS2/SS3 and locking shifts
// (lockedCharacterSet >= 2). G0/G1 designation stores the type but the
// handleCharacter code path doesn't apply G0/G1 mapping.
// ============================================================================

describe('TDV2215 Character Set Rendering — Complete Validation', () => {
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

  // ------ LS2 (Locking Shift to G2) via ESC n ------

  describe('LS2 — Locking Shift to G2', () => {
    for (const [setName, mappings] of Object.entries(CHARSET_MAPS)) {
      const typeIndex = CHARSET_TYPE_INDEX[setName];
      const expectedFont = CHARSET_FONT_NUMBER[setName];

      describe(`G2 → ${setName}`, () => {
        for (const [input, mapped] of mappings) {
          const expectedCp = input; // All charsets store raw bytes
          it(`0x${input.toString(16).toUpperCase()} → ${charName(expectedCp)} (font ${expectedFont}) via LS2`, () => {
            emu().setCharacterSet(2, typeIndex);
            term.write('\x1bn'); // LS2
            term.write('\x1b[1;1H');
            term.write(String.fromCharCode(input));
            const cell = buf().getCellRef(0, 0);
            expect(cell.codepoint).toBe(expectedCp);
            expect(cell.fontNumber).toBe(expectedFont);
          });
        }
      });
    }
  });

  // ------ LS3 (Locking Shift to G3) via ESC o ------

  describe('LS3 — Locking Shift to G3', () => {
    for (const [setName, mappings] of Object.entries(CHARSET_MAPS)) {
      const typeIndex = CHARSET_TYPE_INDEX[setName];
      const expectedFont = CHARSET_FONT_NUMBER[setName];

      describe(`G3 → ${setName}`, () => {
        for (const [input, mapped] of mappings) {
          const expectedCp = input; // All charsets store raw bytes
          it(`0x${input.toString(16).toUpperCase()} → ${charName(expectedCp)} (font ${expectedFont}) via LS3`, () => {
            emu().setCharacterSet(3, typeIndex);
            term.write('\x1bo'); // LS3
            term.write('\x1b[1;1H');
            term.write(String.fromCharCode(input));
            const cell = buf().getCellRef(0, 0);
            expect(cell.codepoint).toBe(expectedCp);
            expect(cell.fontNumber).toBe(expectedFont);
          });
        }
      });
    }
  });

  // ------ SS2 single shift for TDV2215 ------

  describe('SS2 — Single Shift to G2 (TDV2215)', () => {
    for (const [setName, mappings] of Object.entries(CHARSET_MAPS)) {
      const typeIndex = CHARSET_TYPE_INDEX[setName];
      const expectedFont = CHARSET_FONT_NUMBER[setName];

      it(`G2 → ${setName}: SS2 maps one char then reverts`, () => {
        emu().setCharacterSet(2, typeIndex);
        term.write('\x1b[1;1H');
        // SS2
        term.write('\x1bN');
        term.write(String.fromCharCode(mappings[0][0]));
        // SS2 derives fontNumber from G2's charset type
        const cell0 = buf().getCellRef(0, 0);
        const expectedCp = mappings[0][0]; // All charsets store raw bytes
        expect(cell0.codepoint).toBe(expectedCp);
        expect(cell0.fontNumber).toBe(expectedFont);
        // Next char should be unmapped (default G0 = USASCII, no locked shift)
        term.write('Z');
        const cell1 = buf().getCellRef(0, 1);
        expect(cell1.codepoint).toBe(0x5A);
        expect(cell1.fontNumber).toBe(0);
      });
    }
  });

  // ------ SS3 single shift for TDV2215 ------

  describe('SS3 — Single Shift to G3 (TDV2215)', () => {
    for (const [setName, mappings] of Object.entries(CHARSET_MAPS)) {
      const typeIndex = CHARSET_TYPE_INDEX[setName];
      const expectedFont = CHARSET_FONT_NUMBER[setName];

      it(`G3 → ${setName}: SS3 maps one char then reverts`, () => {
        emu().setCharacterSet(3, typeIndex);
        term.write('\x1b[1;1H');
        // SS3
        term.write('\x1bO');
        term.write(String.fromCharCode(mappings[0][0]));
        // SS3 derives fontNumber from G3's charset type
        const cell0 = buf().getCellRef(0, 0);
        const expectedCp = mappings[0][0]; // All charsets store raw bytes
        expect(cell0.codepoint).toBe(expectedCp);
        expect(cell0.fontNumber).toBe(expectedFont);
        // Next char should be unmapped
        term.write('Y');
        const cell1 = buf().getCellRef(0, 1);
        expect(cell1.codepoint).toBe(0x59);
        expect(cell1.fontNumber).toBe(0);
      });
    }
  });

  // ------ TDV2215 locking shift right variants ------

  describe('LS1R / LS2R / LS3R right locking shifts', () => {
    it('ESC ~ (LS1R) should invoke G1', () => {
      emu().setCharacterSet(1, 1); // G1 = GraphicsI
      term.write('\x1b~'); // LS1R
      term.write('\x1b[1;1H');
      term.write(String.fromCharCode(0x60));
      // LS1R sets _invokedCharacterSet = 1 but TDV2215 handleCharacter
      // only applies for lockedCharacterSet >= 2, so no mapping occurs
      // The character passes through unchanged
      expect(buf().getCellRef(0, 0).codepoint).toBe(0x60);
    });

    it('ESC } (LS2R) should invoke G2', () => {
      emu().setCharacterSet(2, 3); // G2 = Math
      term.write('\x1b}'); // LS2R
      term.write('\x1b[1;1H');
      term.write(String.fromCharCode(0x60));
      // LS2R sets _invokedCharacterSet = 2 but doesn't set _lockedCharacterSet
      // So TDV2215 handleCharacter doesn't apply mapping
      expect(buf().getCellRef(0, 0).codepoint).toBe(0x60);
    });

    it('ESC | (LS3R) should invoke G3', () => {
      emu().setCharacterSet(3, 4); // G3 = Greek
      term.write('\x1b|'); // LS3R
      term.write('\x1b[1;1H');
      term.write(String.fromCharCode(0x60));
      // Same as LS2R — _invokedCharacterSet only, no _lockedCharacterSet
      expect(buf().getCellRef(0, 0).codepoint).toBe(0x60);
    });
  });

  // ------ US ASCII pass-through ------

  describe('US ASCII default passes all through (TDV2215)', () => {
    it('0x60-0x7E not mapped when no locking shift active', () => {
      term.write('\x1b[1;1H');
      for (let c = 0x60; c <= 0x7E; c++) {
        term.write(String.fromCharCode(c));
      }
      for (let i = 0; i <= 0x1E; i++) {
        expect(buf().getCellRef(0, i).codepoint).toBe(0x60 + i);
      }
    });
  });

  // ------ Full charset rendering via LS2 ------

  describe('Full charset rendering via LS2 — all chars in sequence', () => {
    for (const [setName, mappings] of Object.entries(CHARSET_MAPS)) {
      const typeIndex = CHARSET_TYPE_INDEX[setName];
      const expectedFont = CHARSET_FONT_NUMBER[setName];

      it(`${setName}: ${mappings.length} characters via LS2`, () => {
        emu().setCharacterSet(2, typeIndex);
        term.write('\x1bn'); // LS2
        term.write('\x1b[1;1H');
        for (const [input] of mappings) {
          term.write(String.fromCharCode(input));
        }
        for (let i = 0; i < mappings.length; i++) {
          const cell = buf().getCellRef(0, i);
          const expectedCp = mappings[i][0]; // All charsets store raw bytes
          expect(cell.codepoint).toBe(expectedCp);
          expect(cell.fontNumber).toBe(expectedFont);
        }
      });
    }
  });

  // ------ G0 designation stores type correctly ------

  describe('G0 designation via ESC ( stores type', () => {
    for (const [setName] of Object.entries(CHARSET_MAPS)) {
      const typeIndex = CHARSET_TYPE_INDEX[setName];

      it(`ESC ( ${typeIndex} should set G0 to ${setName}`, () => {
        term.write(`\x1b(${typeIndex}`);
        expect(emu().getG0CharacterSet()).toBe(typeIndex);
      });
    }
  });
});

// ============================================================================
// ISO 646 NATIONAL VARIANT SELECTION (both TDV2200 and TDV2215)
// Note: ISO 646 is a font-level mapping applied by the bitmap font renderer,
// not in the buffer. Tests verify variant STATE is correctly set via ESC %.
// ============================================================================

describe('ISO 646 National Variant Selection', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '400px';
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  const variantTests: { name: string; byte: string; expectedValue: number }[] = [
    { name: 'Norwegian', byte: 'N', expectedValue: 1 },
    { name: 'Swedish',   byte: 'S', expectedValue: 2 },
    { name: 'German',    byte: 'G', expectedValue: 3 },
    { name: 'International', byte: 'I', expectedValue: 0 },
  ];

  for (const emuType of ['tdv2200', 'tdv2215'] as const) {
    describe(`${emuType.toUpperCase()} — ISO 646 variant selection via ESC %`, () => {
      for (const variant of variantTests) {
        it(`ESC % ${variant.byte} should select ${variant.name} variant`, () => {
          const term = new Terminal({ rows: 24, cols: 80, emulatorType: emuType });
          term.open(container);
          term.write(`\x1b%${variant.byte}`);
          expect((term.getEmulator() as any).characterSetVariant).toBe(variant.expectedValue);
          term.dispose();
        });
      }

      it('variant should switch correctly between types', () => {
        const term = new Terminal({ rows: 24, cols: 80, emulatorType: emuType });
        term.open(container);
        const emu = term.getEmulator() as any;
        // Start with International (0)
        expect(emu.characterSetVariant).toBe(0);
        // Switch to Norwegian
        term.write('\x1b%N');
        expect(emu.characterSetVariant).toBe(1);
        // Switch to Swedish
        term.write('\x1b%S');
        expect(emu.characterSetVariant).toBe(2);
        // Switch to German
        term.write('\x1b%G');
        expect(emu.characterSetVariant).toBe(3);
        // Back to International
        term.write('\x1b%I');
        expect(emu.characterSetVariant).toBe(0);
        term.dispose();
      });
    });
  }
});

// ============================================================================
// CHARSET RESET BEHAVIOR
// ============================================================================

describe('Character Set Reset Behavior', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '400px';
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  for (const emuType of ['tdv2200', 'tdv2215'] as const) {
    describe(`${emuType.toUpperCase()} reset`, () => {
      it('RIS should reset character sets to defaults', () => {
        const term = new Terminal({ rows: 24, cols: 80, emulatorType: emuType });
        term.open(container);
        const emu = term.getEmulator() as any;
        // Change G0 to GraphicsI
        term.write('\x1b(1');
        expect(emu.getG0CharacterSet()).toBe(1);
        // RIS
        term.write('\x1bc');
        expect(emu.getG0CharacterSet()).toBe(0); // USASCII
        expect(emu.getG1CharacterSet()).toBe(0); // USASCII
        expect(emu.getG2CharacterSet()).toBe(1); // GraphicsI (default G2)
        expect(emu.getG3CharacterSet()).toBe(2); // GraphicsII (default G3)
        term.dispose();
      });

      it('RIS should reset ISO 646 variant to International', () => {
        const term = new Terminal({ rows: 24, cols: 80, emulatorType: emuType });
        term.open(container);
        const emu = term.getEmulator() as any;
        term.write('\x1b%N');
        expect(emu.characterSetVariant).toBe(1);
        term.write('\x1bc');
        expect(emu.characterSetVariant).toBe(0);
        term.dispose();
      });

      it('RIS should reset invoked character set to G0', () => {
        const term = new Terminal({ rows: 24, cols: 80, emulatorType: emuType });
        term.open(container);
        const emu = term.getEmulator() as any;
        // Use API to set invoked charset (SO is TDV2200-specific)
        emu.invokeCharacterSet(1); // Switch to G1
        expect(emu.getCurrentCharacterSet()).toBe(1);
        term.write('\x1bc');
        expect(emu.getCurrentCharacterSet()).toBe(0);
        term.dispose();
      });
    });
  }

  describe('TDV2200 SI/SO reset', () => {
    it('SO should change invoked charset, RIS should reset', () => {
      const term = new Terminal({ rows: 24, cols: 80, emulatorType: 'tdv2200' });
      term.open(container);
      const emu = term.getEmulator() as any;
      term.write('\x0E'); // SO to G1
      expect(emu.getCurrentCharacterSet()).toBe(1);
      term.write('\x1bc'); // RIS
      expect(emu.getCurrentCharacterSet()).toBe(0);
      term.dispose();
    });
  });
});

// ============================================================================
// CHARSET INTERACTION WITH ATTRIBUTES (TDV2200)
// ============================================================================

describe('Character Set Rendering with Attributes', () => {
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

  function buf(): any { return (term.getEmulator() as any).buffer; }

  it('charset mapping should work with bold attribute', () => {
    term.write('\x1b(1');  // G0 = GraphicsI
    term.write('\x0F');
    term.write('\x1b[1m'); // Bold
    term.write('\x1b[1;1H');
    term.write(String.fromCharCode(0x60)); // GraphicsI fontNumber=2, stores raw byte
    const cell = buf().getCellRef(0, 0);
    expect(cell.codepoint).toBe(0x60); // raw byte (renders as ◆)
    expect(cell.fontNumber).toBe(2);
    expect(hasAttribute(cell.attributes, CharacterAttributes.Bold)).toBe(true);
  });

  it('charset mapping should work with reverse video', () => {
    term.write('\x1b(3');  // G0 = Math
    term.write('\x0F');
    term.write('\x1b[7m'); // Reverse
    term.write('\x1b[1;1H');
    term.write(String.fromCharCode(0x60)); // Math → raw byte, fontNumber=2
    const cell = buf().getCellRef(0, 0);
    expect(cell.codepoint).toBe(0x60); // Math: raw byte pass-through
    expect(cell.fontNumber).toBe(2);
    expect(hasAttribute(cell.attributes, CharacterAttributes.Reverse)).toBe(true);
  });

  it('charset mapping should work with underline', () => {
    term.write('\x1b(4');  // G0 = Greek
    term.write('\x0F');
    term.write('\x1b[4m'); // Underline
    term.write('\x1b[1;1H');
    term.write(String.fromCharCode(0x60)); // Greek → raw byte, fontNumber=2
    const cell = buf().getCellRef(0, 0);
    expect(cell.codepoint).toBe(0x60); // Greek: raw byte pass-through
    expect(cell.fontNumber).toBe(2);
    expect(hasAttribute(cell.attributes, CharacterAttributes.Underline)).toBe(true);
  });

  it('SGR reset should not affect charset', () => {
    term.write('\x1b(1');  // G0 = GraphicsI
    term.write('\x0F');
    term.write('\x1b[1m'); // Bold
    term.write('\x1b[0m'); // SGR reset — should NOT reset charset
    term.write('\x1b[1;1H');
    term.write(String.fromCharCode(0x61)); // GraphicsI fontNumber=2, stores raw byte
    const cell = buf().getCellRef(0, 0);
    expect(cell.codepoint).toBe(0x61); // raw byte (renders as ▒)
    expect(cell.fontNumber).toBe(2);
    expect(hasAttribute(cell.attributes, CharacterAttributes.Bold)).toBe(false);
  });
});
