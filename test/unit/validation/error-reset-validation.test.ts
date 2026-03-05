/**
 * TDV2200 Error/Reset Validation Tests
 *
 * Validates RIS (Full Reset) behavior and error recovery from incomplete
 * or invalid escape sequences.
 */

import { describe, it, expect } from 'vitest';
import { TDV2200Emulator } from '../../../src/emulators/tdv/TDV2200Emulator';
import { encode, getRowTextTrimmed } from '../../helpers/test-emulator';
import { assertCursorAt, assertRowEmpty, assertRowText } from '../../helpers/buffer-assertions';
import * as seq from '../../helpers/test-sequences';

describe('TDV2200 Error/Reset Validation', () => {
  function create(cols = 80, rows = 24): TDV2200Emulator {
    return new TDV2200Emulator(cols, rows);
  }

  describe('RIS (ESC c) cursor reset', () => {
    it('should reset cursor to home position', () => {
      const emu = create();
      emu.processData(encode(seq.cup(10, 20)));
      assertCursorAt(emu, 9, 19);
      emu.processData(encode(seq.RIS));
      assertCursorAt(emu, 0, 0);
    });
  });

  describe('RIS screen clearing', () => {
    it('should clear the screen', () => {
      const emu = create();
      emu.processData(encode('Hello World'));
      emu.processData(encode(seq.cup(2, 1) + 'Second Line'));
      emu.processData(encode(seq.RIS));
      assertRowEmpty(emu.buffer, 0);
      assertRowEmpty(emu.buffer, 1);
    });

    it('should clear all 24 rows', () => {
      const emu = create();
      // Write to multiple rows
      for (let r = 1; r <= 10; r++) {
        emu.processData(encode(seq.cup(r, 1) + `Row ${r}`));
      }
      emu.processData(encode(seq.RIS));
      for (let r = 0; r < 24; r++) {
        assertRowEmpty(emu.buffer, r);
      }
    });
  });

  describe('RIS attribute reset', () => {
    it('should reset current attributes to none', () => {
      const emu = create();
      emu.processData(encode(seq.sgr(1, 4, 7))); // Bold, underline, reverse
      emu.processData(encode(seq.RIS));
      // Write a character and verify no attributes
      emu.processData(encode('A'));
      const cell = emu.buffer.getCellRef(0, 0);
      expect(cell.attributes).toBe(0); // CharacterAttributes.None
    });
  });

  describe('RIS scroll region reset', () => {
    it('should reset scroll region to full screen', () => {
      const emu = create();
      emu.processData(encode(seq.decstbm(5, 20)));
      expect(emu.scrollTop).toBe(4);
      emu.processData(encode(seq.RIS));
      expect(emu.scrollTop).toBe(0);
      expect(emu.scrollBottom).toBe(23);
    });
  });

  describe('RIS character set reset', () => {
    it('should reset invoked character set to G0', () => {
      const emu = create();
      emu.processData(encode('\x1bn')); // LS2 -> G2
      expect(emu.getCurrentCharacterSet()).toBe(2);
      emu.processData(encode(seq.RIS));
      expect(emu.getCurrentCharacterSet()).toBe(0);
    });

    it('should reset SS2/SS3 active flags', () => {
      const emu = create();
      emu.processData(encode('\x1bN')); // SS2
      expect(emu.characterSetManager.isSS2Active).toBe(true);
      emu.processData(encode(seq.RIS));
      expect(emu.characterSetManager.isSS2Active).toBe(false);
      expect(emu.characterSetManager.isSS3Active).toBe(false);
    });

    it('should reset ISO 646 variant to International', () => {
      const emu = create();
      emu.processData(encode('\x1b%N')); // Norwegian
      emu.processData(encode(seq.RIS));
      expect(emu.currentISO646Variant).toBe(0); // International
    });
  });

  describe('RIS mode reset', () => {
    it('should reset origin mode (DECOM)', () => {
      const emu = create();
      emu.processData(encode(seq.decset(6)));
      expect(emu.originMode).toBe(true);
      emu.processData(encode(seq.RIS));
      expect(emu.originMode).toBe(false);
    });

    it('should reset auto wrap mode (DECAWM) to enabled', () => {
      const emu = create();
      emu.processData(encode(seq.decrst(7)));
      expect(emu.autoWrapMode).toBe(false);
      emu.processData(encode(seq.RIS));
      expect(emu.autoWrapMode).toBe(true);
    });

    it('should reset cursor visibility (DECTCEM) to visible', () => {
      const emu = create();
      emu.processData(encode(seq.decrst(25)));
      expect(emu.cursor.visible).toBe(false);
      emu.processData(encode(seq.RIS));
      expect(emu.cursor.visible).toBe(true);
    });

    it('should reset 2115 compatibility mode', () => {
      const emu = create();
      emu.processData(encode('\x1b[?40h'));
      expect(emu.is2115CompatibilityMode).toBe(true);
      emu.processData(encode(seq.RIS));
      expect(emu.is2115CompatibilityMode).toBe(false);
    });
  });

  describe('recovery from incomplete sequences', () => {
    it('should recover from incomplete ESC sequence by processing next valid data', () => {
      const emu = create();
      // Send incomplete ESC (just ESC, no follow-up that matches)
      // Then send a normal character, should still work
      emu.processData(encode('\x1b'));
      // Now send a valid sequence - the parser may interpret ESC + [ as CSI start
      // or may discard. Either way, subsequent valid input should work.
      emu.processData(encode('Hello'));
      // The key test: the emulator doesn't crash and can still process
      const text = getRowTextTrimmed(emu.buffer, 0);
      expect(text.length).toBeGreaterThan(0);
    });

    it('should recover from invalid CSI parameters and process subsequent data', () => {
      const emu = create();
      // Invalid CSI: nonsensical parameter followed by valid text
      emu.processData(encode('\x1b[999999H'));
      // Cursor should be clamped to valid position
      expect(emu.cursor.row).toBeLessThan(24);
      expect(emu.cursor.column).toBeLessThan(80);
      // Then write normally
      emu.processData(encode('OK'));
      const text = getRowTextTrimmed(emu.buffer, emu.cursor.row);
      expect(text).toContain('OK');
    });
  });
});
