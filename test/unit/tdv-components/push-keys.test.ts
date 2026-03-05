import { describe, it, expect } from 'vitest';
import { TDVPushKeys } from '../../../src/emulators/tdv/components/TDVPushKeys';

describe('TDVPushKeys', () => {
  it('should have no keys programmed initially', () => {
    const pk = new TDVPushKeys();
    expect(pk.isKeyProgrammed(1)).toBe(false);
    expect(pk.getKeySequence(1)).toBe(''); // Returns '' for unprogrammed
  });

  it('should program a key', () => {
    const pk = new TDVPushKeys();
    pk.programKey(1, '\x1b[1~');
    expect(pk.isKeyProgrammed(1)).toBe(true);
    expect(pk.getKeySequence(1)).toBe('\x1b[1~');
  });

  it('should program multiple keys', () => {
    const pk = new TDVPushKeys();
    pk.programKey(1, 'seq1');
    pk.programKey(5, 'seq5');
    pk.programKey(8, 'seq8');
    expect(pk.isKeyProgrammed(1)).toBe(true);
    expect(pk.isKeyProgrammed(5)).toBe(true);
    expect(pk.isKeyProgrammed(8)).toBe(true);
    expect(pk.isKeyProgrammed(2)).toBe(false);
  });

  it('should overwrite existing key programming', () => {
    const pk = new TDVPushKeys();
    pk.programKey(1, 'first');
    pk.programKey(1, 'second');
    expect(pk.getKeySequence(1)).toBe('second');
  });

  it('should clear a key', () => {
    const pk = new TDVPushKeys();
    pk.programKey(3, 'sequence');
    pk.clearKey(3);
    expect(pk.isKeyProgrammed(3)).toBe(false);
  });

  it('should get all programmed keys as Map', () => {
    const pk = new TDVPushKeys();
    pk.programKey(1, 'a');
    pk.programKey(3, 'b');
    pk.programKey(7, 'c');
    const all = pk.getAllProgrammedKeys();
    expect(all.size).toBe(3);
    expect(all.get(1)).toBe('a');
    expect(all.get(3)).toBe('b');
    expect(all.get(7)).toBe('c');
  });

  it('should handle key numbers 1-24', () => {
    const pk = new TDVPushKeys();
    pk.programKey(1, 'first');
    pk.programKey(24, 'last');
    expect(pk.getKeySequence(1)).toBe('first');
    expect(pk.getKeySequence(24)).toBe('last');
  });

  it('should throw for out-of-range key numbers', () => {
    const pk = new TDVPushKeys();
    expect(() => pk.programKey(0, 'x')).toThrow(RangeError);
    expect(() => pk.programKey(25, 'x')).toThrow(RangeError);
  });

  it('should clear all keys', () => {
    const pk = new TDVPushKeys();
    pk.programKey(1, 'a');
    pk.programKey(2, 'b');
    pk.clear();
    expect(pk.isKeyProgrammed(1)).toBe(false);
    expect(pk.isKeyProgrammed(2)).toBe(false);
    expect(pk.programmedKeyCount).toBe(0);
  });

  it('should track programmed key count', () => {
    const pk = new TDVPushKeys();
    expect(pk.programmedKeyCount).toBe(0);
    pk.programKey(1, 'a');
    pk.programKey(2, 'b');
    expect(pk.programmedKeyCount).toBe(2);
    pk.clearKey(1);
    expect(pk.programmedKeyCount).toBe(1);
  });
});
