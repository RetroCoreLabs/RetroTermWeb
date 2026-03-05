/**
 * UI tests for advanced terminal modes and features.
 * Covers Insert Mode (IRM), New Line Mode (LNM), Reverse Video Mode (DECSCNM),
 * Cursor Style (DECSCUSR), and Tab Stop Management (HTS/TBC).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Terminal } from '../../src/terminal/Terminal';

describe('Advanced Modes Rendering', () => {
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

  function emu(): any { return term.getEmulator(); }
  function buf() { return emu().buffer; }
  function cursor() { return emu().cursor; }
  function rowText(row: number): string {
    let text = '';
    for (let col = 0; col < 80; col++) text += buf().getCell(row, col).getString();
    return text.trimEnd();
  }

  describe('Insert Mode (IRM — ESC[4h / ESC[4l)', () => {
    it('ESC[4h should enable insert mode', () => {
      term.write('\x1b[4h');
      expect(emu().insertMode).toBe(true);
    });

    it('ESC[4l should disable insert mode', () => {
      term.write('\x1b[4h');
      term.write('\x1b[4l');
      expect(emu().insertMode).toBe(false);
    });

    it('in insert mode, writing should shift existing characters right', () => {
      term.write('ABCDE');
      term.write('\x1b[1;2H'); // Move to col 2 (B position)
      term.write('\x1b[4h');   // Enable insert mode
      term.write('X');         // Insert X at position 1
      // Should be: A X B C D E
      expect(buf().getCell(0, 0).codepoint).toBe(0x41); // A
      expect(buf().getCell(0, 1).codepoint).toBe(0x58); // X (inserted)
      expect(buf().getCell(0, 2).codepoint).toBe(0x42); // B (shifted right)
      expect(buf().getCell(0, 3).codepoint).toBe(0x43); // C
      expect(buf().getCell(0, 4).codepoint).toBe(0x44); // D
      expect(buf().getCell(0, 5).codepoint).toBe(0x45); // E
    });

    it('in replace mode (default), writing should overwrite characters', () => {
      term.write('ABCDE');
      term.write('\x1b[1;2H'); // Move to col 2
      term.write('X');         // Overwrite B
      expect(buf().getCell(0, 0).codepoint).toBe(0x41); // A
      expect(buf().getCell(0, 1).codepoint).toBe(0x58); // X (replaced)
      expect(buf().getCell(0, 2).codepoint).toBe(0x43); // C (unchanged)
    });

    it('RIS should reset insert mode', () => {
      term.write('\x1b[4h');
      term.write('\x1bc');
      expect(emu().insertMode).toBe(false);
    });
  });

  describe('New Line Mode (LNM — ESC[20h / ESC[20l)', () => {
    it('ESC[20h should enable new line mode', () => {
      term.write('\x1b[20h');
      expect(emu().newLineMode).toBe(true);
    });

    it('ESC[20l should disable new line mode', () => {
      term.write('\x1b[20h');
      term.write('\x1b[20l');
      expect(emu().newLineMode).toBe(false);
    });

    it('in new line mode, CR should also trigger LF', () => {
      term.write('\x1b[20h');
      term.write('Line1\r');  // CR should also LF
      term.write('Line2');
      expect(rowText(0)).toBe('Line1');
      expect(rowText(1)).toBe('Line2');
    });

    it('in normal mode, CR should only return to column 0', () => {
      term.write('Line1\r');  // CR only — cursor returns to col 0, same row
      term.write('Over');     // Overwrites cols 0-3 on same line
      // 'Line1' (5 chars) then CR → col 0, then 'Over' (4 chars) overwrites cols 0-3
      expect(rowText(0)).toBe('Over1');
      expect(buf().getCell(0, 0).codepoint).toBe(0x4F); // O
      expect(buf().getCell(0, 4).codepoint).toBe(0x31); // 1 (from Line1, not overwritten)
    });
  });

  describe('Reverse Video Mode (DECSCNM — ESC[?5h / ESC[?5l)', () => {
    it('ESC[?5h should enable reverse video mode', () => {
      term.write('\x1b[?5h');
      expect(emu().reverseVideoMode).toBe(true);
    });

    it('ESC[?5l should disable reverse video mode', () => {
      term.write('\x1b[?5h');
      term.write('\x1b[?5l');
      expect(emu().reverseVideoMode).toBe(false);
    });

    it('RIS should reset reverse video mode', () => {
      term.write('\x1b[?5h');
      term.write('\x1bc');
      expect(emu().reverseVideoMode).toBe(false);
    });
  });

  describe('Cursor Style (DECSCUSR — ESC[Ps SP q)', () => {
    it('ESC[2 q should set steady block cursor', () => {
      term.write('\x1b[2 q');
      expect(cursor().style).toBe(0); // CursorStyle.Block = 0
    });

    it('ESC[4 q should set steady underline cursor', () => {
      term.write('\x1b[4 q');
      expect(cursor().style).toBe(1); // CursorStyle.Underline = 1
    });

    it('ESC[6 q should set steady bar cursor', () => {
      term.write('\x1b[6 q');
      expect(cursor().style).toBe(2); // CursorStyle.Bar = 2
    });

    it('ESC[1 q should set blinking block cursor', () => {
      term.write('\x1b[1 q');
      expect(cursor().style).toBe(3); // CursorStyle.BlinkingBlock = 3
    });

    it('ESC[3 q should set blinking underline cursor', () => {
      term.write('\x1b[3 q');
      expect(cursor().style).toBe(4); // CursorStyle.BlinkingUnderline = 4
    });

    it('ESC[5 q should set blinking bar cursor', () => {
      term.write('\x1b[5 q');
      expect(cursor().style).toBe(5); // CursorStyle.BlinkingBar = 5
    });

    it('ESC[0 q should set default (blinking block)', () => {
      term.write('\x1b[6 q'); // Set bar first
      term.write('\x1b[0 q'); // Reset to default
      expect(cursor().style).toBe(3); // CursorStyle.BlinkingBlock = 3
    });
  });

  describe('Tab Stop Management (HTS / TBC)', () => {
    it('default tab stops should be every 8 columns', () => {
      term.write('\t');
      expect(cursor().column).toBe(8);
      term.write('\t');
      expect(cursor().column).toBe(16);
    });

    it('ESC H (HTS) should set tab stop at cursor position', () => {
      // Move to column 5 and set tab stop
      term.write('\x1b[1;6H\x1bH');
      // Move to beginning and tab
      term.write('\x1b[1;1H\t');
      expect(cursor().column).toBe(5); // Custom tab stop at col 5
    });

    it('CSI 0 g (TBC) should clear tab stop at cursor position', () => {
      // Clear the tab stop at column 8
      term.write('\x1b[1;9H\x1b[0g');
      // Tab from beginning should skip col 8 and go to col 16
      term.write('\x1b[1;1H\t');
      expect(cursor().column).toBe(16);
    });

    it('CSI 3 g should clear all tab stops', () => {
      term.write('\x1b[3g'); // Clear all
      // Tab from beginning should go to end of line
      term.write('\x1b[1;1H\t');
      expect(cursor().column).toBe(79);
    });

    it('RIS should restore default tab stops', () => {
      term.write('\x1b[3g'); // Clear all
      term.write('\x1bc');   // RIS
      term.write('\t');
      expect(cursor().column).toBe(8);
    });

    it('custom tab stop should work after clearing defaults', () => {
      term.write('\x1b[3g');        // Clear all tab stops
      term.write('\x1b[1;11H\x1bH'); // Set tab at col 10
      term.write('\x1b[1;21H\x1bH'); // Set tab at col 20
      term.write('\x1b[1;1H\t');    // Tab from col 0
      expect(cursor().column).toBe(10);
      term.write('\t');
      expect(cursor().column).toBe(20);
    });
  });
});
