/**
 * UI tests for runtime emulator type switching.
 * Runs in happy-dom environment.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Terminal } from '../../src/terminal/Terminal';
import { TDV2215Emulator } from '../../src/emulators/tdv/TDV2215Emulator';
import { TDV2200Emulator } from '../../src/emulators/tdv/TDV2200Emulator';
import { TerminalEmulatorBase } from '../../src/emulators/TerminalEmulatorBase';

describe('Terminal emulator switching', () => {
  let container: HTMLElement;
  let term: Terminal;

  beforeEach(() => {
    container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '400px';
    document.body.appendChild(container);
    term = new Terminal({ rows: 24, cols: 80 });
    term.open(container);
  });

  afterEach(() => {
    term.dispose();
    document.body.innerHTML = '';
  });

  it('should default to VT100 emulator', () => {
    expect(term.getEmulatorType()).toBe('vt100');
    expect(term.getEmulator()).toBeInstanceOf(TerminalEmulatorBase);
  });

  it('should switch to TDV2215', () => {
    term.setEmulatorType('tdv2215');
    expect(term.getEmulatorType()).toBe('tdv2215');
    expect(term.getEmulator()).toBeInstanceOf(TDV2215Emulator);
  });

  it('should switch to TDV2200', () => {
    term.setEmulatorType('tdv2200');
    expect(term.getEmulatorType()).toBe('tdv2200');
    expect(term.getEmulator()).toBeInstanceOf(TDV2200Emulator);
  });

  it('should switch back to VT100', () => {
    term.setEmulatorType('tdv2200');
    term.setEmulatorType('vt100');
    expect(term.getEmulatorType()).toBe('vt100');
    expect(term.getEmulator()).toBeInstanceOf(TerminalEmulatorBase);
  });

  it('should be no-op when switching to same type', () => {
    const emu = term.getEmulator();
    term.setEmulatorType('vt100');
    expect(term.getEmulator()).toBe(emu); // Same instance
  });

  it('should accept write after switching emulators', () => {
    term.setEmulatorType('tdv2200');
    term.write('Hello TDV');

    const emu = term.getEmulator();
    expect(emu.buffer.getCell(0, 0).codepoint).toBe('H'.charCodeAt(0));
  });

  it('should wire onData event after switching', () => {
    term.setEmulatorType('tdv2200');

    let received = false;
    term.onData(() => { received = true; });

    // DA query should trigger a response
    term.write('\x1b[c');
    expect(received).toBe(true);
  });

  it('should start with initial emulator type from options', () => {
    const t = new Terminal({ emulatorType: 'tdv2215', rows: 24, cols: 80 });
    t.open(container);
    expect(t.getEmulatorType()).toBe('tdv2215');
    expect(t.getEmulator()).toBeInstanceOf(TDV2215Emulator);
    t.dispose();
  });
});
