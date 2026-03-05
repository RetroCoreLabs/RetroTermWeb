/**
 * TDV2200 FontNumber Cross-Validation Tests
 * Port of missing test cases from C# TDV2200CharacterSetTests.cs.
 *
 * Tests that all printable ASCII characters have fontNumber=0
 * and validates the real-world TestServer main menu scenario.
 */
import { describe, it, expect } from 'vitest';
import { TDV2200Emulator } from '../../../src/emulators/tdv/TDV2200Emulator';

describe('TDV2200 FontNumber Validation', () => {

  it('all printable ASCII 0x20-0x6F should have fontNumber 0', () => {
    const emulator = new TDV2200Emulator(80, 24);

    // Write first 80 printable ASCII characters (0x20 to 0x6F)
    const bytes = new Uint8Array(80);
    for (let i = 0; i < 80; i++) {
      bytes[i] = 0x20 + i;
    }
    emulator.processData(bytes);

    // Verify all have fontNumber=0 and correct codepoints
    for (let col = 0; col < 80; col++) {
      const cell = emulator.buffer.getCell(0, col);
      expect(cell.fontNumber).toBe(0);
      expect(cell.codepoint).toBe(0x20 + col);
    }
  });

  it('real-world TestServer main menu should display correctly', () => {
    const emulator = new TDV2200Emulator(80, 24);

    // ESC[2J ESC[H (clear screen and home cursor)
    emulator.processData(new Uint8Array([
      0x1B, 0x5B, 0x32, 0x4A, 0x1B, 0x5B, 0x48,
    ]));

    // ESC[1;36m === Main Menu === ESC[0m
    emulator.processData(new Uint8Array([
      0x1B, 0x5B, 0x31, 0x3B, 0x33, 0x36, 0x6D, // ESC[1;36m
      0x3D, 0x3D, 0x3D, 0x20,                     // "=== "
      0x4D, 0x61, 0x69, 0x6E, 0x20,               // "Main "
      0x4D, 0x65, 0x6E, 0x75, 0x20,               // "Menu "
      0x3D, 0x3D, 0x3D,                           // "==="
      0x1B, 0x5B, 0x30, 0x6D,                     // ESC[0m
    ]));

    const expectedText = '=== Main Menu ===';
    for (let i = 0; i < expectedText.length; i++) {
      const cell = emulator.buffer.getCell(0, i);
      expect(cell.codepoint).toBe(expectedText.charCodeAt(i));
      expect(cell.fontNumber).toBe(0);
    }
  });
});
