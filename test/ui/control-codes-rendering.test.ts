/**
 * UI tests for control codes, tab stops, and line operations rendering.
 * Verifies C0/C1 control codes, tab behavior, auto-wrap, and insert/delete
 * operations render correctly through the Terminal pipeline.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Terminal } from '../../src/terminal/Terminal';

describe('Control Codes Rendering', () => {
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

  function cursor() { return term.getEmulator().cursor; }
  function buf() { return term.getEmulator().buffer; }
  function rowText(row: number): string {
    let text = '';
    for (let col = 0; col < 80; col++) text += buf().getCell(row, col).getString();
    return text.trimEnd();
  }

  describe('C0 control codes', () => {
    it('BS should move cursor left', () => {
      term.write('AB\x08');
      expect(cursor().column).toBe(1);
    });

    it('BS at column 0 should not wrap', () => {
      term.write('\x08');
      expect(cursor().column).toBe(0);
      expect(cursor().row).toBe(0);
    });

    it('HT should advance to next tab stop (col 8)', () => {
      term.write('A\x09');
      expect(cursor().column).toBe(8);
    });

    it('HT from tab stop should advance to next', () => {
      term.write('\x1b[9G\x09'); // Move to col 8 (1-based 9), then tab
      expect(cursor().column).toBe(16);
    });

    it('HT should not advance past last column', () => {
      term.write('\x1b[73G\x09'); // Col 72, then tab
      expect(cursor().column).toBeLessThanOrEqual(79);
    });

    it('LF should move cursor down', () => {
      term.write('\n');
      expect(cursor().row).toBe(1);
    });

    it('CR should move cursor to column 0', () => {
      term.write('Hello\r');
      expect(cursor().column).toBe(0);
    });

    it('CR+LF should move to start of next line', () => {
      term.write('\r\n');
      expect(cursor().row).toBe(1);
      expect(cursor().column).toBe(0);
    });

    it('BEL should not affect buffer content', () => {
      term.write('A\x07B');
      expect(buf().getCell(0, 0).codepoint).toBe(0x41); // A
      expect(buf().getCell(0, 1).codepoint).toBe(0x42); // B
    });

    it('NUL should be ignored', () => {
      term.write('A');
      term.write(new Uint8Array([0x00]));
      term.write('B');
      expect(buf().getCell(0, 0).codepoint).toBe(0x41); // A
      expect(buf().getCell(0, 1).codepoint).toBe(0x42); // B
    });
  });

  describe('C1 control codes (ESC sequences)', () => {
    it('IND (ESC D) should move cursor down', () => {
      term.write('\x1bD');
      expect(cursor().row).toBe(1);
    });

    it('IND at bottom should scroll', () => {
      // Fill screen
      for (let i = 0; i < 24; i++) {
        term.write(`\x1b[${i + 1};1HRow${i}`);
      }
      // IND at bottom row
      term.write('\x1b[24;1H\x1bD');
      // Row 0 should have scrolled content
      expect(rowText(0)).toBe('Row1');
    });

    it('RI (ESC M) should move cursor up', () => {
      term.write('\x1b[6;1H\x1bM');
      expect(cursor().row).toBe(4);
    });

    it('RI at top should scroll down', () => {
      term.write('TopRow');
      term.write('\x1b[1;1H\x1bM');
      // Row 0 should now be blank (content pushed down)
      expect(rowText(0)).toBe('');
      expect(rowText(1)).toBe('TopRow');
    });

    it('NEL (ESC E) should do CR+LF', () => {
      term.write('Hello\x1bE');
      expect(cursor().row).toBe(1);
      expect(cursor().column).toBe(0);
    });
  });

  describe('Tab stops (default behavior)', () => {
    it('default tab stops are every 8 columns', () => {
      term.write('\x09');
      expect(cursor().column).toBe(8);
      term.write('\x09');
      expect(cursor().column).toBe(16);
      term.write('\x09');
      expect(cursor().column).toBe(24);
    });

    it('multiple tabs in sequence', () => {
      term.write('\x09\x09\x09');
      expect(cursor().column).toBe(24);
    });

    it('tab with preceding text', () => {
      term.write('Hi\x09');
      expect(cursor().column).toBe(8);
    });

    it('tab preserves existing buffer content', () => {
      term.write('Hello\rAB\x09X');
      expect(buf().getCell(0, 0).codepoint).toBe(0x41); // A overwrote H
      expect(buf().getCell(0, 1).codepoint).toBe(0x42); // B overwrote e
      expect(buf().getCell(0, 8).codepoint).toBe(0x58); // X at tab stop
    });
  });

  describe('Auto-wrap rendering', () => {
    it('should wrap at end of line', () => {
      let line = '';
      for (let i = 0; i < 80; i++) line += 'A';
      line += 'B';
      term.write(line);
      expect(buf().getCell(1, 0).codepoint).toBe(0x42); // B wrapped
    });

    it('disabled auto-wrap should not wrap', () => {
      term.write('\x1b[?7l'); // Disable auto-wrap
      let line = '';
      for (let i = 0; i < 81; i++) line += 'A';
      term.write(line);
      expect(cursor().row).toBe(0);
      expect(cursor().column).toBe(79);
    });

    it('re-enabling auto-wrap should work', () => {
      term.write('\x1b[?7l\x1b[?7h'); // Disable then re-enable
      let line = '';
      for (let i = 0; i < 81; i++) line += 'A';
      term.write(line);
      expect(buf().getCell(1, 0).codepoint).toBe(0x41);
    });
  });

  describe('Line operations rendering', () => {
    it('IL should insert blank line at cursor', () => {
      term.write('\x1b[1;1HRow0\x1b[2;1HRow1\x1b[3;1HRow2');
      term.write('\x1b[2;1H\x1b[L'); // Move to row 1, insert line
      expect(rowText(0)).toBe('Row0');
      expect(rowText(1)).toBe(''); // Inserted blank
      expect(rowText(2)).toBe('Row1');
    });

    it('DL should delete line at cursor', () => {
      term.write('\x1b[1;1HRow0\x1b[2;1HRow1\x1b[3;1HRow2\x1b[4;1HRow3');
      term.write('\x1b[2;1H\x1b[M'); // Delete row 1
      expect(rowText(0)).toBe('Row0');
      expect(rowText(1)).toBe('Row2');
      expect(rowText(2)).toBe('Row3');
    });

    it('ICH should insert blank characters', () => {
      term.write('ABCD\x1b[1;2H\x1b[2@'); // Move to col 1, insert 2
      expect(buf().getCell(0, 0).codepoint).toBe(0x41); // A
      expect(buf().getCell(0, 1).codepoint).toBe(0x20); // space
      expect(buf().getCell(0, 2).codepoint).toBe(0x20); // space
      expect(buf().getCell(0, 3).codepoint).toBe(0x42); // B shifted
    });

    it('DCH should delete characters and shift left', () => {
      term.write('ABCDEF\x1b[1;2H\x1b[2P'); // Move to col 1, delete 2
      expect(buf().getCell(0, 0).codepoint).toBe(0x41); // A
      expect(buf().getCell(0, 1).codepoint).toBe(0x44); // D (shifted left)
      expect(buf().getCell(0, 2).codepoint).toBe(0x45); // E
    });

    it('ECH should erase characters without moving cursor', () => {
      term.write('ABCDEF\x1b[1;2H\x1b[2X'); // Move to col 1, erase 2
      expect(buf().getCell(0, 0).codepoint).toBe(0x41); // A
      const c1 = buf().getCell(0, 1).codepoint;
      expect(c1 === 0x20 || c1 === 0).toBe(true); // erased
      expect(buf().getCell(0, 3).codepoint).toBe(0x44); // D preserved
      expect(cursor().column).toBe(1); // cursor didn't move
    });
  });
});
