import { describe, it, expect } from 'vitest';
import { TDVCharacterSetManager, ICharacterSetEmulator } from '../../../src/emulators/tdv/components/TDVCharacterSetManager';
import { TDVCharacterSetType, CHARSET_TYPE_TO_FONTNUM } from '../../../src/emulators/tdv/components/TDVCharacterSets';

function createMockEmulator(
  g2: TDVCharacterSetType = TDVCharacterSetType.GraphicsI,
  g3: TDVCharacterSetType = TDVCharacterSetType.GraphicsII,
): ICharacterSetEmulator {
  return {
    getG2CharacterSet: () => g2,
    getG3CharacterSet: () => g3,
  };
}

describe('TDVCharacterSetManager', () => {
  it('should initialize with no active single shifts', () => {
    const mgr = new TDVCharacterSetManager(createMockEmulator());
    expect(mgr.isSS2Active).toBe(false);
    expect(mgr.isSS3Active).toBe(false);
  });

  it('should activate SS2', () => {
    const mgr = new TDVCharacterSetManager(createMockEmulator());
    mgr.activateSS2();
    expect(mgr.isSS2Active).toBe(true);
  });

  it('should activate SS3', () => {
    const mgr = new TDVCharacterSetManager(createMockEmulator());
    mgr.activateSS3();
    expect(mgr.isSS3Active).toBe(true);
  });

  it('should process SS2 with raw byte and correct fontNumber from G2 charset', () => {
    const mgr = new TDVCharacterSetManager(createMockEmulator());
    mgr.activateSS2();
    const result = mgr.processSingleShift2(0x60);
    expect(result).not.toBeNull();
    // G2 = GraphicsI → fontNumber 2, raw byte preserved (no Unicode mapping)
    expect(result!.mappedChar).toBe(0x60);
    expect(result!.fontNumber).toBe(2);
    // SS2 should be cleared after one character
    expect(mgr.isSS2Active).toBe(false);
  });

  it('should process SS3 with raw byte and correct fontNumber from G3 charset', () => {
    const mgr = new TDVCharacterSetManager(createMockEmulator());
    mgr.activateSS3();
    const result = mgr.processSingleShift3(0x60);
    expect(result).not.toBeNull();
    // G3 = GraphicsII → fontNumber 3, raw byte preserved
    expect(result!.mappedChar).toBe(0x60);
    expect(result!.fontNumber).toBe(3);
    expect(mgr.isSS3Active).toBe(false);
  });

  it('should pass through raw bytes for non-Graphics G2 charset in SS2', () => {
    // G2 = Math → fontNumber 2, raw byte pass-through (Math maps to Greek/Math ROM bank)
    const mgr = new TDVCharacterSetManager(
      createMockEmulator(TDVCharacterSetType.Math, TDVCharacterSetType.GraphicsII),
    );
    mgr.activateSS2();
    const result = mgr.processSingleShift2(0x65);
    expect(result).not.toBeNull();
    expect(result!.mappedChar).toBe(0x65); // raw byte pass-through
    expect(result!.fontNumber).toBe(2); // Math → bank 2
  });

  it('should pass through raw bytes for non-Graphics G3 charset in SS3', () => {
    // G3 = Greek → fontNumber 2, raw byte pass-through (Greek maps to Greek/Math ROM bank)
    const mgr = new TDVCharacterSetManager(
      createMockEmulator(TDVCharacterSetType.GraphicsI, TDVCharacterSetType.Greek),
    );
    mgr.activateSS3();
    const result = mgr.processSingleShift3(0x65);
    expect(result).not.toBeNull();
    expect(result!.mappedChar).toBe(0x65); // raw byte pass-through
    expect(result!.fontNumber).toBe(2); // Greek → bank 2
  });

  it('should return fontNumber 0 for USASCII charset', () => {
    const mgr = new TDVCharacterSetManager(
      createMockEmulator(TDVCharacterSetType.USASCII, TDVCharacterSetType.USASCII),
    );
    mgr.activateSS2();
    const result = mgr.processSingleShift2(0x41);
    expect(result).not.toBeNull();
    expect(result!.mappedChar).toBe(0x41);
    expect(result!.fontNumber).toBe(0);
  });

  it('should return null when no single shift is active', () => {
    const mgr = new TDVCharacterSetManager(createMockEmulator());
    expect(mgr.processSingleShift2(0x60)).toBeNull();
    expect(mgr.processSingleShift3(0x60)).toBeNull();
  });

  it('handleSingleShift should delegate to SS2 or SS3', () => {
    const mgr = new TDVCharacterSetManager(createMockEmulator());
    mgr.activateSS2();
    const result = mgr.handleSingleShift(0x60);
    expect(result).not.toBeNull();
    expect(result!.fontNumber).toBe(2);
  });

  it('handleSingleShift should return null when neither active', () => {
    const mgr = new TDVCharacterSetManager(createMockEmulator());
    expect(mgr.handleSingleShift(0x60)).toBeNull();
  });

  it('should reset all state', () => {
    const mgr = new TDVCharacterSetManager(createMockEmulator());
    mgr.activateSS2();
    mgr.reset();
    expect(mgr.isSS2Active).toBe(false);
  });

  it('clearSingleShiftFlags should clear both flags', () => {
    const mgr = new TDVCharacterSetManager(createMockEmulator());
    mgr.activateSS3();
    mgr.clearSingleShiftFlags();
    expect(mgr.isSS3Active).toBe(false);
  });
});
