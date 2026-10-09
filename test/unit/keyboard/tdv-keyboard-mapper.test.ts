/**
 * Tests for TDVKeyboardMapper — unified TDV keyboard mapper.
 */
import { describe, it, expect } from 'vitest';
import { TDVKeyboardMapper } from '../../../src/keyboard/TDVKeyboardMapper';
import { KeyModifiers, TerminalModes } from '../../../src/keyboard/KeyboardMapper';

describe('TDVKeyboardMapper', () => {
  function createMapper(): TDVKeyboardMapper {
    return new TDVKeyboardMapper();
  }

  // --- Fixed keys (AlwaysSameCode) ---

  describe('Fixed keys', () => {
    it('should map UP arrow (VK 38) to C0 code', () => {
      const mapper = createMapper();
      const seq = mapper.mapKey(38, KeyModifiers.None, TerminalModes.None);
      expect(seq).toBe('\x1C');
    });

    it('should map DOWN arrow (VK 40) to C0 code', () => {
      const mapper = createMapper();
      const seq = mapper.mapKey(40, KeyModifiers.None, TerminalModes.None);
      expect(seq).toBe('\x0B');
    });

    it('should map LEFT arrow (VK 37) to BS', () => {
      const mapper = createMapper();
      const seq = mapper.mapKey(37, KeyModifiers.None, TerminalModes.None);
      expect(seq).toBe('\x08');
    });

    it('should map RIGHT arrow (VK 39) to CAN', () => {
      const mapper = createMapper();
      const seq = mapper.mapKey(39, KeyModifiers.None, TerminalModes.None);
      expect(seq).toBe('\x18');
    });

    it('should map HOME (VK 36) to GS', () => {
      const mapper = createMapper();
      const seq = mapper.mapKey(36, KeyModifiers.None, TerminalModes.None);
      expect(seq).toBe('\x1D');
    });

    it('should map RETURN (VK 13) to CR', () => {
      const mapper = createMapper();
      const seq = mapper.mapKey(13, KeyModifiers.None, TerminalModes.None);
      expect(seq).toBe('\x0D');
    });

    it('should map ESC (VK 27) to ESC', () => {
      const mapper = createMapper();
      const seq = mapper.mapKey(27, KeyModifiers.None, TerminalModes.None);
      expect(seq).toBe('\x1B');
    });
  });

  // --- Function keys (Extended Control Mode) ---

  describe('Function keys', () => {
    it('should map F1 (VK 112) to CSI 50_', () => {
      const mapper = createMapper();
      const seq = mapper.mapKey(112, KeyModifiers.None, TerminalModes.None);
      expect(seq).toBe('\x1B[50_');
    });

    it('should map Shift+F1 to CSI 51_', () => {
      const mapper = createMapper();
      const seq = mapper.mapKey(112, KeyModifiers.Shift, TerminalModes.None);
      expect(seq).toBe('\x1B[51_');
    });

    it('should map Ctrl+F2 to CSI 54_', () => {
      const mapper = createMapper();
      const seq = mapper.mapKey(113, KeyModifiers.Ctrl, TerminalModes.None);
      expect(seq).toBe('\x1B[54_');
    });

    it('should map F5-F8 correctly', () => {
      const mapper = createMapper();
      expect(mapper.mapKey(116, KeyModifiers.None, TerminalModes.None)).toBe('\x1B[60_');
      expect(mapper.mapKey(117, KeyModifiers.None, TerminalModes.None)).toBe('\x1B[62_');
      expect(mapper.mapKey(118, KeyModifiers.None, TerminalModes.None)).toBe('\x1B[64_');
      expect(mapper.mapKey(119, KeyModifiers.None, TerminalModes.None)).toBe('\x1B[66_');
    });
  });

  // --- Alt key mappings ---

  describe('Alt key mappings', () => {
    it('should map Alt+H to HELP sequence', () => {
      const mapper = createMapper();
      const seq = mapper.mapKey(72, KeyModifiers.Alt, TerminalModes.None); // H = VK 72
      expect(seq).toBe('\x1B[46_'); // HJELP normal
    });

    it('should map Alt+D to REPLACE sequence', () => {
      const mapper = createMapper();
      const seq = mapper.mapKey(68, KeyModifiers.Alt, TerminalModes.None); // D = VK 68
      expect(seq).toBe('\x1B[20_'); // REPLACE normal
    });

    it('should map Alt+S to EXIT sequence', () => {
      const mapper = createMapper();
      const seq = mapper.mapKey(83, KeyModifiers.Alt, TerminalModes.None); // S = VK 83
      expect(seq).toBe('\x1B[48_'); // SLUTT normal
    });

    it('should return null for Alt+PUSH keys (programmable)', () => {
      const mapper = createMapper();
      // Alt+1 → G1 (PUSH1, programmable → null)
      const seq = mapper.mapKey(49, KeyModifiers.Alt, TerminalModes.None);
      expect(seq).toBeNull();
    });
  });

  // --- TDV2115 mode ---

  describe('TDV2115 mode', () => {
    it('should map arrows to C0 codes in 2115 mode', () => {
      const mapper = createMapper();
      expect(mapper.mapKey(38, KeyModifiers.None, TerminalModes.TDV2115Mode)).toBe('\x1c'); // UP
      expect(mapper.mapKey(40, KeyModifiers.None, TerminalModes.TDV2115Mode)).toBe('\x0b'); // DOWN
      expect(mapper.mapKey(39, KeyModifiers.None, TerminalModes.TDV2115Mode)).toBe('\x18'); // RIGHT
      expect(mapper.mapKey(37, KeyModifiers.None, TerminalModes.TDV2115Mode)).toBe('\x08'); // LEFT
      expect(mapper.mapKey(36, KeyModifiers.None, TerminalModes.TDV2115Mode)).toBe('\x1d'); // HOME
    });
  });

  // --- Backspace fallback ---

  describe('Backspace', () => {
    it('should map VK_BACK (8) to BS', () => {
      const mapper = createMapper();
      const seq = mapper.mapKey(8, KeyModifiers.None, TerminalModes.None);
      expect(seq).toBe('\x08');
    });
  });

  // --- Unmapped keys ---

  describe('Unmapped keys', () => {
    it('should return null for unmapped key codes', () => {
      const mapper = createMapper();
      expect(mapper.mapKey(999, KeyModifiers.None, TerminalModes.None)).toBeNull();
    });

    it('should not map letter keys (handled by text input)', () => {
      const mapper = createMapper();
      // Letter A (VK 65) → mapped to C1 grid, but no sequence (character key)
      const seq = mapper.mapKey(65, KeyModifiers.None, TerminalModes.None);
      expect(seq).toBeNull();
    });
  });

  // --- Navigation keys with sequences ---

  describe('Navigation keys', () => {
    it('should map Delete (VK 46) to STRYK', () => {
      const mapper = createMapper();
      const seq = mapper.mapKey(46, KeyModifiers.None, TerminalModes.None);
      expect(seq).toBe('\x1B[10_'); // G47 STRYK normal
    });

    it('should map Insert (VK 45) to INNS', () => {
      const mapper = createMapper();
      const seq = mapper.mapKey(45, KeyModifiers.None, TerminalModes.None);
      expect(seq).toBe('\x1B[82_'); // D99 INNS normal
    });

    it('should map PageDown (VK 34) to ROLLDN', () => {
      const mapper = createMapper();
      const seq = mapper.mapKey(34, KeyModifiers.None, TerminalModes.None);
      expect(seq).toBe('\x1B[32_'); // D49 ROLLDN normal
    });

    it('should map PageUp (VK 33) to ROLLUP', () => {
      const mapper = createMapper();
      const seq = mapper.mapKey(33, KeyModifiers.None, TerminalModes.None);
      expect(seq).toBe('\x1B[28_'); // D47 ROLLUP normal
    });

    it('should map Tab (VK 9) to TAB', () => {
      const mapper = createMapper();
      const seq = mapper.mapKey(9, KeyModifiers.None, TerminalModes.None);
      expect(seq).toBe('\x1B[16_'); // F47 TAB normal
    });
  });
});
