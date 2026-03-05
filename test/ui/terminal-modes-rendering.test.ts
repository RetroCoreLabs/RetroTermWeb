/**
 * UI tests for terminal modes and reset operations.
 * Covers auto-wrap (DECAWM), alternate screen buffer, RIS (hard reset),
 * and mode state verification through the Terminal pipeline.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Terminal } from '../../src/terminal/Terminal';

describe('Terminal Modes Rendering', () => {
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

  describe('Auto-wrap mode (DECAWM)', () => {
    it('ESC[?7h should enable auto-wrap', () => {
      term.write('\x1b[?7h');
      expect(emu().autoWrapMode).toBe(true);
    });

    it('ESC[?7l should disable auto-wrap', () => {
      term.write('\x1b[?7l');
      expect(emu().autoWrapMode).toBe(false);
    });

    it('with auto-wrap enabled, text should wrap to next line', () => {
      term.write('\x1b[?7h');
      // Write exactly 80 chars + 1 to force wrap
      const line = 'A'.repeat(80) + 'B';
      term.write(line);
      expect(buf().getCell(0, 79).codepoint).toBe(0x41); // A at end of line 0
      expect(buf().getCell(1, 0).codepoint).toBe(0x42);  // B at start of line 1
    });

    it('with auto-wrap disabled, cursor should stay at last column', () => {
      term.write('\x1b[?7l');
      const line = 'A'.repeat(80) + 'B';
      term.write(line);
      expect(cursor().column).toBe(79);
      // B should overwrite last position on same line
      expect(buf().getCell(0, 79).codepoint).toBe(0x42);
      // Nothing on line 1
      expect(rowText(1)).toBe('');
    });
  });

  describe('Alternate screen buffer', () => {
    it('DECSET 47 should switch to alternate buffer', () => {
      term.write('Primary');
      term.write('\x1b[?47h');
      expect(buf().isUsingAlternateBuffer).toBe(true);
      // Alternate buffer should be empty
      expect(rowText(0)).toBe('');
    });

    it('DECRST 47 should switch back to primary buffer', () => {
      term.write('Primary');
      term.write('\x1b[?47h');
      term.write('Alternate');
      term.write('\x1b[?47l');
      expect(buf().isUsingAlternateBuffer).toBe(false);
      expect(rowText(0)).toBe('Primary');
    });

    it('DECSET 1049 should save cursor and switch to alternate', () => {
      term.write('\x1b[5;10H'); // Move cursor
      term.write('Text');
      term.write('\x1b[?1049h'); // Save cursor + switch
      expect(buf().isUsingAlternateBuffer).toBe(true);
      expect(rowText(0)).toBe(''); // Alternate is blank
    });

    it('DECRST 1049 should restore primary and cursor', () => {
      term.write('\x1b[5;10H');
      term.write('PrimaryText');
      term.write('\x1b[?1049h'); // Save cursor + switch
      term.write('\x1b[1;1HAlt');
      term.write('\x1b[?1049l'); // Restore
      expect(buf().isUsingAlternateBuffer).toBe(false);
      expect(rowText(4)).toContain('PrimaryText');
    });

    it('content written in alternate buffer should not appear in primary', () => {
      term.write('Primary');
      term.write('\x1b[?47h');
      term.write('Alternate');
      term.write('\x1b[?47l');
      expect(rowText(0)).toBe('Primary');
    });
  });

  describe('Hard reset (RIS — ESC c)', () => {
    it('RIS should clear display', () => {
      term.write('Hello World');
      term.write('\x1bc'); // RIS
      expect(rowText(0)).toBe('');
    });

    it('RIS should home cursor', () => {
      term.write('\x1b[10;20H');
      term.write('\x1bc');
      expect(cursor().row).toBe(0);
      expect(cursor().column).toBe(0);
    });

    it('RIS should reset scroll region', () => {
      term.write('\x1b[5;20r'); // Set scroll region
      term.write('\x1bc');
      expect(emu().scrollTop).toBe(0);
      expect(emu().scrollBottom).toBe(23);
    });

    it('RIS should clear all content on all rows', () => {
      for (let i = 0; i < 24; i++) {
        term.write(`\x1b[${i + 1};1HRow${i}`);
      }
      term.write('\x1bc');
      for (let i = 0; i < 24; i++) {
        expect(rowText(i)).toBe('');
      }
    });
  });

  describe('Cursor visibility (DECTCEM)', () => {
    it('ESC[?25l should hide cursor', () => {
      term.write('\x1b[?25l');
      expect(cursor().visible).toBe(false);
    });

    it('ESC[?25h should show cursor', () => {
      term.write('\x1b[?25l');
      term.write('\x1b[?25h');
      expect(cursor().visible).toBe(true);
    });
  });

  describe('Origin mode (DECOM)', () => {
    it('ESC[?6h should enable origin mode', () => {
      term.write('\x1b[5;20r'); // Set scroll region
      term.write('\x1b[?6h');   // Enable origin mode
      expect(emu().originMode).toBe(true);
      // Cursor is homed
      expect(cursor().row).toBe(0);
      expect(cursor().column).toBe(0);
    });

    it('ESC[?6l should disable origin mode', () => {
      term.write('\x1b[5;20r');
      term.write('\x1b[?6h');
      term.write('\x1b[?6l');
      expect(cursor().row).toBe(0);
      expect(cursor().column).toBe(0);
    });
  });
});
