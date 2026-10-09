/**
 * Tests for TDV2200KeyRegistry — the single source of truth for TDV keyboard data.
 */
import { describe, it, expect } from 'vitest';
import { TDV2200KeyRegistry, TDVKeyColor, TDVKeyFlags, LANGUAGE_CODES } from '../../../src/keyboard/TDV2200KeyRegistry';

describe('TDV2200KeyRegistry', () => {
  // --- Key retrieval ---

  describe('getKey', () => {
    it('should return ESC key at G0', () => {
      const key = TDV2200KeyRegistry.getKey('G0');
      expect(key).not.toBeNull();
      expect(key!.name).toBe('ESC');
      expect(key!.color).toBe(TDVKeyColor.Orange);
      expect(key!.alwaysSameCode).toBe(true);
    });

    it('should return PUSH keys as programmable', () => {
      for (let i = 1; i <= 8; i++) {
        const key = TDV2200KeyRegistry.getKey(`G${i}`);
        expect(key).not.toBeNull();
        expect(key!.name).toBe(`P${i}`);
        expect(key!.isProgrammable).toBe(true);
      }
    });

    it('should return null for nonexistent key', () => {
      const key = TDV2200KeyRegistry.getKey('Z99');
      expect(key).toBeNull();
    });

    it('should have RETURN key at C13 with AlwaysSameCode', () => {
      const key = TDV2200KeyRegistry.getKey('C13');
      expect(key).not.toBeNull();
      expect(key!.name).toBe('RETURN');
      expect(key!.alwaysSameCode).toBe(true);
      expect(key!.extNormal).toBe('\x0D');
    });

    it('should have modifier keys for LSHIFT, RSHIFT, CTRL', () => {
      const lshift = TDV2200KeyRegistry.getKey('B99');
      expect(lshift!.flags & TDVKeyFlags.IsModifier).toBeTruthy();

      const rshift = TDV2200KeyRegistry.getKey('B11');
      expect(rshift!.flags & TDVKeyFlags.IsModifier).toBeTruthy();

      const ctrl = TDV2200KeyRegistry.getKey('D0');
      expect(ctrl!.flags & TDVKeyFlags.IsModifier).toBeTruthy();
    });

    it('should have toggle keys for CAPS and LOCK', () => {
      const caps = TDV2200KeyRegistry.getKey('E0');
      expect(caps!.flags & TDVKeyFlags.IsToggle).toBeTruthy();

      const lock = TDV2200KeyRegistry.getKey('C0');
      expect(lock!.flags & TDVKeyFlags.IsToggle).toBeTruthy();
    });

    it('should have numeric pad keys', () => {
      const kp7 = TDV2200KeyRegistry.getKey('D51');
      expect(kp7!.isNumericPad).toBe(true);
      expect(kp7!.numPadFunc).toBe('\x1B[75_');

      const kp0 = TDV2200KeyRegistry.getKey('A51');
      expect(kp0!.isNumericPad).toBe(true);
      expect(kp0!.numPadFunc).toBe('\x1B[68_');
    });
  });

  // --- Sequence resolution ---

  describe('getSequence', () => {
    it('should return extended mode normal sequence', () => {
      const seq = TDV2200KeyRegistry.getSequence('G9', true, false);
      expect(seq).toBe('\x1B[00_'); // MERK normal
    });

    it('should return extended mode shifted sequence', () => {
      const seq = TDV2200KeyRegistry.getSequence('G9', true, false, true);
      expect(seq).toBe('\x1B[01_'); // MERK shifted
    });

    it('should return ctrl sequence for F2', () => {
      const seq = TDV2200KeyRegistry.getSequence('F52', true, false, false, true);
      expect(seq).toBe('\x1B[54_'); // F2 ctrl
    });

    it('should return null for programmable keys', () => {
      const seq = TDV2200KeyRegistry.getSequence('G1', true, false);
      expect(seq).toBeNull();
    });

    it('should return same code for AlwaysSameCode keys regardless of shift', () => {
      const normal = TDV2200KeyRegistry.getSequence('C48', true, false, false); // UP
      const shifted = TDV2200KeyRegistry.getSequence('C48', true, false, true);
      expect(normal).toBe('\x1C');
      expect(shifted).toBe('\x1C'); // Same code
    });

    it('should return numpad function mode sequence when active', () => {
      const seq = TDV2200KeyRegistry.getSequence('D51', true, true); // KP7 in numpad func mode
      expect(seq).toBe('\x1B[75_');
    });

    it('should return simple ASCII mode codes when extended=false', () => {
      const seq = TDV2200KeyRegistry.getSequence('G10', false, false); // FELT
      expect(seq).toBe('\x02'); // STX
    });

    it('should return C0 for AlwaysSameCode keys in simple mode', () => {
      const seq = TDV2200KeyRegistry.getSequence('C13', false, false); // RETURN
      expect(seq).toBe('\x0D');
    });

    it('should return null for nonexistent key', () => {
      const seq = TDV2200KeyRegistry.getSequence('Z99', true, false);
      expect(seq).toBeNull();
    });

    // Function keys F1-F8
    it('should return correct extended sequences for F1-F4', () => {
      expect(TDV2200KeyRegistry.getSequence('F51', true, false)).toBe('\x1B[50_');
      expect(TDV2200KeyRegistry.getSequence('F52', true, false)).toBe('\x1B[52_');
      expect(TDV2200KeyRegistry.getSequence('F53', true, false)).toBe('\x1B[55_');
      expect(TDV2200KeyRegistry.getSequence('F54', true, false)).toBe('\x1B[58_');
    });

    it('should return correct extended sequences for F5-F8', () => {
      expect(TDV2200KeyRegistry.getSequence('E51', true, false)).toBe('\x1B[60_');
      expect(TDV2200KeyRegistry.getSequence('E52', true, false)).toBe('\x1B[62_');
      expect(TDV2200KeyRegistry.getSequence('E53', true, false)).toBe('\x1B[64_');
      expect(TDV2200KeyRegistry.getSequence('E54', true, false)).toBe('\x1B[66_');
    });

    // Navigation keys
    it('should return correct arrow key C0 codes', () => {
      expect(TDV2200KeyRegistry.getSequence('C48', true, false)).toBe('\x1C'); // UP
      expect(TDV2200KeyRegistry.getSequence('A48', true, false)).toBe('\x0B'); // DOWN
      expect(TDV2200KeyRegistry.getSequence('B47', true, false)).toBe('\x08'); // LEFT
      expect(TDV2200KeyRegistry.getSequence('B49', true, false)).toBe('\x18'); // RIGHT
      expect(TDV2200KeyRegistry.getSequence('B48', true, false)).toBe('\x1D'); // HOME
    });
  });

  // --- Name/VK lookups ---

  describe('getGridForVK', () => {
    it('should map VK_UP to C48', () => {
      expect(TDV2200KeyRegistry.getGridForVK(38)).toBe('C48');
    });

    it('should map VK_RETURN to C13', () => {
      expect(TDV2200KeyRegistry.getGridForVK(13)).toBe('C13');
    });

    it('should map VK_F1 to F51', () => {
      expect(TDV2200KeyRegistry.getGridForVK(112)).toBe('F51');
    });

    it('should return null for unmapped VK', () => {
      expect(TDV2200KeyRegistry.getGridForVK(999)).toBeNull();
    });
  });

  describe('getGridForName', () => {
    it('should resolve English aliases', () => {
      expect(TDV2200KeyRegistry.getGridForName('HELP')).toBe('G53');
      expect(TDV2200KeyRegistry.getGridForName('COPY')).toBe('G48');
      expect(TDV2200KeyRegistry.getGridForName('MOVE')).toBe('G49');
      expect(TDV2200KeyRegistry.getGridForName('EXIT')).toBe('G54');
    });

    it('should be case-insensitive', () => {
      expect(TDV2200KeyRegistry.getGridForName('help')).toBe('G53');
      expect(TDV2200KeyRegistry.getGridForName('Help')).toBe('G53');
    });

    it('should resolve PUSH key aliases', () => {
      for (let i = 1; i <= 8; i++) {
        expect(TDV2200KeyRegistry.getGridForName(`PUSH${i}`)).toBe(`G${i}`);
      }
    });

    it('should resolve navigation aliases', () => {
      expect(TDV2200KeyRegistry.getGridForName('ARROWUP')).toBe('C48');
      expect(TDV2200KeyRegistry.getGridForName('ARROWDOWN')).toBe('A48');
      expect(TDV2200KeyRegistry.getGridForName('ARROWLEFT')).toBe('B47');
      expect(TDV2200KeyRegistry.getGridForName('ARROWRIGHT')).toBe('B49');
      expect(TDV2200KeyRegistry.getGridForName('HOME')).toBe('B48');
    });

    it('should resolve numpad aliases', () => {
      expect(TDV2200KeyRegistry.getGridForName('NUMPAD7')).toBe('D51');
      expect(TDV2200KeyRegistry.getGridForName('KP_0')).toBe('A51');
    });
  });

  // --- Labels ---

  describe('getLabel', () => {
    it('should return Norwegian labels', () => {
      const label = TDV2200KeyRegistry.getLabel('G53', 'no');
      expect(label).not.toBeNull();
      expect(label!.primary).toBe('HJELP');
    });

    it('should return English labels', () => {
      const label = TDV2200KeyRegistry.getLabel('G53', 'en');
      expect(label).not.toBeNull();
      expect(label!.primary).toBe('HELP');
    });

    it('should return Swedish labels', () => {
      const label = TDV2200KeyRegistry.getLabel('G53', 'sv');
      expect(label).not.toBeNull();
      expect(label!.primary).toBe('HJ\u00C4LP');
    });

    it('should return labels for all 12 languages', () => {
      for (const lang of LANGUAGE_CODES) {
        const label = TDV2200KeyRegistry.getLabel('G53', lang);
        expect(label).not.toBeNull();
        expect(label!.primary).toBeTruthy();
      }
    });

    it('should return national character variants for D11', () => {
      // Norwegian Å
      expect(TDV2200KeyRegistry.getLabel('D11', 'no')!.primary).toBe('\u00C5');
      // US [
      expect(TDV2200KeyRegistry.getLabel('D11', 'us')!.primary).toBe('[');
      // German Ü
      expect(TDV2200KeyRegistry.getLabel('D11', 'de')!.primary).toBe('\u00DC');
      // Icelandic Ð
      expect(TDV2200KeyRegistry.getLabel('D11', 'is')!.primary).toBe('\u00D0');
    });
  });

  // --- Alt mappings ---

  describe('Alt key mappings', () => {
    it('should map Alt+H to HELP (G53)', () => {
      expect(TDV2200KeyRegistry.getDefaultAltTarget(72)).toBe('G53');
    });

    it('should map Alt+D to REPLACE (F49)', () => {
      expect(TDV2200KeyRegistry.getDefaultAltTarget(68)).toBe('F49');
    });

    it('should map Alt+1-8 to PUSH keys G1-G8', () => {
      for (let i = 1; i <= 8; i++) {
        expect(TDV2200KeyRegistry.getDefaultAltTarget(48 + i)).toBe(`G${i}`);
      }
    });

    it('should map Alt+F1-F8 to PUSH keys G1-G8', () => {
      for (let i = 0; i < 8; i++) {
        expect(TDV2200KeyRegistry.getDefaultAltTarget(112 + i)).toBe(`G${i + 1}`);
      }
    });

    it('should map Alt+Shift+F1-F8 to shifted PUSH keys', () => {
      for (let i = 0; i < 8; i++) {
        expect(TDV2200KeyRegistry.getDefaultAltShiftTarget(112 + i)).toBe(`G${i + 1}`);
      }
    });

    it('should map editing keys correctly', () => {
      expect(TDV2200KeyRegistry.getDefaultAltTarget(65)).toBe('G9');  // Alt+A → MERK
      expect(TDV2200KeyRegistry.getDefaultAltTarget(76)).toBe('G10'); // Alt+L → FELT
      expect(TDV2200KeyRegistry.getDefaultAltTarget(75)).toBe('G48'); // Alt+K → KOPI
      expect(TDV2200KeyRegistry.getDefaultAltTarget(86)).toBe('G49'); // Alt+V → FLYTT
    });

    it('should map navigation keys correctly', () => {
      expect(TDV2200KeyRegistry.getDefaultAltTarget(46)).toBe('G47'); // Alt+Delete → STRYK
      expect(TDV2200KeyRegistry.getDefaultAltTarget(33)).toBe('D47'); // Alt+PageUp → ROLLUP
      expect(TDV2200KeyRegistry.getDefaultAltTarget(34)).toBe('D49'); // Alt+PageDown → ROLLDN
    });
  });

  // --- English names ---

  describe('getEnglishName', () => {
    it('should return HELP for G53', () => {
      expect(TDV2200KeyRegistry.getEnglishName('G53')).toBe('HELP');
    });

    it('should return key name for unlabeled keys', () => {
      expect(TDV2200KeyRegistry.getEnglishName('G0')).toBe('ESC');
    });

    it('should return null for nonexistent keys', () => {
      expect(TDV2200KeyRegistry.getEnglishName('Z99')).toBeNull();
    });
  });
});
