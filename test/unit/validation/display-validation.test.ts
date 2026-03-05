/**
 * TDV2200 Display Validation Tests
 *
 * Validates screen dimensions, character rendering, attribute display,
 * cursor positioning, erase operations, character set switching,
 * protected area display, and video state.
 */

import { describe, it, expect } from 'vitest';
import { TDV2200Emulator } from '../../../src/emulators/tdv/TDV2200Emulator';
import { encode, getRowTextTrimmed, collectResponses } from '../../helpers/test-emulator';
import { assertRowText, assertCursorAt, assertRowEmpty, assertCellAttribute } from '../../helpers/buffer-assertions';
import { CharacterAttributes } from '../../../src/buffer/CharacterAttributes';
import * as seq from '../../helpers/test-sequences';

describe('TDV2200 Display Validation', () => {
  function create(cols = 80, rows = 24): TDV2200Emulator {
    return new TDV2200Emulator(cols, rows);
  }

  describe('screen dimensions', () => {
    it('should default to 80 columns', () => {
      const emu = create();
      expect(emu.width).toBe(80);
    });

    it('should default to 24 rows', () => {
      const emu = create();
      expect(emu.height).toBe(24);
    });

    it('should support custom dimensions', () => {
      const emu = new TDV2200Emulator(132, 48);
      expect(emu.width).toBe(132);
      expect(emu.height).toBe(48);
    });

    it('should have all rows initially empty', () => {
      const emu = create();
      for (let row = 0; row < 24; row++) {
        assertRowEmpty(emu.buffer, row);
      }
    });
  });

  describe('character rendering', () => {
    it('should render text at cursor position (0,0)', () => {
      const emu = create();
      emu.processData(encode('Hello'));
      assertRowText(emu.buffer, 0, 'Hello');
    });

    it('should render text at arbitrary position via CUP', () => {
      const emu = create();
      emu.processData(encode(seq.cup(5, 10) + 'World'));
      assertRowText(emu.buffer, 4, '         World');
    });

    it('should render text at the last column', () => {
      const emu = create();
      emu.processData(encode(seq.cup(1, 80) + 'X'));
      const cell = emu.buffer.getCellRef(0, 79);
      expect(cell.getString()).toBe('X');
    });

    it('should render text on the last row', () => {
      const emu = create();
      emu.processData(encode(seq.cup(24, 1) + 'Bottom'));
      assertRowText(emu.buffer, 23, 'Bottom');
    });

    it('should render text at the bottom-right corner', () => {
      const emu = create();
      emu.processData(encode(seq.cup(24, 80) + 'Z'));
      const cell = emu.buffer.getCellRef(23, 79);
      expect(cell.getString()).toBe('Z');
    });
  });

  describe('attribute display', () => {
    it('should render bold text', () => {
      const emu = create();
      emu.processData(encode(seq.sgr(1) + 'Bold'));
      assertCellAttribute(emu.buffer, 0, 0, CharacterAttributes.Bold);
      assertCellAttribute(emu.buffer, 0, 3, CharacterAttributes.Bold);
    });

    it('should render underlined text', () => {
      const emu = create();
      emu.processData(encode(seq.sgr(4) + 'Under'));
      assertCellAttribute(emu.buffer, 0, 0, CharacterAttributes.Underline);
    });

    it('should render reverse video text', () => {
      const emu = create();
      emu.processData(encode(seq.sgr(7) + 'Rev'));
      assertCellAttribute(emu.buffer, 0, 0, CharacterAttributes.Reverse);
    });

    it('should render blinking text', () => {
      const emu = create();
      emu.processData(encode(seq.sgr(5) + 'Blink'));
      assertCellAttribute(emu.buffer, 0, 0, CharacterAttributes.Blink);
    });

    it('should combine bold and underline', () => {
      const emu = create();
      emu.processData(encode(seq.sgr(1, 4) + 'BU'));
      assertCellAttribute(emu.buffer, 0, 0, CharacterAttributes.Bold);
      assertCellAttribute(emu.buffer, 0, 0, CharacterAttributes.Underline);
    });

    it('should reset attributes with SGR 0', () => {
      const emu = create();
      emu.processData(encode(seq.sgr(1) + 'A' + seq.sgr(0) + 'B'));
      assertCellAttribute(emu.buffer, 0, 0, CharacterAttributes.Bold);
      const cellB = emu.buffer.getCellRef(0, 1);
      expect(cellB.attributes).toBe(CharacterAttributes.None);
    });
  });

  describe('cursor positioning', () => {
    it('CUP should move cursor to row 1, col 1 (home)', () => {
      const emu = create();
      emu.processData(encode(seq.cup(1, 1)));
      assertCursorAt(emu, 0, 0);
    });

    it('CUP should move cursor to center of screen', () => {
      const emu = create();
      emu.processData(encode(seq.cup(12, 40)));
      assertCursorAt(emu, 11, 39);
    });

    it('CUP should move to bottom-right', () => {
      const emu = create();
      emu.processData(encode(seq.cup(24, 80)));
      assertCursorAt(emu, 23, 79);
    });

    it('CUP should clamp out-of-bounds row to last row', () => {
      const emu = create();
      emu.processData(encode(seq.cup(100, 1)));
      assertCursorAt(emu, 23, 0);
    });

    it('CUP should clamp out-of-bounds column to last column', () => {
      const emu = create();
      emu.processData(encode(seq.cup(1, 200)));
      assertCursorAt(emu, 0, 79);
    });
  });

  describe('erase operations', () => {
    it('ED 0 should erase from cursor to end of display', () => {
      const emu = create();
      emu.processData(encode('AAAAAA'));
      emu.processData(encode(seq.cup(1, 4) + seq.ed(0)));
      // First 3 chars preserved, rest erased
      assertRowText(emu.buffer, 0, 'AAA');
    });

    it('ED 1 should erase from start of display to cursor (inclusive)', () => {
      const emu = create();
      emu.processData(encode('ABCDEF'));
      emu.processData(encode(seq.cup(1, 4) + seq.ed(1)));
      // Columns 0-3 erased (cursor at col 3 inclusive), columns 4-5 preserved
      assertRowText(emu.buffer, 0, '    EF');
    });

    it('ED 2 should erase entire display', () => {
      const emu = create();
      emu.processData(encode('Hello'));
      emu.processData(encode(seq.cup(2, 1) + 'World'));
      emu.processData(encode(seq.ed(2)));
      assertRowEmpty(emu.buffer, 0);
      assertRowEmpty(emu.buffer, 1);
    });

    it('EL 0 should erase from cursor to end of line', () => {
      const emu = create();
      emu.processData(encode('ABCDEF'));
      emu.processData(encode(seq.cup(1, 4) + seq.el(0)));
      assertRowText(emu.buffer, 0, 'ABC');
    });

    it('EL 1 should erase from start of line to cursor (inclusive)', () => {
      const emu = create();
      emu.processData(encode('ABCDEF'));
      emu.processData(encode(seq.cup(1, 4) + seq.el(1)));
      // Columns 0-3 erased (cursor at col 3 inclusive), columns 4-5 preserved
      assertRowText(emu.buffer, 0, '    EF');
    });

    it('EL 2 should erase entire line', () => {
      const emu = create();
      emu.processData(encode('ABCDEF'));
      emu.processData(encode(seq.cup(1, 3) + seq.el(2)));
      assertRowEmpty(emu.buffer, 0);
    });
  });

  describe('character set switching', () => {
    it('SS2 (ESC N) should use G2 for next character only', () => {
      const emu = create();
      emu.processData(encode('\x1bN'));
      expect(emu.characterSetManager.isSS2Active).toBe(true);
      emu.processData(encode('A'));
      expect(emu.characterSetManager.isSS2Active).toBe(false);
      // The cell should have fontNumber 2 from G2 (GraphicsI)
      expect(emu.buffer.getCellRef(0, 0).fontNumber).toBe(2);
    });

    it('SS3 (ESC O) should use G3 for next character only', () => {
      const emu = create();
      emu.processData(encode('\x1bO'));
      expect(emu.characterSetManager.isSS3Active).toBe(true);
      emu.processData(encode('A'));
      expect(emu.characterSetManager.isSS3Active).toBe(false);
      expect(emu.buffer.getCellRef(0, 0).fontNumber).toBe(3);
    });

    it('subsequent character after SS2 should use normal charset', () => {
      const emu = create();
      emu.processData(encode('\x1bNA'));
      emu.processData(encode('B'));
      expect(emu.buffer.getCellRef(0, 0).fontNumber).toBe(2);
      expect(emu.buffer.getCellRef(0, 1).fontNumber).toBe(0);
    });
  });

  describe('protected area display', () => {
    it('should track protected area state via protectedAreas component', () => {
      const emu = create();
      expect(emu.protectedAreas).toBeDefined();
    });

    it('should report whether cursor is in protected area', () => {
      const emu = create();
      // Initially no protection
      expect(emu.isCursorInProtectedArea()).toBe(false);
    });
  });

  describe('video on/off state', () => {
    it('should initialize with video on', () => {
      const emu = create();
      expect(emu.videoOn).toBe(true);
    });

    it('video should turn off via 2115 mode STX control', () => {
      const emu = create();
      emu.processData(encode('\x1b[?40h')); // Enable 2115 mode
      emu.processData(new Uint8Array([0x02])); // STX = video off
      expect(emu.videoOn).toBe(false);
    });

    it('video should turn on via 2115 mode ETX control', () => {
      const emu = create();
      emu.processData(encode('\x1b[?40h')); // Enable 2115 mode
      emu.processData(new Uint8Array([0x02])); // STX = video off
      emu.processData(new Uint8Array([0x03])); // ETX = video on
      expect(emu.videoOn).toBe(true);
    });
  });
});
