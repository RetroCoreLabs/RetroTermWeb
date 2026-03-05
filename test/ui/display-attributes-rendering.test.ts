/**
 * UI tests for display attributes and color rendering.
 * Verifies SGR attributes, 256-color, RGB/true color, and color reset
 * render correctly through the Terminal pipeline to buffer state.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Terminal } from '../../src/terminal/Terminal';
import { CharacterAttributes, hasAttribute } from '../../src/buffer/CharacterAttributes';

describe('Display Attributes Rendering', () => {
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

  describe('SGR individual attributes', () => {
    it('SGR 1 should set Bold', () => {
      term.write('\x1b[1mBold');
      expect(hasAttribute(buf().getCell(0, 0).attributes, CharacterAttributes.Bold)).toBe(true);
      expect(hasAttribute(buf().getCell(0, 3).attributes, CharacterAttributes.Bold)).toBe(true);
    });

    it('SGR 2 should set Dim', () => {
      term.write('\x1b[2mDim');
      expect(hasAttribute(buf().getCell(0, 0).attributes, CharacterAttributes.Dim)).toBe(true);
    });

    it('SGR 3 should set Italic', () => {
      term.write('\x1b[3mItalic');
      expect(hasAttribute(buf().getCell(0, 0).attributes, CharacterAttributes.Italic)).toBe(true);
    });

    it('SGR 4 should set Underline', () => {
      term.write('\x1b[4mUnder');
      expect(hasAttribute(buf().getCell(0, 0).attributes, CharacterAttributes.Underline)).toBe(true);
    });

    it('SGR 5 should set Blink', () => {
      term.write('\x1b[5mBlink');
      expect(hasAttribute(buf().getCell(0, 0).attributes, CharacterAttributes.Blink)).toBe(true);
    });

    it('SGR 7 should set Reverse', () => {
      term.write('\x1b[7mRev');
      expect(hasAttribute(buf().getCell(0, 0).attributes, CharacterAttributes.Reverse)).toBe(true);
    });

    it('SGR 8 should set Hidden', () => {
      term.write('\x1b[8mHide');
      expect(hasAttribute(buf().getCell(0, 0).attributes, CharacterAttributes.Hidden)).toBe(true);
    });
  });

  describe('SGR reset', () => {
    it('SGR 0 should clear all attributes', () => {
      term.write('\x1b[1;4mA\x1b[0mB');
      expect(hasAttribute(buf().getCell(0, 0).attributes, CharacterAttributes.Bold)).toBe(true);
      expect(hasAttribute(buf().getCell(0, 0).attributes, CharacterAttributes.Underline)).toBe(true);
      expect(buf().getCell(0, 1).attributes).toBe(CharacterAttributes.None);
    });

    it('SGR 22 should clear bold/dim', () => {
      term.write('\x1b[1mA\x1b[22mB');
      expect(hasAttribute(buf().getCell(0, 0).attributes, CharacterAttributes.Bold)).toBe(true);
      expect(hasAttribute(buf().getCell(0, 1).attributes, CharacterAttributes.Bold)).toBe(false);
    });

    it('SGR 24 should clear underline', () => {
      term.write('\x1b[4mA\x1b[24mB');
      expect(hasAttribute(buf().getCell(0, 0).attributes, CharacterAttributes.Underline)).toBe(true);
      expect(hasAttribute(buf().getCell(0, 1).attributes, CharacterAttributes.Underline)).toBe(false);
    });

    it('SGR 25 should clear blink', () => {
      term.write('\x1b[5mA\x1b[25mB');
      expect(hasAttribute(buf().getCell(0, 0).attributes, CharacterAttributes.Blink)).toBe(true);
      expect(hasAttribute(buf().getCell(0, 1).attributes, CharacterAttributes.Blink)).toBe(false);
    });

    it('SGR 27 should clear reverse', () => {
      term.write('\x1b[7mA\x1b[27mB');
      expect(hasAttribute(buf().getCell(0, 0).attributes, CharacterAttributes.Reverse)).toBe(true);
      expect(hasAttribute(buf().getCell(0, 1).attributes, CharacterAttributes.Reverse)).toBe(false);
    });
  });

  describe('Combined attributes', () => {
    it('Bold + Underline should both be set', () => {
      term.write('\x1b[1;4mBU');
      expect(hasAttribute(buf().getCell(0, 0).attributes, CharacterAttributes.Bold)).toBe(true);
      expect(hasAttribute(buf().getCell(0, 0).attributes, CharacterAttributes.Underline)).toBe(true);
    });

    it('Bold + Reverse should both be set', () => {
      term.write('\x1b[1;7mBR');
      expect(hasAttribute(buf().getCell(0, 0).attributes, CharacterAttributes.Bold)).toBe(true);
      expect(hasAttribute(buf().getCell(0, 0).attributes, CharacterAttributes.Reverse)).toBe(true);
    });

    it('all attributes should be set together', () => {
      term.write('\x1b[1;3;4;5;7mAll');
      const cell = buf().getCell(0, 0);
      expect(hasAttribute(cell.attributes, CharacterAttributes.Bold)).toBe(true);
      expect(hasAttribute(cell.attributes, CharacterAttributes.Italic)).toBe(true);
      expect(hasAttribute(cell.attributes, CharacterAttributes.Underline)).toBe(true);
      expect(hasAttribute(cell.attributes, CharacterAttributes.Blink)).toBe(true);
      expect(hasAttribute(cell.attributes, CharacterAttributes.Reverse)).toBe(true);
    });

    it('attributes should persist across characters', () => {
      term.write('\x1b[1mABC');
      expect(hasAttribute(buf().getCell(0, 0).attributes, CharacterAttributes.Bold)).toBe(true);
      expect(hasAttribute(buf().getCell(0, 1).attributes, CharacterAttributes.Bold)).toBe(true);
      expect(hasAttribute(buf().getCell(0, 2).attributes, CharacterAttributes.Bold)).toBe(true);
    });
  });

  describe('Basic ANSI colors (foreground)', () => {
    it('SGR 30 should set black foreground', () => {
      term.write('\x1b[30mX');
      expect(buf().getCell(0, 0).foreground.isIndexed).toBe(true);
      expect(buf().getCell(0, 0).foreground.index).toBe(0);
    });

    it('SGR 31 should set red foreground', () => {
      term.write('\x1b[31mX');
      expect(buf().getCell(0, 0).foreground.index).toBe(1);
    });

    it('SGR 32 should set green foreground', () => {
      term.write('\x1b[32mX');
      expect(buf().getCell(0, 0).foreground.index).toBe(2);
    });

    it('SGR 33 should set yellow foreground', () => {
      term.write('\x1b[33mX');
      expect(buf().getCell(0, 0).foreground.index).toBe(3);
    });

    it('SGR 34 should set blue foreground', () => {
      term.write('\x1b[34mX');
      expect(buf().getCell(0, 0).foreground.index).toBe(4);
    });

    it('SGR 35 should set magenta foreground', () => {
      term.write('\x1b[35mX');
      expect(buf().getCell(0, 0).foreground.index).toBe(5);
    });

    it('SGR 36 should set cyan foreground', () => {
      term.write('\x1b[36mX');
      expect(buf().getCell(0, 0).foreground.index).toBe(6);
    });

    it('SGR 37 should set white foreground', () => {
      term.write('\x1b[37mX');
      expect(buf().getCell(0, 0).foreground.index).toBe(7);
    });
  });

  describe('Basic ANSI colors (background)', () => {
    it('SGR 40 should set black background', () => {
      term.write('\x1b[40mX');
      expect(buf().getCell(0, 0).background.isIndexed).toBe(true);
      expect(buf().getCell(0, 0).background.index).toBe(0);
    });

    it('SGR 41 should set red background', () => {
      term.write('\x1b[41mX');
      expect(buf().getCell(0, 0).background.index).toBe(1);
    });

    it('SGR 42 should set green background', () => {
      term.write('\x1b[42mX');
      expect(buf().getCell(0, 0).background.index).toBe(2);
    });

    it('SGR 47 should set white background', () => {
      term.write('\x1b[47mX');
      expect(buf().getCell(0, 0).background.index).toBe(7);
    });
  });

  describe('256 colors', () => {
    it('SGR 38;5;N should set 256-color foreground', () => {
      term.write('\x1b[38;5;196mX');
      expect(buf().getCell(0, 0).foreground.isIndexed).toBe(true);
      expect(buf().getCell(0, 0).foreground.index).toBe(196);
    });

    it('SGR 48;5;N should set 256-color background', () => {
      term.write('\x1b[48;5;21mX');
      expect(buf().getCell(0, 0).background.isIndexed).toBe(true);
      expect(buf().getCell(0, 0).background.index).toBe(21);
    });

    it('SGR 38;5;232 should set grayscale foreground', () => {
      term.write('\x1b[38;5;232mX');
      expect(buf().getCell(0, 0).foreground.index).toBe(232);
    });
  });

  describe('RGB/true colors', () => {
    it('SGR 38;2;R;G;B should set RGB foreground', () => {
      term.write('\x1b[38;2;255;128;0mX');
      const fg = buf().getCell(0, 0).foreground;
      expect(fg.isRgb).toBe(true);
      expect(fg.r).toBe(255);
      expect(fg.g).toBe(128);
      expect(fg.b).toBe(0);
    });

    it('SGR 48;2;R;G;B should set RGB background', () => {
      term.write('\x1b[48;2;0;255;0mX');
      const bg = buf().getCell(0, 0).background;
      expect(bg.isRgb).toBe(true);
      expect(bg.r).toBe(0);
      expect(bg.g).toBe(255);
      expect(bg.b).toBe(0);
    });
  });

  describe('Default color reset', () => {
    it('SGR 39 should reset to default foreground', () => {
      term.write('\x1b[31mR\x1b[39mD');
      expect(buf().getCell(0, 0).foreground.isIndexed).toBe(true);
      expect(buf().getCell(0, 1).foreground.isDefault).toBe(true);
    });

    it('SGR 49 should reset to default background', () => {
      term.write('\x1b[41mR\x1b[49mD');
      expect(buf().getCell(0, 0).background.isIndexed).toBe(true);
      expect(buf().getCell(0, 1).background.isDefault).toBe(true);
    });
  });

  describe('Combined color and attribute', () => {
    it('Bold + Red foreground', () => {
      term.write('\x1b[1;31mX');
      const cell = buf().getCell(0, 0);
      expect(hasAttribute(cell.attributes, CharacterAttributes.Bold)).toBe(true);
      expect(cell.foreground.isIndexed).toBe(true);
      expect(cell.foreground.index).toBe(1);
    });

    it('SGR 0 should reset both colors and attributes', () => {
      term.write('\x1b[1;31;42mX\x1b[0mY');
      const y = buf().getCell(0, 1);
      expect(y.attributes).toBe(CharacterAttributes.None);
      expect(y.foreground.isDefault).toBe(true);
      expect(y.background.isDefault).toBe(true);
    });
  });
});
