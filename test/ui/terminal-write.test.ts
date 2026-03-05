/**
 * UI tests for Terminal.write() — output rendering pipeline.
 * Verifies data flows: write() → emulator.processData() → buffer state.
 * Runs in happy-dom environment.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Terminal } from '../../src/terminal/Terminal';

describe('Terminal.write', () => {
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

  it('should render plain text to buffer', () => {
    term.write('Hello, World!');

    const emu = term.getEmulator();
    const buffer = emu.buffer;
    expect(buffer.getCell(0, 0).codepoint).toBe('H'.charCodeAt(0));
    expect(buffer.getCell(0, 1).codepoint).toBe('e'.charCodeAt(0));
    expect(buffer.getCell(0, 4).codepoint).toBe('o'.charCodeAt(0));
    expect(buffer.getCell(0, 7).codepoint).toBe('W'.charCodeAt(0));
    expect(buffer.getCell(0, 12).codepoint).toBe('!'.charCodeAt(0));
  });

  it('should handle CR+LF for new lines', () => {
    term.write('Line 1\r\nLine 2');

    const emu = term.getEmulator();
    const buffer = emu.buffer;
    expect(buffer.getCell(0, 0).codepoint).toBe('L'.charCodeAt(0));
    expect(buffer.getCell(1, 0).codepoint).toBe('L'.charCodeAt(0));
    expect(buffer.getCell(1, 5).codepoint).toBe('2'.charCodeAt(0));
  });

  it('should accept Uint8Array input', () => {
    const data = new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F]); // "Hello"
    term.write(data);

    const emu = term.getEmulator();
    expect(emu.buffer.getCell(0, 0).codepoint).toBe(0x48); // H
    expect(emu.buffer.getCell(0, 4).codepoint).toBe(0x6F); // o
  });

  it('should handle SGR color sequences', () => {
    term.write('\x1b[31mRed\x1b[0m');

    const emu = term.getEmulator();
    const cell = emu.buffer.getCell(0, 0);
    expect(cell.codepoint).toBe('R'.charCodeAt(0));
    // Foreground should be set to color index 1 (red)
    expect(cell.foreground.isIndexed).toBe(true);
    expect(cell.foreground.index).toBe(1);
  });

  it('should handle bold attribute', () => {
    term.write('\x1b[1mBold\x1b[0m Normal');

    const emu = term.getEmulator();
    const boldCell = emu.buffer.getCell(0, 0);
    const normalCell = emu.buffer.getCell(0, 5);

    // Bold cell should have bold attribute
    expect(boldCell.attributes & 0x0001).toBeTruthy(); // Bold flag
    expect(normalCell.attributes & 0x0001).toBeFalsy();
  });

  it('should handle cursor position sequences', () => {
    term.write('\x1b[5;10HX');

    const emu = term.getEmulator();
    // CUP is 1-based, buffer is 0-based
    expect(emu.buffer.getCell(4, 9).codepoint).toBe('X'.charCodeAt(0));
  });

  it('should handle screen clear', () => {
    term.write('Hello');
    term.write('\x1b[2J\x1b[H');
    term.write('World');

    const emu = term.getEmulator();
    expect(emu.buffer.getCell(0, 0).codepoint).toBe('W'.charCodeAt(0));
  });

  it('should handle multiple write calls', () => {
    term.write('AB');
    term.write('CD');

    const emu = term.getEmulator();
    expect(emu.buffer.getCell(0, 0).codepoint).toBe('A'.charCodeAt(0));
    expect(emu.buffer.getCell(0, 1).codepoint).toBe('B'.charCodeAt(0));
    expect(emu.buffer.getCell(0, 2).codepoint).toBe('C'.charCodeAt(0));
    expect(emu.buffer.getCell(0, 3).codepoint).toBe('D'.charCodeAt(0));
  });

  it('should not write after dispose', () => {
    term.dispose();
    // Should not throw
    term.write('test');
  });

  it('should wrap text at column boundary', () => {
    // Write exactly 80 chars + 1 more
    let line = '';
    for (let i = 0; i < 80; i++) line += 'X';
    line += 'Y';
    term.write(line);

    const emu = term.getEmulator();
    expect(emu.buffer.getCell(0, 79).codepoint).toBe('X'.charCodeAt(0));
    expect(emu.buffer.getCell(1, 0).codepoint).toBe('Y'.charCodeAt(0));
  });
});
