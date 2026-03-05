/**
 * TDV2200 Locking Shift Tests (Gap Coverage)
 * Port of missing test cases from C# TDV2200LockingShiftTests.cs.
 *
 * Tests SO, LS3 with multiple chars, LS2 with graphic bytes,
 * getCurrentCharacterSet state tracking, and SO with G1 charset assignment.
 */
import { describe, it, expect } from 'vitest';
import { TDV2200Emulator } from '../../../src/emulators/tdv/TDV2200Emulator';

describe('TDV2200 Locking Shift (Gap Coverage)', () => {

  it('SO should set fontNumber based on G1 assignment (default USASCII = fontNum 0)', () => {
    const emulator = new TDV2200Emulator(80, 24);
    emulator.processData(new Uint8Array([0x0E])); // SO
    emulator.processData(new Uint8Array([0x41])); // 'A'

    // G1 is USASCII by default, so fontNum stays 0
    const cell = emulator.buffer.getCell(0, 0);
    expect(cell.fontNumber).toBe(0);
  });

  it('LS3 with 6 characters should all have fontNumber 3', () => {
    const emulator = new TDV2200Emulator(80, 24);
    emulator.processData(new Uint8Array([0x1B, 0x6F])); // ESC o = LS3
    emulator.processData(new Uint8Array([0x31, 0x32, 0x33, 0x34, 0x35, 0x36])); // "123456"

    for (let i = 0; i < 6; i++) {
      expect(emulator.buffer.getCell(0, i).fontNumber).toBe(3);
    }
  });

  it('LS2 with graphic character bytes should all have fontNumber 2', () => {
    const emulator = new TDV2200Emulator(80, 24);
    emulator.processData(new Uint8Array([0x1B, 0x6E])); // ESC n = LS2

    // Line drawing bytes
    emulator.processData(new Uint8Array([0x6A, 0x6B, 0x6C, 0x6D]));

    for (let i = 0; i < 4; i++) {
      expect(emulator.buffer.getCell(0, i).fontNumber).toBe(2);
    }
  });

  it('getCurrentCharacterSet should reflect locking shift state', () => {
    const emulator = new TDV2200Emulator(80, 24);

    expect(emulator.getCurrentCharacterSet()).toBe(0); // Initially G0

    emulator.processData(new Uint8Array([0x1B, 0x6E])); // LS2
    expect(emulator.getCurrentCharacterSet()).toBe(2);

    emulator.processData(new Uint8Array([0x0F])); // SI
    expect(emulator.getCurrentCharacterSet()).toBe(0);

    emulator.processData(new Uint8Array([0x1B, 0x6F])); // LS3
    expect(emulator.getCurrentCharacterSet()).toBe(3);

    emulator.processData(new Uint8Array([0x0E])); // SO
    expect(emulator.getCurrentCharacterSet()).toBe(1);
  });

  it('SO should invoke G1 with assigned charset', () => {
    const emulator = new TDV2200Emulator(80, 24);

    // SO switches to G1. Default G1 is USASCII (fontNum=0)
    emulator.processData(new Uint8Array([0x0E])); // SO
    emulator.processData(new Uint8Array([0x41])); // 'A'

    // Verify character was written
    expect(emulator.buffer.getCell(0, 0).codepoint).toBe(0x41);
    // With USASCII in G1, fontNum is 0
    expect(emulator.buffer.getCell(0, 0).fontNumber).toBe(0);

    // SI should return to G0
    emulator.processData(new Uint8Array([0x0F])); // SI
    emulator.processData(new Uint8Array([0x42])); // 'B'
    expect(emulator.buffer.getCell(0, 1).fontNumber).toBe(0);
  });
});
