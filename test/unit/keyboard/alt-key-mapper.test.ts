/**
 * Tests for AltKeyMapper — ALT+key → TDV special key mapping.
 */
import { describe, it, expect } from 'vitest';
import { mapAltKeyToGrid, mapAltKeyToSequence } from '../../../src/keyboard/AltKeyMapper';

describe('AltKeyMapper', () => {
  describe('mapAltKeyToGrid', () => {
    it('should map Alt+H to HELP (G53)', () => {
      expect(mapAltKeyToGrid('h')).toBe('G53');
      expect(mapAltKeyToGrid('H')).toBe('G53');
    });

    it('should map Alt+D to REPLACE (F49)', () => {
      expect(mapAltKeyToGrid('d')).toBe('F49');
    });

    it('should map Alt+U to FUNC (G51)', () => {
      expect(mapAltKeyToGrid('u')).toBe('G51');
    });

    it('should map Alt+P to PRINT (G52)', () => {
      expect(mapAltKeyToGrid('p')).toBe('G52');
    });

    it('should map Alt+S to EXIT (G54)', () => {
      expect(mapAltKeyToGrid('s')).toBe('G54');
    });

    it('should map Alt+M to MODE (C99)', () => {
      expect(mapAltKeyToGrid('m')).toBe('C99');
    });

    it('should map Alt+F to SEARCH (F48)', () => {
      expect(mapAltKeyToGrid('f')).toBe('F48');
    });

    it('should map Alt+A to MARK (G9)', () => {
      expect(mapAltKeyToGrid('a')).toBe('G9');
    });

    it('should map Alt+K to COPY (G48)', () => {
      expect(mapAltKeyToGrid('k')).toBe('G48');
    });

    it('should map Alt+V to MOVE (G49)', () => {
      expect(mapAltKeyToGrid('v')).toBe('G49');
    });

    it('should map Alt+1 through Alt+8 to PUSH keys', () => {
      for (let i = 1; i <= 8; i++) {
        expect(mapAltKeyToGrid(String(i))).toBe(`G${i}`);
      }
    });

    it('should map Alt+F1-F8 to PUSH keys', () => {
      for (let i = 1; i <= 8; i++) {
        expect(mapAltKeyToGrid(`F${i}`)).toBe(`G${i}`);
      }
    });

    it('should map Alt+Delete to STRYK (G47)', () => {
      expect(mapAltKeyToGrid('Delete')).toBe('G47');
    });

    it('should map Alt+PageUp to ROLLUP (D47)', () => {
      expect(mapAltKeyToGrid('PageUp')).toBe('D47');
    });

    it('should map Alt+Backspace to ANGRE (D48)', () => {
      expect(mapAltKeyToGrid('Backspace')).toBe('D48');
    });

    it('should return null for unmapped keys', () => {
      expect(mapAltKeyToGrid('q')).toBeNull();
      expect(mapAltKeyToGrid('z')).toBeNull();
      expect(mapAltKeyToGrid('0')).toBeNull();
    });

    it('should handle shifted Alt mappings for F1-F8', () => {
      for (let i = 1; i <= 8; i++) {
        expect(mapAltKeyToGrid(`F${i}`, true)).toBe(`G${i}`);
      }
    });
  });

  describe('mapAltKeyToSequence', () => {
    it('should return HELP sequence for Alt+H', () => {
      expect(mapAltKeyToSequence('h')).toBe('\x1B[46_');
    });

    it('should return EXIT sequence for Alt+S', () => {
      expect(mapAltKeyToSequence('s')).toBe('\x1B[48_');
    });

    it('should return null for PUSH keys (programmable)', () => {
      expect(mapAltKeyToSequence('1')).toBeNull(); // PUSH1 is programmable
    });

    it('should return null for unmapped keys', () => {
      expect(mapAltKeyToSequence('q')).toBeNull();
    });
  });
});
