import { describe, it, expect } from 'vitest';
import { TerminalEmulatorBase } from '../../../src/emulators/TerminalEmulatorBase';

function encode(str: string): Uint8Array {
  const arr = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    arr[i] = str.charCodeAt(i);
  }
  return arr;
}

describe('TerminalEmulatorBase — getTerminalType and getTerminalCapabilities', () => {
  it('should return Terminal for base type', () => {
    const emu = new TerminalEmulatorBase(80, 24);
    expect(emu.getTerminalType()).toBe('Terminal');
  });

  it('should return Basic for base capabilities', () => {
    const emu = new TerminalEmulatorBase(80, 24);
    expect(emu.getTerminalCapabilities()).toBe('Basic');
  });
});

describe('TerminalEmulatorBase — characterSetVariant', () => {
  it('should return 0 for base emulator', () => {
    const emu = new TerminalEmulatorBase(80, 24);
    expect(emu.characterSetVariant).toBe(0);
  });

  it('should accept set without effect on base', () => {
    const emu = new TerminalEmulatorBase(80, 24);
    emu.characterSetVariant = 5;
    // Base class ignores the setter
    expect(emu.characterSetVariant).toBe(0);
  });
});

describe('TerminalEmulatorBase — G0/G1/G2/G3 character set designation', () => {
  it('should designate G0 via ESC ( B (US ASCII)', () => {
    const emu = new TerminalEmulatorBase(80, 24);
    emu.processData(encode('\x1b(B'));
    expect(emu.characterSets[0]).toBe(0); // US ASCII
  });

  it('should designate G0 via ESC ( 0 (DEC Special Graphics)', () => {
    const emu = new TerminalEmulatorBase(80, 24);
    emu.processData(encode('\x1b(0'));
    expect(emu.characterSets[0]).toBe(2); // DEC Special Graphics
  });

  it('should designate G1 via ESC ) A (UK)', () => {
    const emu = new TerminalEmulatorBase(80, 24);
    emu.processData(encode('\x1b)A'));
    expect(emu.characterSets[1]).toBe(1); // UK
  });

  it('should designate G2 via ESC * B (US ASCII)', () => {
    const emu = new TerminalEmulatorBase(80, 24);
    emu.processData(encode('\x1b*B'));
    expect(emu.characterSets[2]).toBe(0); // US ASCII
  });

  it('should designate G2 via ESC * 0 (DEC Special Graphics)', () => {
    const emu = new TerminalEmulatorBase(80, 24);
    emu.processData(encode('\x1b*0'));
    expect(emu.characterSets[2]).toBe(2); // DEC Special Graphics
  });

  it('should designate G3 via ESC + B (US ASCII)', () => {
    const emu = new TerminalEmulatorBase(80, 24);
    emu.processData(encode('\x1b+B'));
    expect(emu.characterSets[3]).toBe(0); // US ASCII
  });

  it('should designate G3 via ESC + A (UK)', () => {
    const emu = new TerminalEmulatorBase(80, 24);
    emu.processData(encode('\x1b+A'));
    expect(emu.characterSets[3]).toBe(1); // UK
  });
});

describe('TerminalEmulatorBase — handleTabClear mode 3', () => {
  it('should clear all tab stops with ESC[3g', () => {
    const emu = new TerminalEmulatorBase(80, 24);
    // Default tab stops at every 8 columns
    // Set cursor to col 8, verify tab stop exists
    emu.cursor.column = 0;
    emu.processData(encode('\t')); // Tab should move to col 8
    expect(emu.cursor.column).toBe(8);

    // Clear all tab stops
    emu.processData(encode('\x1b[3g'));

    // Reset cursor and try tab again - should go to end of line (no stops)
    emu.cursor.column = 0;
    emu.processData(encode('\t'));
    // With no tab stops, behavior depends on implementation
    // Most implementations move to last column or stay put
    expect(emu.cursor.column).not.toBe(8);
  });
});

describe('TerminalEmulatorBase — DECSCUSR cursor style', () => {
  // CursorStyle enum: Block=0, Underline=1, Bar=2, BlinkingBlock=3, BlinkingUnderline=4, BlinkingBar=5
  it('should set cursor style via CSI 2 SP q (steady block)', () => {
    const emu = new TerminalEmulatorBase(80, 24);
    emu.processData(encode('\x1b[2 q'));
    expect(emu.cursor.style).toBe(0); // CursorStyle.Block
  });

  it('should set cursor style via CSI 4 SP q (steady underline)', () => {
    const emu = new TerminalEmulatorBase(80, 24);
    emu.processData(encode('\x1b[4 q'));
    expect(emu.cursor.style).toBe(1); // CursorStyle.Underline
  });

  it('should set cursor style via CSI 1 SP q (blinking block)', () => {
    const emu = new TerminalEmulatorBase(80, 24);
    emu.processData(encode('\x1b[1 q'));
    expect(emu.cursor.style).toBe(3); // CursorStyle.BlinkingBlock
  });

  it('should set cursor style via CSI 6 SP q (steady bar)', () => {
    const emu = new TerminalEmulatorBase(80, 24);
    emu.processData(encode('\x1b[6 q'));
    expect(emu.cursor.style).toBe(2); // CursorStyle.Bar
  });
});
