/**
 * TDV2200 Keyboard Validation Tests
 *
 * Validates TDVKeyboardMapper generates correct sequences for arrows, F-keys,
 * extended control mode CSI sequences, Alt key bindings, TDV2115 mode C0 codes,
 * and backspace fallback.
 */

import { describe, it, expect } from 'vitest';
import { TDVKeyboardMapper } from '../../../src/keyboard/TDVKeyboardMapper';
import { KeyModifiers, TerminalModes } from '../../../src/keyboard/KeyboardMapper';

describe('TDV2200 Keyboard Validation', () => {
  function createMapper(): TDVKeyboardMapper {
    return new TDVKeyboardMapper();
  }

  describe('arrow keys in extended control mode', () => {
    it('UP arrow should send 0x1C', () => {
      const mapper = createMapper();
      const seq = mapper.mapKey(38, KeyModifiers.None, TerminalModes.None);
      expect(seq).toBe('\x1C');
    });

    it('DOWN arrow should send 0x0B', () => {
      const mapper = createMapper();
      const seq = mapper.mapKey(40, KeyModifiers.None, TerminalModes.None);
      expect(seq).toBe('\x0B');
    });

    it('LEFT arrow should send 0x08', () => {
      const mapper = createMapper();
      const seq = mapper.mapKey(37, KeyModifiers.None, TerminalModes.None);
      expect(seq).toBe('\x08');
    });

    it('RIGHT arrow should send 0x18', () => {
      const mapper = createMapper();
      const seq = mapper.mapKey(39, KeyModifiers.None, TerminalModes.None);
      expect(seq).toBe('\x18');
    });

    it('HOME should send 0x1D', () => {
      const mapper = createMapper();
      const seq = mapper.mapKey(36, KeyModifiers.None, TerminalModes.None);
      expect(seq).toBe('\x1D');
    });
  });

  describe('F-keys in extended control mode', () => {
    it('F1 (VK 112) should send CSI 50 _', () => {
      const mapper = createMapper();
      const seq = mapper.mapKey(112, KeyModifiers.None, TerminalModes.None);
      expect(seq).toBe('\x1B[50_');
    });

    it('F2 (VK 113) should send CSI 52 _', () => {
      const mapper = createMapper();
      const seq = mapper.mapKey(113, KeyModifiers.None, TerminalModes.None);
      expect(seq).toBe('\x1B[52_');
    });

    it('F5 (VK 116) should send CSI 60 _', () => {
      const mapper = createMapper();
      const seq = mapper.mapKey(116, KeyModifiers.None, TerminalModes.None);
      expect(seq).toBe('\x1B[60_');
    });

    it('Shift+F1 should send CSI 51 _', () => {
      const mapper = createMapper();
      const seq = mapper.mapKey(112, KeyModifiers.Shift, TerminalModes.None);
      expect(seq).toBe('\x1B[51_');
    });
  });

  describe('extended control mode CSI sequences', () => {
    it('DELETE key (VK 46) should send CSI 10 _', () => {
      const mapper = createMapper();
      const seq = mapper.mapKey(46, KeyModifiers.None, TerminalModes.None);
      expect(seq).toBe('\x1B[10_');
    });

    it('INSERT key (VK 45) should send CSI 82 _', () => {
      const mapper = createMapper();
      const seq = mapper.mapKey(45, KeyModifiers.None, TerminalModes.None);
      expect(seq).toBe('\x1B[82_');
    });

    it('PageDown (VK 34) should send CSI 28 _ (ROLLUP)', () => {
      const mapper = createMapper();
      const seq = mapper.mapKey(34, KeyModifiers.None, TerminalModes.None);
      expect(seq).toBe('\x1B[28_');
    });

    it('PageUp (VK 33) should send CSI 32 _ (ROLLDN)', () => {
      const mapper = createMapper();
      const seq = mapper.mapKey(33, KeyModifiers.None, TerminalModes.None);
      expect(seq).toBe('\x1B[32_');
    });
  });

  describe('Alt key bindings', () => {
    it('Alt+H should map to HJELP (CSI 46 _)', () => {
      const mapper = createMapper();
      const seq = mapper.mapKey(72, KeyModifiers.Alt, TerminalModes.None);
      expect(seq).toBe('\x1B[46_');
    });

    it('Alt+S should map to SLUTT (CSI 48 _)', () => {
      const mapper = createMapper();
      const seq = mapper.mapKey(83, KeyModifiers.Alt, TerminalModes.None);
      expect(seq).toBe('\x1B[48_');
    });

    it('Alt+P should map to SKRIV (CSI 44 _)', () => {
      const mapper = createMapper();
      const seq = mapper.mapKey(80, KeyModifiers.Alt, TerminalModes.None);
      expect(seq).toBe('\x1B[44_');
    });
  });

  describe('TDV2115 mode C0 codes', () => {
    it('UP arrow in 2115 mode should send 0x1C', () => {
      const mapper = createMapper();
      const seq = mapper.mapKey(38, KeyModifiers.None, TerminalModes.TDV2115Mode);
      expect(seq).toBe('\x1C');
    });

    it('DOWN arrow in 2115 mode should send 0x0B', () => {
      const mapper = createMapper();
      const seq = mapper.mapKey(40, KeyModifiers.None, TerminalModes.TDV2115Mode);
      expect(seq).toBe('\x0B');
    });

    it('RIGHT arrow in 2115 mode should send 0x18', () => {
      const mapper = createMapper();
      const seq = mapper.mapKey(39, KeyModifiers.None, TerminalModes.TDV2115Mode);
      expect(seq).toBe('\x18');
    });

    it('LEFT arrow in 2115 mode should send 0x08', () => {
      const mapper = createMapper();
      const seq = mapper.mapKey(37, KeyModifiers.None, TerminalModes.TDV2115Mode);
      expect(seq).toBe('\x08');
    });

    it('HOME in 2115 mode should send 0x1D', () => {
      const mapper = createMapper();
      const seq = mapper.mapKey(36, KeyModifiers.None, TerminalModes.TDV2115Mode);
      expect(seq).toBe('\x1D');
    });
  });

  describe('backspace fallback', () => {
    it('Backspace (VK 8) should send BS (0x08)', () => {
      const mapper = createMapper();
      const seq = mapper.mapKey(8, KeyModifiers.None, TerminalModes.None);
      expect(seq).toBe('\x08');
    });
  });
});
