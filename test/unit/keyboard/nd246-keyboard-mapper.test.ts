/**
 * Tests for ND246KeyboardMapper — thin wrapper around TDV2200KeyRegistry.
 */
import { describe, it, expect } from 'vitest';
import { ND246KeyboardMapper } from '../../../src/keyboard/ND246KeyboardMapper';

describe('ND246KeyboardMapper', () => {
  function createMapper(): ND246KeyboardMapper {
    return new ND246KeyboardMapper();
  }

  describe('mapGridKey', () => {
    it('should map HELP key in extended mode', () => {
      const mapper = createMapper();
      const seq = mapper.mapGridKey('G53');
      expect(seq).toBe('\x1B[46_');
    });

    it('should map shifted HELP key', () => {
      const mapper = createMapper();
      const seq = mapper.mapGridKey('G53', true);
      expect(seq).toBe('\x1B[47_');
    });

    it('should return null for PUSH keys', () => {
      const mapper = createMapper();
      const seq = mapper.mapGridKey('G1');
      expect(seq).toBeNull();
    });

    it('should return C0 for fixed keys', () => {
      const mapper = createMapper();
      expect(mapper.mapGridKey('C48')).toBe('\x1C'); // UP
      expect(mapper.mapGridKey('C13')).toBe('\x0D'); // RETURN
    });

    it('should return simple ASCII when extended mode is off', () => {
      const mapper = createMapper();
      mapper.extendedControlMode = false;
      expect(mapper.mapGridKey('G10')).toBe('\x02'); // FELT → STX
      expect(mapper.mapGridKey('G11')).toBe('\x01'); // AVSH → SOH
    });

    it('should return numpad function mode sequences when active', () => {
      const mapper = createMapper();
      mapper.numericPadFuncMode = true;
      expect(mapper.mapGridKey('D51')).toBe('\x1B[75_'); // KP7
      expect(mapper.mapGridKey('A51')).toBe('\x1B[68_'); // KP0
    });
  });

  describe('getGridPositionForKey', () => {
    it('should resolve key names to grid positions', () => {
      const mapper = createMapper();
      expect(mapper.getGridPositionForKey('HELP')).toBe('G53');
      expect(mapper.getGridPositionForKey('COPY')).toBe('G48');
      expect(mapper.getGridPositionForKey('EXIT')).toBe('G54');
    });

    it('should return null for unknown names', () => {
      const mapper = createMapper();
      expect(mapper.getGridPositionForKey('UNKNOWN')).toBeNull();
    });
  });

  describe('mapKey (by name)', () => {
    it('should map key name to sequence', () => {
      const mapper = createMapper();
      expect(mapper.mapKey('HELP')).toBe('\x1B[46_');
      expect(mapper.mapKey('EXIT')).toBe('\x1B[48_');
    });

    it('should handle shift/ctrl', () => {
      const mapper = createMapper();
      expect(mapper.mapKey('HELP', true)).toBe('\x1B[47_');
    });

    it('should return null for unknown names', () => {
      const mapper = createMapper();
      expect(mapper.mapKey('NONEXISTENT')).toBeNull();
    });
  });
});
