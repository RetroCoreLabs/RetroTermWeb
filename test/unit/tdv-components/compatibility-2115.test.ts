import { describe, it, expect } from 'vitest';
import { TDV2115CompatibilityHandler, I2115Emulator } from '../../../src/emulators/tdv/components/TDV2115CompatibilityHandler';

function createMockEmulator(): I2115Emulator {
  const state = {
    cursorRow: 0,
    cursorCol: 0,
    erasedLine: false,
    erasedPage: false,
    rolledUp: false,
    rolledDown: false,
    cursorToStart: false,
    cursorHomed: false,
    cellAttrs: new Map<string, number>(),
  };
  return {
    width: 80,
    height: 24,
    cursor: {
      get row() { return state.cursorRow; },
      set row(v: number) { state.cursorRow = v; },
      get column() { return state.cursorCol; },
      set column(v: number) { state.cursorCol = v; },
      moveTo(row: number, col: number) { state.cursorRow = row; state.cursorCol = col; },
    },
    eraseCurrentLine() { state.erasedLine = true; },
    erasePage() { state.erasedPage = true; },
    rollUp() { state.rolledUp = true; },
    rollDown() { state.rolledDown = true; },
    cursorToStartOfLine() { state.cursorToStart = true; state.cursorCol = 0; },
    cursorHome() { state.cursorHomed = true; state.cursorRow = 0; state.cursorCol = 0; },
    buffer: {
      getCellRef(_row: number, _col: number) {
        return { attributes: 0 };
      },
    },
    _state: state,
  } as I2115Emulator & { _state: typeof state };
}

describe('TDV2115CompatibilityHandler', () => {
  it('should initialize in normal mode', () => {
    const handler = new TDV2115CompatibilityHandler(createMockEmulator());
    expect(handler.is2115CompatibilityMode).toBe(false);
    expect(handler.videoOn).toBe(true);
    expect(handler.isDLEMode).toBe(false);
  });

  it('should enable/disable 2115 compatibility mode', () => {
    const handler = new TDV2115CompatibilityHandler(createMockEmulator());
    handler.set2115CompatibilityMode(true);
    expect(handler.is2115CompatibilityMode).toBe(true);
    handler.set2115CompatibilityMode(false);
    expect(handler.is2115CompatibilityMode).toBe(false);
  });

  it('should not handle characters when not in 2115 mode', () => {
    const handler = new TDV2115CompatibilityHandler(createMockEmulator());
    expect(handler.processTDV2115ControlCharacter(0x02)).toBe(false);
  });

  describe('in 2115 mode', () => {
    function setup() {
      const emu = createMockEmulator();
      const handler = new TDV2115CompatibilityHandler(emu);
      handler.set2115CompatibilityMode(true);
      return { handler, emu: emu as ReturnType<typeof createMockEmulator> & { _state: any } };
    }

    it('STX (0x02) should turn video off', () => {
      const { handler } = setup();
      expect(handler.processTDV2115ControlCharacter(0x02)).toBe(true);
      expect(handler.videoOn).toBe(false);
    });

    it('ETX (0x03) should turn video on', () => {
      const { handler } = setup();
      handler.processTDV2115ControlCharacter(0x02); // off
      handler.processTDV2115ControlCharacter(0x03); // on
      expect(handler.videoOn).toBe(true);
    });

    it('EOT (0x04) should erase current line', () => {
      const { handler, emu } = setup();
      handler.processTDV2115ControlCharacter(0x04);
      expect(emu._state.erasedLine).toBe(true);
    });

    it('EM (0x19) should erase page', () => {
      const { handler, emu } = setup();
      handler.processTDV2115ControlCharacter(0x19);
      expect(emu._state.erasedPage).toBe(true);
    });

    it('ENQ (0x05) should set LED 1', () => {
      const { handler } = setup();
      handler.processTDV2115ControlCharacter(0x05);
      expect(handler.leds[0]).toBe(true);
    });

    it('ACK (0x06) should set LED 2', () => {
      const { handler } = setup();
      handler.processTDV2115ControlCharacter(0x06);
      expect(handler.leds[1]).toBe(true);
    });

    it('NAK (0x15) should set LED 3', () => {
      const { handler } = setup();
      handler.processTDV2115ControlCharacter(0x15);
      expect(handler.leds[2]).toBe(true);
    });

    it('SYN (0x16) should clear all LEDs', () => {
      const { handler } = setup();
      handler.processTDV2115ControlCharacter(0x05); // LED 1
      handler.processTDV2115ControlCharacter(0x06); // LED 2
      handler.processTDV2115ControlCharacter(0x15); // LED 3
      handler.processTDV2115ControlCharacter(0x16); // Clear all
      expect(handler.leds[0]).toBe(false);
      expect(handler.leds[1]).toBe(false);
      expect(handler.leds[2]).toBe(false);
    });

    it('BS (0x08) should move cursor left', () => {
      const { handler, emu } = setup();
      emu.cursor.column = 5;
      handler.processTDV2115ControlCharacter(0x08);
      expect(emu.cursor.column).toBe(4);
    });

    it('BS at column 0 should not wrap', () => {
      const { handler, emu } = setup();
      emu.cursor.column = 0;
      handler.processTDV2115ControlCharacter(0x08);
      expect(emu.cursor.column).toBe(0);
    });

    it('CAN (0x18) should move cursor right', () => {
      const { handler, emu } = setup();
      emu.cursor.column = 5;
      handler.processTDV2115ControlCharacter(0x18);
      expect(emu.cursor.column).toBe(6);
    });

    it('FS (0x1C) should move cursor up', () => {
      const { handler, emu } = setup();
      emu.cursor.row = 5;
      handler.processTDV2115ControlCharacter(0x1C);
      expect(emu.cursor.row).toBe(4);
    });

    it('LF (0x0A) should move cursor down', () => {
      const { handler, emu } = setup();
      emu.cursor.row = 5;
      handler.processTDV2115ControlCharacter(0x0A);
      expect(emu.cursor.row).toBe(6);
    });

    it('LF at bottom should roll up', () => {
      const { handler, emu } = setup();
      emu.cursor.row = 23; // last row
      handler.processTDV2115ControlCharacter(0x0A);
      expect(emu._state.rolledUp).toBe(true);
    });

    it('FF (0x0C) should roll up', () => {
      const { handler, emu } = setup();
      handler.processTDV2115ControlCharacter(0x0C);
      expect(emu._state.rolledUp).toBe(true);
    });

    it('ETB (0x17) should roll down', () => {
      const { handler, emu } = setup();
      handler.processTDV2115ControlCharacter(0x17);
      expect(emu._state.rolledDown).toBe(true);
    });

    it('CR (0x0D) should move to start of line', () => {
      const { handler, emu } = setup();
      emu.cursor.column = 40;
      handler.processTDV2115ControlCharacter(0x0D);
      expect(emu.cursor.column).toBe(0);
    });

    it('GS (0x1D) should home cursor', () => {
      const { handler, emu } = setup();
      emu.cursor.moveTo(10, 30);
      handler.processTDV2115ControlCharacter(0x1D);
      expect(emu.cursor.row).toBe(0);
      expect(emu.cursor.column).toBe(0);
    });

    it('DLE (0x10) should start DLE mode', () => {
      const { handler } = setup();
      handler.processTDV2115ControlCharacter(0x10);
      expect(handler.isDLEMode).toBe(true);
    });

    it('BEL (0x07) should not be handled (returns false)', () => {
      const { handler } = setup();
      expect(handler.processTDV2115ControlCharacter(0x07)).toBe(false);
    });

    it('HT (0x09) should not be handled (returns false)', () => {
      const { handler } = setup();
      expect(handler.processTDV2115ControlCharacter(0x09)).toBe(false);
    });
  });

  describe('DLE binary cursor positioning', () => {
    it('should position cursor with two bytes', () => {
      const emu = createMockEmulator();
      const handler = new TDV2115CompatibilityHandler(emu);
      handler.set2115CompatibilityMode(true);
      handler.processTDV2115ControlCharacter(0x10); // DLE
      expect(handler.isDLEMode).toBe(true);
      handler.handleDLEByte(5);  // Line 5
      expect(handler.isDLEMode).toBe(true); // Still need column
      handler.handleDLEByte(10); // Column 10
      expect(handler.isDLEMode).toBe(false);
      expect(emu.cursor.row).toBe(5);
      expect(emu.cursor.column).toBe(10);
    });

    it('should mask line to 5 bits and column to 7 bits', () => {
      const emu = createMockEmulator();
      const handler = new TDV2115CompatibilityHandler(emu);
      handler.set2115CompatibilityMode(true);
      handler.processTDV2115ControlCharacter(0x10); // DLE
      handler.handleDLEByte(0xFF); // Line mask: 0xFF & 0x1F = 31
      handler.handleDLEByte(0xFF); // Column mask: 0xFF & 0x7F = 127
      // Position out of bounds (31 >= 24, 127 >= 80), so cursor should not move
      expect(handler.isDLEMode).toBe(false);
    });

    it('handleDLE should return false when not in DLE mode', () => {
      const emu = createMockEmulator();
      const handler = new TDV2115CompatibilityHandler(emu);
      expect(handler.handleDLE(5)).toBe(false);
    });

    it('handleDLE should return true when in DLE mode', () => {
      const emu = createMockEmulator();
      const handler = new TDV2115CompatibilityHandler(emu);
      handler.set2115CompatibilityMode(true);
      handler.processTDV2115ControlCharacter(0x10); // DLE
      expect(handler.handleDLE(5)).toBe(true);
    });
  });

  it('should reset all state', () => {
    const emu = createMockEmulator();
    const handler = new TDV2115CompatibilityHandler(emu);
    handler.set2115CompatibilityMode(true);
    handler.processTDV2115ControlCharacter(0x02); // Video off
    handler.processTDV2115ControlCharacter(0x05); // LED 1
    handler.reset();
    expect(handler.is2115CompatibilityMode).toBe(false);
    expect(handler.videoOn).toBe(true);
    expect(handler.leds[0]).toBe(false);
    expect(handler.isDLEMode).toBe(false);
  });
});
