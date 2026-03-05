import { describe, it, expect } from 'vitest';
import { TDV2200Emulator } from '../../../src/emulators/tdv/TDV2200Emulator';
import { encode, getRowTextTrimmed, collectResponses, decodeResponse } from '../../helpers/test-emulator';
import { TDV2200ISO646Variant } from '../../../src/emulators/tdv/TDV2200ISO646Variant';
import { TDVCharacterSetType } from '../../../src/emulators/tdv/components/TDVCharacterSets';

describe('TDV2200Emulator', () => {
  function create(cols = 80, rows = 24): TDV2200Emulator {
    return new TDV2200Emulator(cols, rows);
  }

  describe('properties', () => {
    it('should report terminal type', () => {
      const emu = create();
      expect(emu.getTerminalType()).toBe('TDV2200');
    });

    it('should initialize with video on', () => {
      const emu = create();
      expect(emu.videoOn).toBe(true);
    });

    it('should initialize with LEDs off', () => {
      const emu = create();
      expect(emu.leds).toEqual([false, false, false]);
    });

    it('should initialize with no graphics extension', () => {
      const emu = create();
      expect(emu.hasGraphicsExtension).toBe(false);
      expect(emu.isTektronixMode).toBe(false);
    });

    it('should initialize with International ISO 646', () => {
      const emu = create();
      expect(emu.currentISO646Variant).toBe(TDV2200ISO646Variant.International);
    });
  });

  describe('2115 compatibility mode', () => {
    it('should enable with CSI ? 40 h', () => {
      const emu = create();
      emu.processData(encode('\x1b[?40h'));
      expect(emu.is2115CompatibilityMode).toBe(true);
    });

    it('should disable with CSI ? 40 l', () => {
      const emu = create();
      emu.processData(encode('\x1b[?40h'));
      emu.processData(encode('\x1b[?40l'));
      expect(emu.is2115CompatibilityMode).toBe(false);
    });

    it('ESC Q should exit 2115 mode', () => {
      const emu = create();
      emu.processData(encode('\x1b[?40h'));
      emu.processData(encode('\x1bQ'));
      expect(emu.is2115CompatibilityMode).toBe(false);
    });
  });

  describe('character set shifts', () => {
    it('ESC N should activate SS2', () => {
      const emu = create();
      emu.processData(encode('\x1bN'));
      expect(emu.characterSetManager.isSS2Active).toBe(true);
    });

    it('ESC O should activate SS3', () => {
      const emu = create();
      emu.processData(encode('\x1bO'));
      expect(emu.characterSetManager.isSS3Active).toBe(true);
    });

    it('ESC n should invoke LS2', () => {
      const emu = create();
      emu.processData(encode('\x1bn'));
      expect(emu.getCurrentCharacterSet()).toBe(2);
    });

    it('ESC o should invoke LS3', () => {
      const emu = create();
      emu.processData(encode('\x1bo'));
      expect(emu.getCurrentCharacterSet()).toBe(3);
    });

    it('SO (0x0E) should shift to G1', () => {
      const emu = create();
      emu.processData(new Uint8Array([0x0E]));
      expect(emu.getCurrentCharacterSet()).toBe(1);
    });

    it('SI (0x0F) should shift back to G0', () => {
      const emu = create();
      emu.processData(new Uint8Array([0x0E])); // SO -> G1
      emu.processData(new Uint8Array([0x0F])); // SI -> G0
      expect(emu.getCurrentCharacterSet()).toBe(0);
    });
  });

  describe('SS2/SS3 character output', () => {
    it('SS2 should set font number 2 on next character', () => {
      const emu = create();
      emu.processData(encode('\x1bN')); // SS2
      emu.processData(encode('`'));     // 0x60
      const cell = emu.buffer.getCellRef(0, 0);
      expect(cell.fontNumber).toBe(2);
      // SS2 should be cleared
      expect(emu.characterSetManager.isSS2Active).toBe(false);
    });

    it('SS3 should set font number 3 on next character', () => {
      const emu = create();
      emu.processData(encode('\x1bO')); // SS3
      emu.processData(encode('`'));     // 0x60
      const cell = emu.buffer.getCellRef(0, 0);
      expect(cell.fontNumber).toBe(3);
    });
  });

  describe('active character set font numbers', () => {
    it('should set font number 2 for GraphicsI charset', () => {
      const emu = create();
      emu.setCharacterSet(0, TDVCharacterSetType.GraphicsI);
      emu.invokeCharacterSet(0);
      emu.processData(encode('A'));
      const cell = emu.buffer.getCellRef(0, 0);
      expect(cell.fontNumber).toBe(2);
    });

    it('should set font number 3 for GraphicsII charset', () => {
      const emu = create();
      emu.setCharacterSet(0, TDVCharacterSetType.GraphicsII);
      emu.invokeCharacterSet(0);
      emu.processData(encode('A'));
      const cell = emu.buffer.getCellRef(0, 0);
      expect(cell.fontNumber).toBe(3);
    });

    it('should set font number 0 for USASCII charset', () => {
      const emu = create();
      emu.processData(encode('A'));
      const cell = emu.buffer.getCellRef(0, 0);
      expect(cell.fontNumber).toBe(0);
    });
  });

  describe('ISO 646 variant selection', () => {
    it('ESC % N should select Norwegian', () => {
      const emu = create();
      emu.processData(encode('\x1b%N'));
      expect(emu.currentISO646Variant).toBe(TDV2200ISO646Variant.Norwegian);
    });

    it('ESC % S should select Swedish', () => {
      const emu = create();
      emu.processData(encode('\x1b%S'));
      expect(emu.currentISO646Variant).toBe(TDV2200ISO646Variant.Swedish);
    });

    it('ESC % G should select German', () => {
      const emu = create();
      emu.processData(encode('\x1b%G'));
      expect(emu.currentISO646Variant).toBe(TDV2200ISO646Variant.German);
    });

    it('should get/set variant programmatically', () => {
      const emu = create();
      emu.characterSetVariant = TDV2200ISO646Variant.Norwegian;
      expect(emu.characterSetVariant).toBe(TDV2200ISO646Variant.Norwegian);
    });
  });

  describe('mode control (ESC[n>)', () => {
    it('should enable graphics extension with ESC[1>', () => {
      const emu = create();
      emu.processData(encode('\x1b[1>'));
      expect(emu.hasGraphicsExtension).toBe(true);
    });

    it('should disable graphics extension with ESC[0>', () => {
      const emu = create();
      emu.processData(encode('\x1b[1>'));
      emu.processData(encode('\x1b[0>'));
      expect(emu.hasGraphicsExtension).toBe(false);
    });

    it('should enter Tektronix mode with ESC[2>', () => {
      const emu = create();
      emu.processData(encode('\x1b[2>'));
      expect(emu.isTektronixMode).toBe(true);
    });

    it('should exit Tektronix mode with ESC[3>', () => {
      const emu = create();
      emu.processData(encode('\x1b[2>'));
      emu.processData(encode('\x1b[3>'));
      expect(emu.isTektronixMode).toBe(false);
    });
  });

  describe('work area operations', () => {
    it('NDLIWA should insert lines in work area', () => {
      const emu = create();
      // Write text on several lines
      emu.processData(encode('Line 0\r\nLine 1\r\nLine 2\r\nLine 3'));
      emu.processData(encode('\x1b[2;1H')); // Move to row 1
      emu.processData(encode('\x1b[1p'));    // Insert 1 line
      expect(getRowTextTrimmed(emu.buffer, 1)).toBe(''); // Blank inserted line
      expect(getRowTextTrimmed(emu.buffer, 2)).toBe('Line 1'); // Pushed down
    });

    it('NDDLWA should delete lines in work area', () => {
      const emu = create();
      emu.processData(encode('Line 0\r\nLine 1\r\nLine 2\r\nLine 3'));
      emu.processData(encode('\x1b[2;1H')); // Move to row 1
      emu.processData(encode('\x1b[1q'));    // Delete 1 line
      expect(getRowTextTrimmed(emu.buffer, 1)).toBe('Line 2'); // Pulled up
    });

    it('NDICHE should insert characters', () => {
      const emu = create();
      emu.processData(encode('ABCDE'));
      emu.processData(encode('\x1b[1;3H'));  // Move to col 2
      emu.processData(encode('\x1b[2s'));     // Insert 2 chars
      // 'AB  CDE' (two spaces inserted at col 2)
      const text = getRowTextTrimmed(emu.buffer, 0);
      expect(text.substring(0, 2)).toBe('AB');
      expect(text.substring(4, 7)).toBe('CDE');
    });

    it('NDDCHE should delete characters', () => {
      const emu = create();
      emu.processData(encode('ABCDE'));
      emu.processData(encode('\x1b[1;2H'));  // Move to col 1
      emu.processData(encode('\x1b[2t'));     // Delete 2 chars
      expect(getRowTextTrimmed(emu.buffer, 0)).toBe('ADE');
    });
  });

  describe('query/response', () => {
    it('should respond to primary DA', () => {
      const emu = create();
      const responses = collectResponses(emu);
      emu.processData(encode('\x1b[c'));
      expect(decodeResponse(responses[0])).toBe('\x1b[?220;0c');
    });

    it('should respond to primary DA in 2115 mode', () => {
      const emu = create();
      emu.processData(encode('\x1b[?40h')); // 2115 mode
      const responses = collectResponses(emu);
      emu.processData(encode('\x1b[c'));
      expect(decodeResponse(responses[0])).toBe('\x1b[?115;0c');
    });

    it('should respond to secondary DA', () => {
      const emu = create();
      const responses = collectResponses(emu);
      emu.processData(encode('\x1b[>c'));
      expect(decodeResponse(responses[0])).toBe('\x1b[>220;0;0c');
    });
  });

  describe('terminal type reporting', () => {
    it('should include GRAPHICS extension', () => {
      const emu = create();
      emu.processData(encode('\x1b[1>'));
      expect(emu.getTerminalType()).toContain('[GRAPHICS]');
    });

    it('should include ISO646 variant', () => {
      const emu = create();
      emu.processData(encode('\x1b%N'));
      expect(emu.getTerminalType()).toContain('[ISO646:Norwegian]');
    });
  });

  describe('character set variants', () => {
    it('should list available variants', () => {
      const emu = create();
      const variants = emu.getAvailableCharacterSetVariants();
      expect(variants.length).toBe(4);
    });

    it('should return ISO 646 language codes', () => {
      const emu = create();
      expect(emu.getISO646LanguageCode()).toBeNull();
      emu.characterSetVariant = TDV2200ISO646Variant.Swedish;
      expect(emu.getISO646LanguageCode()).toBe('sv');
    });
  });

  describe('ESC(0 charset reset (TDV USASCII designation)', () => {
    it('ESC(0 should reset TDV charset to USASCII', () => {
      const emu = create();
      // Switch to GraphicsI via ESC(1
      emu.processData(encode('\x1b(1'));
      expect(emu.getActiveCharacterSetType()).toBe(TDVCharacterSetType.GraphicsI);
      // Reset to USASCII via ESC(0
      emu.processData(encode('\x1b(0'));
      expect(emu.getActiveCharacterSetType()).toBe(TDVCharacterSetType.USASCII);
    });

    it('ESC(0 should NOT activate VT100 DEC Special Graphics', () => {
      const emu = create();
      // Send ESC(0 — should designate TDV USASCII, not VT100 line drawing
      emu.processData(encode('\x1b(0'));
      // Write 'a' (0x61) — in DEC Special Graphics this maps to checkerboard (0x2592)
      emu.processData(encode('a'));
      const cell = emu.buffer.getCellRef(0, 0);
      expect(cell.codepoint).toBe(0x61); // Should be 'a', not checkerboard
      expect(cell.fontNumber).toBe(0);   // USASCII, not special font
    });

    it('charset switch then reset: label text renders as ASCII', () => {
      const emu = create();
      // Set GraphicsI
      emu.processData(encode('\x1b(1'));
      // Reset to USASCII
      emu.processData(encode('\x1b(0'));
      // Write "Test"
      emu.processData(encode('Test'));
      // All cells should have fontNumber=0 and correct ASCII codepoints
      expect(emu.buffer.getCellRef(0, 0).codepoint).toBe(0x54); // 'T'
      expect(emu.buffer.getCellRef(0, 0).fontNumber).toBe(0);
      expect(emu.buffer.getCellRef(0, 1).codepoint).toBe(0x65); // 'e'
      expect(emu.buffer.getCellRef(0, 1).fontNumber).toBe(0);
      expect(emu.buffer.getCellRef(0, 2).codepoint).toBe(0x73); // 's'
      expect(emu.buffer.getCellRef(0, 2).fontNumber).toBe(0);
      expect(emu.buffer.getCellRef(0, 3).codepoint).toBe(0x74); // 't'
      expect(emu.buffer.getCellRef(0, 3).fontNumber).toBe(0);
    });

    it('all TDV charsets 0-9 are designatable via ESC(n', () => {
      const expectedTypes = [
        0, // USASCII
        1, // GraphicsI
        2, // GraphicsII
        3, // Math
        4, // Greek
        5, // Diacritics
        6, // Box
        7, // NIX
        8, // T
        9, // ND
      ];
      for (let n = 0; n <= 9; n++) {
        const emu = create();
        emu.processData(encode(`\x1b(${n}`));
        expect(emu.getActiveCharacterSetType()).toBe(expectedTypes[n]);
      }
    });
  });

  describe('reset', () => {
    it('should reset all TDV2200 state', () => {
      const emu = create();
      emu.processData(encode('\x1b[?40h'));  // 2115 mode
      emu.processData(encode('\x1b[1>'));     // Graphics ext
      emu.processData(encode('\x1b%N'));      // Norwegian
      emu.reset();
      expect(emu.is2115CompatibilityMode).toBe(false);
      expect(emu.hasGraphicsExtension).toBe(false);
      expect(emu.currentISO646Variant).toBe(TDV2200ISO646Variant.International);
    });
  });
});
