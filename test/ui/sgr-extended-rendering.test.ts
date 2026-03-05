/**
 * UI tests for extended SGR attributes: strikethrough, bright colors.
 * Covers features not in the base display-attributes-rendering tests.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Terminal } from '../../src/terminal/Terminal';
import { CharacterAttributes, hasAttribute } from '../../src/buffer/CharacterAttributes';

describe('Extended SGR Rendering', () => {
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

  describe('Strikethrough (SGR 9)', () => {
    it('SGR 9 should set Strikethrough', () => {
      term.write('\x1b[9mStrike');
      expect(hasAttribute(buf().getCell(0, 0).attributes, CharacterAttributes.Strikethrough)).toBe(true);
      expect(hasAttribute(buf().getCell(0, 5).attributes, CharacterAttributes.Strikethrough)).toBe(true);
    });

    it('SGR 29 should clear Strikethrough', () => {
      term.write('\x1b[9mA\x1b[29mB');
      expect(hasAttribute(buf().getCell(0, 0).attributes, CharacterAttributes.Strikethrough)).toBe(true);
      expect(hasAttribute(buf().getCell(0, 1).attributes, CharacterAttributes.Strikethrough)).toBe(false);
    });

    it('SGR 0 should clear Strikethrough', () => {
      term.write('\x1b[9mA\x1b[0mB');
      expect(hasAttribute(buf().getCell(0, 0).attributes, CharacterAttributes.Strikethrough)).toBe(true);
      expect(buf().getCell(0, 1).attributes).toBe(CharacterAttributes.None);
    });

    it('Strikethrough combined with Bold and Underline', () => {
      term.write('\x1b[1;4;9mABC');
      const cell = buf().getCell(0, 0);
      expect(hasAttribute(cell.attributes, CharacterAttributes.Bold)).toBe(true);
      expect(hasAttribute(cell.attributes, CharacterAttributes.Underline)).toBe(true);
      expect(hasAttribute(cell.attributes, CharacterAttributes.Strikethrough)).toBe(true);
    });
  });

  describe('Bright foreground colors (SGR 90-97)', () => {
    it('SGR 90 should set bright black foreground (index 8)', () => {
      term.write('\x1b[90mX');
      expect(buf().getCell(0, 0).foreground.isIndexed).toBe(true);
      expect(buf().getCell(0, 0).foreground.index).toBe(8);
    });

    it('SGR 91 should set bright red foreground (index 9)', () => {
      term.write('\x1b[91mX');
      expect(buf().getCell(0, 0).foreground.index).toBe(9);
    });

    it('SGR 92 should set bright green foreground (index 10)', () => {
      term.write('\x1b[92mX');
      expect(buf().getCell(0, 0).foreground.index).toBe(10);
    });

    it('SGR 93 should set bright yellow foreground (index 11)', () => {
      term.write('\x1b[93mX');
      expect(buf().getCell(0, 0).foreground.index).toBe(11);
    });

    it('SGR 94 should set bright blue foreground (index 12)', () => {
      term.write('\x1b[94mX');
      expect(buf().getCell(0, 0).foreground.index).toBe(12);
    });

    it('SGR 95 should set bright magenta foreground (index 13)', () => {
      term.write('\x1b[95mX');
      expect(buf().getCell(0, 0).foreground.index).toBe(13);
    });

    it('SGR 96 should set bright cyan foreground (index 14)', () => {
      term.write('\x1b[96mX');
      expect(buf().getCell(0, 0).foreground.index).toBe(14);
    });

    it('SGR 97 should set bright white foreground (index 15)', () => {
      term.write('\x1b[97mX');
      expect(buf().getCell(0, 0).foreground.index).toBe(15);
    });
  });

  describe('Bright background colors (SGR 100-107)', () => {
    it('SGR 100 should set bright black background (index 8)', () => {
      term.write('\x1b[100mX');
      expect(buf().getCell(0, 0).background.isIndexed).toBe(true);
      expect(buf().getCell(0, 0).background.index).toBe(8);
    });

    it('SGR 101 should set bright red background (index 9)', () => {
      term.write('\x1b[101mX');
      expect(buf().getCell(0, 0).background.index).toBe(9);
    });

    it('SGR 102 should set bright green background (index 10)', () => {
      term.write('\x1b[102mX');
      expect(buf().getCell(0, 0).background.index).toBe(10);
    });

    it('SGR 103 should set bright yellow background (index 11)', () => {
      term.write('\x1b[103mX');
      expect(buf().getCell(0, 0).background.index).toBe(11);
    });

    it('SGR 107 should set bright white background (index 15)', () => {
      term.write('\x1b[107mX');
      expect(buf().getCell(0, 0).background.index).toBe(15);
    });
  });

  describe('Bright colors distinction from normal', () => {
    it('bright red (91) should differ from normal red (31)', () => {
      term.write('\x1b[31mA\x1b[91mB');
      expect(buf().getCell(0, 0).foreground.index).toBe(1);  // normal red
      expect(buf().getCell(0, 1).foreground.index).toBe(9);  // bright red
    });

    it('bright bg (101) should differ from normal bg (41)', () => {
      term.write('\x1b[41mA\x1b[101mB');
      expect(buf().getCell(0, 0).background.index).toBe(1);  // normal red bg
      expect(buf().getCell(0, 1).background.index).toBe(9);  // bright red bg
    });

    it('bold + bright color should both be set', () => {
      term.write('\x1b[1;91mX');
      const cell = buf().getCell(0, 0);
      expect(hasAttribute(cell.attributes, CharacterAttributes.Bold)).toBe(true);
      expect(cell.foreground.index).toBe(9);
    });
  });
});
