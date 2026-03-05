/**
 * UI tests for erase operations rendering.
 * Verifies ED, EL, ECH, ICH, DCH, IL, DL render correctly through
 * the Terminal pipeline to buffer state.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Terminal } from '../../src/terminal/Terminal';

describe('Erase Operations Rendering', () => {
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

  function buf() { return term.getEmulator().buffer; }
  function cursor() { return term.getEmulator().cursor; }
  function rowText(row: number): string {
    let text = '';
    for (let col = 0; col < 80; col++) text += buf().getCell(row, col).getString();
    return text.trimEnd();
  }
  function isEmpty(row: number, col: number): boolean {
    const cp = buf().getCell(row, col).codepoint;
    return cp === 0 || cp === 0x20;
  }

  describe('ED (Erase in Display)', () => {
    it('ED 0 should erase from cursor to end of display', () => {
      term.write('ABCDEF');
      term.write('\x1b[1;4H\x1b[0J'); // Cursor at col 3, erase forward
      expect(rowText(0)).toBe('ABC');
    });

    it('ED 0 should erase subsequent rows', () => {
      term.write('\x1b[1;1HRow0\x1b[2;1HRow1\x1b[3;1HRow2');
      term.write('\x1b[2;1H\x1b[0J');
      expect(rowText(0)).toBe('Row0');
      expect(rowText(1)).toBe('');
      expect(rowText(2)).toBe('');
    });

    it('ED 1 should erase from start to cursor (inclusive)', () => {
      term.write('ABCDEF');
      term.write('\x1b[1;4H\x1b[1J'); // Cursor at col 3
      expect(isEmpty(0, 0)).toBe(true);
      expect(isEmpty(0, 3)).toBe(true);
      expect(buf().getCell(0, 4).codepoint).toBe(0x45); // E preserved
    });

    it('ED 2 should erase entire display', () => {
      term.write('Hello\x1b[2;1HWorld');
      term.write('\x1b[2J');
      expect(rowText(0)).toBe('');
      expect(rowText(1)).toBe('');
    });

    it('ED 2 should not move cursor', () => {
      term.write('\x1b[6;11HX\x1b[2J');
      expect(cursor().row).toBe(5);
      expect(cursor().column).toBe(11); // cursor advances past 'X'
    });
  });

  describe('EL (Erase in Line)', () => {
    it('EL 0 should erase from cursor to end of line', () => {
      term.write('ABCDEF');
      term.write('\x1b[1;4H\x1b[0K');
      expect(rowText(0)).toBe('ABC');
    });

    it('EL 1 should erase from start to cursor (inclusive)', () => {
      term.write('ABCDEF');
      term.write('\x1b[1;4H\x1b[1K');
      expect(isEmpty(0, 0)).toBe(true);
      expect(isEmpty(0, 3)).toBe(true);
      expect(buf().getCell(0, 4).codepoint).toBe(0x45); // E
    });

    it('EL 2 should erase entire line', () => {
      term.write('ABCDEF');
      term.write('\x1b[2K');
      expect(rowText(0)).toBe('');
    });

    it('EL should not affect other rows', () => {
      term.write('\x1b[1;1HRow0\x1b[2;1HRow1');
      term.write('\x1b[1;1H\x1b[2K');
      expect(rowText(0)).toBe('');
      expect(rowText(1)).toBe('Row1');
    });
  });

  describe('ECH (Erase Characters)', () => {
    it('should erase N characters from cursor', () => {
      term.write('ABCDEF');
      term.write('\x1b[1;2H\x1b[2X');
      expect(buf().getCell(0, 0).codepoint).toBe(0x41); // A
      expect(isEmpty(0, 1)).toBe(true); // erased
      expect(isEmpty(0, 2)).toBe(true); // erased
      expect(buf().getCell(0, 3).codepoint).toBe(0x44); // D preserved
    });

    it('should not move cursor', () => {
      term.write('ABCDEF');
      term.write('\x1b[1;2H\x1b[2X');
      expect(cursor().column).toBe(1);
    });
  });

  describe('IL/DL (Insert/Delete Lines)', () => {
    it('IL should insert blank lines', () => {
      term.write('\x1b[1;1HRow0\x1b[2;1HRow1\x1b[3;1HRow2');
      term.write('\x1b[2;1H\x1b[L');
      expect(rowText(0)).toBe('Row0');
      expect(rowText(1)).toBe(''); // inserted blank
      expect(rowText(2)).toBe('Row1');
    });

    it('DL should delete line and shift up', () => {
      term.write('\x1b[1;1HRow0\x1b[2;1HRow1\x1b[3;1HRow2\x1b[4;1HRow3');
      term.write('\x1b[2;1H\x1b[M');
      expect(rowText(0)).toBe('Row0');
      expect(rowText(1)).toBe('Row2');
      expect(rowText(2)).toBe('Row3');
    });
  });
});
