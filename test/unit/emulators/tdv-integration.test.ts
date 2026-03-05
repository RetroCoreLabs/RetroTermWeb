/**
 * TDV integration tests — full pipeline from data input through
 * emulator processing to buffer state and response events.
 * Tests the complete flow rather than individual components.
 */
import { describe, it, expect } from 'vitest';
import { TDV2200Emulator } from '../../../src/emulators/tdv/TDV2200Emulator';
import { TDV2215Emulator } from '../../../src/emulators/tdv/TDV2215Emulator';
import { encode, collectResponses, decodeResponse, getRowTextTrimmed } from '../../helpers/test-emulator';
import { assertRowText, assertCursorAt, assertRowEmpty, assertCellAttribute } from '../../helpers/buffer-assertions';
import { CharacterAttributes } from '../../../src/buffer/CharacterAttributes';
import * as seq from '../../helpers/test-sequences';

describe('TDV Integration', () => {
  describe('TDV2200 full pipeline', () => {
    it('should process text output and update buffer', () => {
      const emu = new TDV2200Emulator(80, 24);
      emu.processData(encode('Hello, TDV2200!'));
      assertRowText(emu.buffer, 0, 'Hello, TDV2200!');
      assertCursorAt(emu, 0, 15);
    });

    it('should handle cursor positioning then text', () => {
      const emu = new TDV2200Emulator(80, 24);
      emu.processData(encode(seq.cup(5, 10) + 'Test'));
      assertRowText(emu.buffer, 4, '         Test');
      assertCursorAt(emu, 4, 13);
    });

    it('should handle mixed escape sequences and text', () => {
      const emu = new TDV2200Emulator(80, 24);
      emu.processData(encode('Line1\r\n' + seq.sgr(1) + 'Bold' + seq.sgr(0) + ' Normal'));
      assertRowText(emu.buffer, 0, 'Line1');
      assertRowText(emu.buffer, 1, 'Bold Normal');
      assertCellAttribute(emu.buffer, 1, 0, CharacterAttributes.Bold);
    });

    it('should respond to DA query with correct terminal identification', () => {
      const emu = new TDV2200Emulator(80, 24);
      const responses = collectResponses(emu);
      emu.processData(encode('\x1b[c'));
      expect(responses.length).toBeGreaterThan(0);
      const response = decodeResponse(responses[0]);
      expect(response).toContain('\x1b[?');
      expect(response.endsWith('c')).toBe(true);
    });

    it('should respond to DSR with OK status', () => {
      const emu = new TDV2200Emulator(80, 24);
      const responses = collectResponses(emu);
      emu.processData(encode('\x1b[5n'));
      expect(responses.length).toBe(1);
      expect(decodeResponse(responses[0])).toBe('\x1b[0n');
    });

    it('should respond to CPR with current cursor position', () => {
      const emu = new TDV2200Emulator(80, 24);
      emu.processData(encode(seq.cup(10, 20)));
      const responses = collectResponses(emu);
      emu.processData(encode('\x1b[6n'));
      expect(responses.length).toBe(1);
      const cpr = decodeResponse(responses[0]);
      expect(cpr).toBe('\x1b[10;20R');
    });

    it('should expose protectedAreas component for per-cell protection', () => {
      const emu = new TDV2200Emulator(80, 24);
      // Initially no cells are protected
      expect(emu.isCursorInProtectedArea()).toBe(false);
      // Set a protected area programmatically
      emu.protectedAreas.setProtectedArea(0, 0);
      expect(emu.isCursorInProtectedArea()).toBe(true);
      // Clear it
      emu.protectedAreas.clearProtectedArea(0, 0);
      expect(emu.isCursorInProtectedArea()).toBe(false);
    });

    it('should handle 2115 compatibility mode toggle', () => {
      const emu = new TDV2200Emulator(80, 24);
      expect(emu.is2115CompatibilityMode).toBe(false);

      emu.processData(encode('\x1b[?40h'));
      expect(emu.is2115CompatibilityMode).toBe(true);

      emu.processData(encode('\x1bQ'));
      expect(emu.is2115CompatibilityMode).toBe(false);
    });

    it('should handle scroll region with TDV-specific content', () => {
      const emu = new TDV2200Emulator(80, 24);
      // Fill screen
      for (let i = 0; i < 24; i++) {
        emu.processData(encode(seq.cup(i + 1, 1) + `Row ${i + 1}`));
      }
      // Set scroll region
      emu.processData(encode(seq.decstbm(5, 10)));
      // Move to bottom of region and scroll
      emu.processData(encode(seq.cup(10, 1) + '\n'));

      // Content above region preserved
      assertRowText(emu.buffer, 0, 'Row 1');
      assertRowText(emu.buffer, 3, 'Row 4');
      // Region scrolled
      assertRowText(emu.buffer, 4, 'Row 6');
      // Content below region preserved
      assertRowText(emu.buffer, 10, 'Row 11');
    });

    it('should fire bell event on BEL character', () => {
      const emu = new TDV2200Emulator(80, 24);
      let bellFired = false;
      emu.onBell.on(() => { bellFired = true; });
      emu.processData(encode('\x07'));
      expect(bellFired).toBe(true);
    });

    it('should fire invalidated event on buffer changes', () => {
      const emu = new TDV2200Emulator(80, 24);
      let invalidated = false;
      emu.onInvalidated.on(() => { invalidated = true; });
      emu.processData(encode('Hello'));
      expect(invalidated).toBe(true);
    });

    it('should handle RIS and reset all state', () => {
      const emu = new TDV2200Emulator(80, 24);
      // Set up some state
      emu.processData(encode('Content'));
      emu.processData(encode(seq.cup(10, 20)));
      emu.processData(encode(seq.decstbm(5, 15)));
      emu.processData(encode('\x1b[?40h'));

      // RIS
      emu.processData(encode(seq.RIS));

      assertCursorAt(emu, 0, 0);
      assertRowEmpty(emu.buffer, 0);
      expect(emu.is2115CompatibilityMode).toBe(false);
    });

    it('should handle erase operations correctly', () => {
      const emu = new TDV2200Emulator(80, 24);
      emu.processData(encode('ABCDEFGHIJ'));
      // ED 2 — erase entire display
      emu.processData(encode(seq.ed(2)));
      assertRowEmpty(emu.buffer, 0);
    });
  });

  describe('TDV2215 full pipeline', () => {
    it('should process text and respond to DA', () => {
      const emu = new TDV2215Emulator(80, 24);
      emu.processData(encode('Hello TDV2215'));
      assertRowText(emu.buffer, 0, 'Hello TDV2215');

      const responses = collectResponses(emu);
      emu.processData(encode('\x1b[c'));
      expect(responses.length).toBeGreaterThan(0);
    });

    it('should report correct terminal type', () => {
      const emu = new TDV2215Emulator(80, 24);
      expect(emu.getTerminalType()).toBe('TDV2215');
    });

    it('should handle multiline output with scrolling', () => {
      const emu = new TDV2215Emulator(80, 24);
      for (let i = 1; i <= 30; i++) {
        emu.processData(encode(`Line ${i}\r\n`));
      }
      // 7 lines scrolled off (30 lines + trailing \r\n causes extra scroll)
      assertRowText(emu.buffer, 0, 'Line 8');
    });

    it('should handle attributes and colors', () => {
      const emu = new TDV2215Emulator(80, 24);
      emu.processData(encode(seq.sgr(1, 4) + 'BoldUnder' + seq.sgr(0)));
      assertCellAttribute(emu.buffer, 0, 0, CharacterAttributes.Bold);
      assertCellAttribute(emu.buffer, 0, 0, CharacterAttributes.Underline);
    });
  });
});
