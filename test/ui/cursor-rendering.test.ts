/**
 * UI tests for cursor operations rendering verification.
 * Verifies cursor movement, save/restore, visibility, bounds clamping, and origin mode.
 * Runs in happy-dom environment.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Terminal } from '../../src/terminal/Terminal';

describe('Cursor Movement Rendering', () => {
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

  it('CUP moves cursor and subsequent text renders at position', () => {
    // ESC[5;10H positions cursor at row 5, col 10 (1-based)
    term.write('\x1b[5;10HX');

    const emu = term.getEmulator();
    const buffer = emu.buffer;
    // CUP is 1-based, buffer is 0-based: row 4, col 9
    expect(buffer.getCell(4, 9).codepoint).toBe('X'.charCodeAt(0));
  });

  it('CUU moves cursor up', () => {
    // Move cursor to row 5 (1-based row 6)
    term.write('\x1b[6;1H');
    // Write reference text
    term.write('REF');
    // Move back to row 5 col 1, then CUU 2 to go up 2 rows to row 3
    term.write('\x1b[6;1H\x1b[2AX');

    const emu = term.getEmulator();
    const buffer = emu.buffer;
    // Started at row 5 (0-based), moved up 2 -> row 3 (0-based)
    expect(buffer.getCell(3, 0).codepoint).toBe('X'.charCodeAt(0));
  });

  it('CUD moves cursor down', () => {
    // Start at row 0, col 0 (home)
    term.write('\x1b[H');
    // CUD 3 to move down 3 rows
    term.write('\x1b[3BX');

    const emu = term.getEmulator();
    const buffer = emu.buffer;
    // Row 0 + 3 = row 3 (0-based)
    expect(buffer.getCell(3, 0).codepoint).toBe('X'.charCodeAt(0));
  });

  it('CUF moves cursor forward', () => {
    // Start at home position
    term.write('\x1b[H');
    // CUF 5 to move forward 5 columns
    term.write('\x1b[5CX');

    const emu = term.getEmulator();
    const buffer = emu.buffer;
    // Col 0 + 5 = col 5 (0-based)
    expect(buffer.getCell(0, 5).codepoint).toBe('X'.charCodeAt(0));
  });

  it('CUB moves cursor backward and overwrites character', () => {
    // Write ABCDE at start of row 0
    term.write('\x1b[HABCDE');
    // CUB 3 to move backward 3 columns (from col 5 to col 2)
    term.write('\x1b[3DX');

    const emu = term.getEmulator();
    const buffer = emu.buffer;
    // X should overwrite C at col 2
    expect(buffer.getCell(0, 0).codepoint).toBe('A'.charCodeAt(0));
    expect(buffer.getCell(0, 1).codepoint).toBe('B'.charCodeAt(0));
    expect(buffer.getCell(0, 2).codepoint).toBe('X'.charCodeAt(0));
    expect(buffer.getCell(0, 3).codepoint).toBe('D'.charCodeAt(0));
    expect(buffer.getCell(0, 4).codepoint).toBe('E'.charCodeAt(0));
  });

  it('CHA sets cursor horizontal absolute position', () => {
    // ESC[20G moves cursor to column 20 (1-based)
    term.write('\x1b[20GX');

    const emu = term.getEmulator();
    const buffer = emu.buffer;
    // Column 20 (1-based) = column 19 (0-based)
    expect(buffer.getCell(0, 19).codepoint).toBe('X'.charCodeAt(0));
  });

  it('VPA sets vertical position absolute', () => {
    // ESC[10d moves cursor to row 10 (1-based)
    term.write('\x1b[10dX');

    const emu = term.getEmulator();
    const buffer = emu.buffer;
    // Row 10 (1-based) = row 9 (0-based)
    expect(buffer.getCell(9, 0).codepoint).toBe('X'.charCodeAt(0));
  });

  it('CNL moves cursor to next line start', () => {
    // Write 'Hello' on row 0
    term.write('Hello');
    // CNL 2 moves down 2 lines and to column 0
    term.write('\x1b[2EX');

    const emu = term.getEmulator();
    const buffer = emu.buffer;
    // Started at row 0, moved down 2 -> row 2, col 0
    expect(buffer.getCell(2, 0).codepoint).toBe('X'.charCodeAt(0));
  });

  it('CPL moves cursor to previous line start', () => {
    // Move to row 5 (1-based row 6)
    term.write('\x1b[6;10H');
    // CPL 2 moves up 2 lines and to column 0
    term.write('\x1b[2FX');

    const emu = term.getEmulator();
    const buffer = emu.buffer;
    // Started at row 5 (0-based), moved up 2 -> row 3, col 0
    expect(buffer.getCell(3, 0).codepoint).toBe('X'.charCodeAt(0));
  });

  it('Home (CUP no params) moves cursor to (0,0)', () => {
    // Move to row 5, col 10
    term.write('\x1b[6;11HZ');
    // ESC[H with no params = home position
    term.write('\x1b[HX');

    const emu = term.getEmulator();
    const buffer = emu.buffer;
    // X should be at (0,0)
    expect(buffer.getCell(0, 0).codepoint).toBe('X'.charCodeAt(0));
    // Z should still be at (5, 10)
    expect(buffer.getCell(5, 10).codepoint).toBe('Z'.charCodeAt(0));
  });
});

describe('Cursor Save/Restore Rendering', () => {
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

  it('DECSC/DECRC should preserve cursor position', () => {
    // Move to (5,10) using CUP (1-based: 6,11)
    term.write('\x1b[6;11H');
    // Save cursor position (ESC 7)
    term.write('\x1b7');
    // Move to (0,0)
    term.write('\x1b[H');
    // Write something at (0,0)
    term.write('Z');
    // Restore cursor position (ESC 8)
    term.write('\x1b8');
    // Write X at restored position
    term.write('X');

    const emu = term.getEmulator();
    const buffer = emu.buffer;
    // X should be at restored position (5, 10)
    expect(buffer.getCell(5, 10).codepoint).toBe('X'.charCodeAt(0));
    // Z should be at (0, 0) where we wrote before restore
    expect(buffer.getCell(0, 0).codepoint).toBe('Z'.charCodeAt(0));
  });

  it('DECSC/DECRC preserves position while attributes are independent', () => {
    // Move to a known position
    term.write('\x1b[3;5H');
    // Set bold (SGR 1)
    term.write('\x1b[1m');
    // Save cursor (ESC 7) — saves position and style, not character attributes
    term.write('\x1b7');
    // Reset attributes (SGR 0)
    term.write('\x1b[0m');
    // Move elsewhere and write 'A' (should be normal, not bold)
    term.write('\x1b[1;1HA');
    // Restore cursor (ESC 8) — restores position only
    term.write('\x1b8');
    // Write 'B' at restored position
    term.write('B');

    const emu = term.getEmulator();
    const buffer = emu.buffer;
    // A at (0,0) should NOT have bold attribute (attrs were reset before writing)
    const cellA = buffer.getCell(0, 0);
    expect(cellA.codepoint).toBe('A'.charCodeAt(0));
    expect(cellA.attributes & 0x0001).toBeFalsy(); // Not bold

    // B should be at restored position (2, 4) — row 3 col 5 (1-based) = (2, 4) (0-based)
    const cellB = buffer.getCell(2, 4);
    expect(cellB.codepoint).toBe('B'.charCodeAt(0));
    // B is also not bold because SGR 0 reset was done before restore and restore does not
    // affect the currentAttributes — they remain at whatever state they were in
    expect(cellB.attributes & 0x0001).toBeFalsy();
  });
});

describe('Cursor Visibility Rendering', () => {
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

  it('DECTCEM hide cursor', () => {
    // ESC[?25l hides cursor
    term.write('\x1b[?25l');

    const emu = term.getEmulator();
    expect(emu.cursor.visible).toBe(false);
  });

  it('DECTCEM show cursor after hide', () => {
    // Hide then show
    term.write('\x1b[?25l');
    term.write('\x1b[?25h');

    const emu = term.getEmulator();
    expect(emu.cursor.visible).toBe(true);
  });
});

describe('Cursor Bounds Rendering', () => {
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

  it('CUP should clamp to last row', () => {
    // ESC[100;1H — row 100 far exceeds 24-row terminal
    term.write('\x1b[100;1H');

    const emu = term.getEmulator();
    // Should clamp to last row (23, 0-based)
    expect(emu.cursor.row).toBe(23);
  });

  it('CUP should clamp to last column', () => {
    // ESC[1;200H — col 200 far exceeds 80-col terminal
    term.write('\x1b[1;200H');

    const emu = term.getEmulator();
    // Should clamp to last column (79, 0-based)
    expect(emu.cursor.column).toBe(79);
  });

  it('CUP(0,0) treated as (1,1)', () => {
    // Move somewhere first
    term.write('\x1b[10;10H');
    // ESC[0;0H — zero params treated as 1 by CUP
    term.write('\x1b[0;0H');

    const emu = term.getEmulator();
    // (1,1) in 1-based = (0,0) in 0-based
    expect(emu.cursor.row).toBe(0);
    expect(emu.cursor.column).toBe(0);
  });
});

describe('Origin Mode Rendering', () => {
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

  it('DECOM set — CUP positions relative to scroll region', () => {
    // Set scroll region rows 5-20 (1-based)
    term.write('\x1b[5;20r');
    // Enable origin mode (DECOM)
    term.write('\x1b[?6h');
    // CUP(1,1) should be relative to scroll region top (row 4, 0-based)
    term.write('\x1b[1;1HX');

    const emu = term.getEmulator();
    const buffer = emu.buffer;
    // Row 1 in origin mode = scroll region top (row 4, 0-based)
    expect(buffer.getCell(4, 0).codepoint).toBe('X'.charCodeAt(0));
  });

  it('DECOM reset — CUP positions absolute', () => {
    // Set scroll region
    term.write('\x1b[5;20r');
    // Enable then disable origin mode
    term.write('\x1b[?6h');
    term.write('\x1b[?6l');
    // CUP(1,1) should be absolute (row 0, col 0)
    term.write('\x1b[1;1HX');

    const emu = term.getEmulator();
    const buffer = emu.buffer;
    // Absolute positioning: row 0, col 0
    expect(buffer.getCell(0, 0).codepoint).toBe('X'.charCodeAt(0));
  });
});
