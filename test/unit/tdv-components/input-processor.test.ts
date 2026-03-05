import { describe, it, expect, vi } from 'vitest';
import { TDVInputProcessor } from '../../../src/emulators/tdv/components/TDVInputProcessor';
import { TDVISO646VariantHandler } from '../../../src/emulators/tdv/components/TDVISO646VariantHandler';
import { TDVCharacterSetManager } from '../../../src/emulators/tdv/components/TDVCharacterSetManager';
import { TDV2115CompatibilityHandler } from '../../../src/emulators/tdv/components/TDV2115CompatibilityHandler';

function encode(str: string): Uint8Array {
  const arr = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    arr[i] = str.charCodeAt(i);
  }
  return arr;
}

function createMockEmulator() {
  const calls: { method: string; args: any[] }[] = [];
  return {
    width: 80,
    height: 24,
    cursor: {
      row: 0,
      column: 0,
      moveTo(row: number, col: number) { this.row = row; this.column = col; },
    },
    processData(data: Uint8Array) {
      calls.push({ method: 'processData', args: [Array.from(data)] });
    },
    eraseCurrentLine() {},
    erasePage() {},
    rollUp() {},
    rollDown() {},
    cursorToStartOfLine() {},
    cursorHome() {},
    buffer: {
      getCellRef() { return { attributes: 0 }; },
    },
    _calls: calls,
  };
}

describe('TDVInputProcessor', () => {
  function setup() {
    const emu = createMockEmulator() as any;
    const iso646 = new TDVISO646VariantHandler();
    const csm = new TDVCharacterSetManager();
    const compat = new TDV2115CompatibilityHandler(emu);
    const processor = new TDVInputProcessor(emu, iso646, csm, compat);
    return { processor, emu, iso646, csm, compat };
  }

  it('should pass data through to emulator in normal mode', () => {
    const { processor, emu } = setup();
    processor.processInput(encode('Hello'));
    expect(emu._calls.length).toBe(1);
    expect(emu._calls[0].method).toBe('processData');
    expect(emu._calls[0].args[0]).toEqual([72, 101, 108, 108, 111]);
  });

  describe('ISO 646 variant selection mode', () => {
    it('should intercept data when expecting variant', () => {
      const { processor, emu, iso646 } = setup();
      iso646.startExpectingVariant();
      // Send 'N' for Norwegian, then more data
      processor.processInput(new Uint8Array([0x4E, 0x41, 0x42]));
      // Variant handled, remaining AB should go to emulator
      expect(iso646.isExpectingVariant).toBe(false);
      expect(emu._calls.length).toBe(1);
      expect(emu._calls[0].args[0]).toEqual([0x41, 0x42]);
    });

    it('should consume all data when variant selector not found', () => {
      const { processor, emu, iso646 } = setup();
      iso646.startExpectingVariant();
      // Send unrecognized bytes that don't match any variant
      // handleVariantSelection returns false for unknown chars
      processor.processInput(new Uint8Array([0x01]));
      // Data consumed but not matching - iso646 returns false, loop continues
      // No data forwarded since no variant matched
      expect(emu._calls.length).toBe(0);
    });

    it('should handle variant selection with no remaining data', () => {
      const { processor, emu, iso646 } = setup();
      iso646.startExpectingVariant();
      // Send just the variant selector 'S' for Swedish
      processor.processInput(new Uint8Array([0x53]));
      expect(iso646.isExpectingVariant).toBe(false);
      // No remaining data, so processData should not be called
      expect(emu._calls.length).toBe(0);
    });
  });

  describe('DLE mode', () => {
    it('should intercept data when in DLE mode', () => {
      const { processor, emu, compat } = setup();
      compat.set2115CompatibilityMode(true);
      compat.processTDV2115ControlCharacter(0x10); // Enter DLE mode
      expect(compat.isDLEMode).toBe(true);

      // Send row byte 5, column byte 10, then remaining data
      processor.processInput(new Uint8Array([5, 10, 0x41, 0x42]));
      // After DLE completes (2 bytes), remaining AB should be forwarded
      expect(compat.isDLEMode).toBe(false);
      expect(emu.cursor.row).toBe(5);
      expect(emu.cursor.column).toBe(10);
      expect(emu._calls.length).toBe(1);
      expect(emu._calls[0].args[0]).toEqual([0x41, 0x42]);
    });

    it('should consume all data when DLE not yet complete', () => {
      const { processor, emu, compat } = setup();
      compat.set2115CompatibilityMode(true);
      compat.processTDV2115ControlCharacter(0x10); // Enter DLE mode
      // Send only one byte (row), DLE still needs column
      processor.processInput(new Uint8Array([5]));
      // DLE still active, data consumed
      expect(compat.isDLEMode).toBe(true);
      expect(emu._calls.length).toBe(0);
    });
  });

  describe('reset', () => {
    it('should reset all handlers', () => {
      const { processor, iso646, compat } = setup();
      iso646.startExpectingVariant();
      compat.set2115CompatibilityMode(true);

      processor.reset();
      expect(iso646.isExpectingVariant).toBe(false);
      expect(compat.is2115CompatibilityMode).toBe(false);
    });
  });
});
