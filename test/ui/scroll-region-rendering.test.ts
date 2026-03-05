/**
 * UI tests for scroll region rendering.
 * Verifies DECSTBM regions, scrolling within regions, content preservation,
 * and reverse scrolling through the Terminal pipeline.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Terminal } from '../../src/terminal/Terminal';
import { CharacterAttributes, hasAttribute } from '../../src/buffer/CharacterAttributes';

describe('Scroll Region Rendering', () => {
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

  describe('Setting scroll region', () => {
    it('DECSTBM should set scroll region', () => {
      term.write('\x1b[5;20r');
      expect(emu().scrollTop).toBe(4);  // 0-based
      expect(emu().scrollBottom).toBe(19);
    });

    it('DECSTBM should home cursor', () => {
      term.write('\x1b[10;10H'); // Move away
      term.write('\x1b[5;20r');
      expect(cursor().row).toBe(0);
      expect(cursor().column).toBe(0);
    });

    it('DECSTBM with no params should reset region', () => {
      term.write('\x1b[5;20r'); // Set region
      term.write('\x1b[r');     // Reset
      expect(emu().scrollTop).toBe(0);
      expect(emu().scrollBottom).toBe(23);
    });
  });

  describe('Scrolling within region', () => {
    it('LF at bottom of region should scroll region only', () => {
      // Fill rows
      for (let i = 0; i < 24; i++) {
        term.write(`\x1b[${i + 1};1HRow${i}`);
      }
      // Set region rows 5-10
      term.write('\x1b[5;10r');
      // Move to bottom of region and LF
      term.write('\x1b[10;1H\n');
      // Content above region should be preserved
      expect(rowText(0)).toBe('Row0');
      expect(rowText(3)).toBe('Row3');
      // Region should have scrolled
      expect(rowText(4)).toBe('Row5');
      // Content below region should be preserved
      expect(rowText(10)).toBe('Row10');
    });

    it('content above region should be preserved', () => {
      term.write('\x1b[1;1HAbove');
      term.write('\x1b[5;10r');
      // Scroll within region
      term.write('\x1b[10;1H\n');
      expect(rowText(0)).toBe('Above');
    });

    it('content below region should be preserved', () => {
      term.write('\x1b[15;1HBelow');
      term.write('\x1b[5;10r');
      term.write('\x1b[10;1H\n');
      expect(rowText(14)).toBe('Below');
    });
  });

  describe('Reverse scroll within region', () => {
    it('RI at top of region should scroll region down', () => {
      for (let i = 0; i < 24; i++) {
        term.write(`\x1b[${i + 1};1HRow${i}`);
      }
      term.write('\x1b[5;10r');
      // Move to top of region and RI
      term.write('\x1b[5;1H\x1bM');
      // Row 4 (top of region) should now be blank
      expect(rowText(4)).toBe('');
      // Old row 4 content should have moved down
      expect(rowText(5)).toBe('Row4');
      // Above/below region preserved
      expect(rowText(0)).toBe('Row0');
      expect(rowText(10)).toBe('Row10');
    });
  });

  describe('Multiple scrolls', () => {
    it('writing past bottom should scroll repeatedly', () => {
      // Write 30 lines (more than 24)
      for (let i = 1; i <= 30; i++) {
        term.write(`Line${i}\r\n`);
      }
      // First lines should have scrolled off
      // 30 writes + 30 newlines, so some lines scrolled
      expect(rowText(0)).not.toBe('Line1');
    });
  });

  describe('Scroll region with attributes', () => {
    it('attributes should be preserved during scroll', () => {
      term.write('\x1b[5;10r');
      // Write bold text in region
      term.write('\x1b[5;1H\x1b[1mBoldText\x1b[0m');
      // Fill to bottom of region to cause scroll
      for (let i = 5; i <= 10; i++) {
        term.write(`\x1b[${i};1H\x1b[1mRow${i}\x1b[0m`);
      }
      term.write('\x1b[10;1H\n'); // scroll
      // Scrolled content should still have bold attribute
      expect(hasAttribute(buf().getCell(4, 0).attributes, CharacterAttributes.Bold)).toBe(true);
    });
  });

  describe('Full-screen scrolling', () => {
    it('writing past bottom of screen should scroll', () => {
      for (let i = 1; i <= 25; i++) {
        term.write(`Line${i}\r\n`);
      }
      // Lines 1-2 scrolled off (24 rows, 25 writes + newlines), Line 3 at row 0
      expect(rowText(0)).toBe('Line3');
    });
  });
});
