/**
 * TDV2200 Communication Validation Tests
 *
 * Validates DA/DSR response format, including primary DA, secondary DA,
 * DSR status report, CPR cursor position report, and terminal type identification.
 */

import { describe, it, expect } from 'vitest';
import { TDV2200Emulator } from '../../../src/emulators/tdv/TDV2200Emulator';
import { encode, collectResponses, decodeResponse } from '../../helpers/test-emulator';

describe('TDV2200 Communication Validation', () => {
  function create(cols = 80, rows = 24): TDV2200Emulator {
    return new TDV2200Emulator(cols, rows);
  }

  describe('primary DA response', () => {
    it('should respond to CSI c with TDV2200 identifier', () => {
      const emu = create();
      const responses = collectResponses(emu);
      emu.processData(encode('\x1b[c'));
      expect(responses.length).toBeGreaterThanOrEqual(1);
      const resp = decodeResponse(responses[0]);
      expect(resp).toBe('\x1b[?220;0c');
    });

    it('should respond to CSI 0 c with same format as CSI c', () => {
      const emu = create();
      const responses = collectResponses(emu);
      emu.processData(encode('\x1b[0c'));
      expect(responses.length).toBeGreaterThanOrEqual(1);
      const resp = decodeResponse(responses[0]);
      expect(resp).toBe('\x1b[?220;0c');
    });

    it('primary DA response should start with ESC[?', () => {
      const emu = create();
      const responses = collectResponses(emu);
      emu.processData(encode('\x1b[c'));
      const resp = decodeResponse(responses[0]);
      expect(resp.startsWith('\x1b[?')).toBe(true);
    });

    it('primary DA response should end with c', () => {
      const emu = create();
      const responses = collectResponses(emu);
      emu.processData(encode('\x1b[c'));
      const resp = decodeResponse(responses[0]);
      expect(resp.endsWith('c')).toBe(true);
    });

    it('primary DA in 2115 mode should report 115', () => {
      const emu = create();
      emu.processData(encode('\x1b[?40h')); // Enable 2115 mode
      const responses = collectResponses(emu);
      emu.processData(encode('\x1b[c'));
      const resp = decodeResponse(responses[0]);
      expect(resp).toBe('\x1b[?115;0c');
    });
  });

  describe('secondary DA response', () => {
    it('should respond to CSI > c with secondary DA', () => {
      const emu = create();
      const responses = collectResponses(emu);
      emu.processData(encode('\x1b[>c'));
      expect(responses.length).toBeGreaterThanOrEqual(1);
      const resp = decodeResponse(responses[0]);
      expect(resp).toBe('\x1b[>220;0;0c');
    });

    it('secondary DA response should contain 220 identifier', () => {
      const emu = create();
      const responses = collectResponses(emu);
      emu.processData(encode('\x1b[>c'));
      const resp = decodeResponse(responses[0]);
      expect(resp).toContain('220');
    });
  });

  describe('DSR response', () => {
    it('should respond to DSR 5 with terminal OK status', () => {
      const emu = create();
      const responses = collectResponses(emu);
      emu.processData(encode('\x1b[5n'));
      expect(responses.length).toBeGreaterThanOrEqual(1);
      const resp = decodeResponse(responses[0]);
      expect(resp).toBe('\x1b[0n');
    });
  });

  describe('CPR response', () => {
    it('should report cursor at home position (1,1)', () => {
      const emu = create();
      const responses = collectResponses(emu);
      emu.processData(encode('\x1b[6n'));
      expect(responses.length).toBeGreaterThanOrEqual(1);
      const resp = decodeResponse(responses[0]);
      expect(resp).toBe('\x1b[1;1R');
    });

    it('should report cursor at moved position', () => {
      const emu = create();
      emu.processData(encode('\x1b[10;20H')); // Move to row 10, col 20
      const responses = collectResponses(emu);
      emu.processData(encode('\x1b[6n'));
      const resp = decodeResponse(responses[0]);
      expect(resp).toBe('\x1b[10;20R');
    });

    it('CPR response should have format ESC [ row ; col R', () => {
      const emu = create();
      emu.processData(encode('\x1b[5;15H'));
      const responses = collectResponses(emu);
      emu.processData(encode('\x1b[6n'));
      const resp = decodeResponse(responses[0]);
      // Should match ESC[Pn;PnR
      expect(resp).toMatch(/^\x1b\[\d+;\d+R$/);
    });
  });

  describe('terminal type identifier', () => {
    it('should contain 220 in primary DA for TDV2200', () => {
      const emu = create();
      const responses = collectResponses(emu);
      emu.processData(encode('\x1b[c'));
      const resp = decodeResponse(responses[0]);
      expect(resp).toContain('220');
    });
  });
});
