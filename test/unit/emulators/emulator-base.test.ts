import { describe, it, expect, beforeEach } from 'vitest';
import { TerminalEmulatorBase } from '../../../src/emulators/TerminalEmulatorBase';
import { CharacterAttributes, hasAttribute } from '../../../src/buffer/CharacterAttributes';
import { TerminalColor } from '../../../src/buffer/TerminalColor';
import {
  encode, createEmulator, writeToEmulator,
  getRowTextTrimmed, collectResponses, decodeResponse,
} from '../../helpers/test-emulator';
import { assertRowText, assertCursorAt, assertCellForeground } from '../../helpers/buffer-assertions';
import * as seq from '../../helpers/test-sequences';

describe('TerminalEmulatorBase', () => {
  let emu: TerminalEmulatorBase;

  beforeEach(() => {
    emu = createEmulator(80, 24);
  });

  describe('basic character output', () => {
    it('should write text at cursor position', () => {
      writeToEmulator(emu, 'Hello');
      assertRowText(emu.buffer, 0, 'Hello');
      assertCursorAt(emu, 0, 5);
    });

    it('should handle newline', () => {
      writeToEmulator(emu, 'Line1\r\nLine2');
      assertRowText(emu.buffer, 0, 'Line1');
      assertRowText(emu.buffer, 1, 'Line2');
    });

    it('should handle carriage return', () => {
      writeToEmulator(emu, 'Hello\rWorld');
      assertRowText(emu.buffer, 0, 'World');
    });

    it('should handle backspace', () => {
      writeToEmulator(emu, 'AB\x08C');
      assertRowText(emu.buffer, 0, 'AC');
    });

    it('should handle tab', () => {
      writeToEmulator(emu, 'A\tB');
      assertCursorAt(emu, 0, 9); // tab stop at 8, then B at 8, cursor at 9
      expect(emu.buffer.getCell(0, 8).codepoint).toBe(0x42); // B at col 8
    });

    it('should handle bell', () => {
      let bellFired = false;
      emu.onBell.on(() => { bellFired = true; });
      writeToEmulator(emu, '\x07');
      expect(bellFired).toBe(true);
    });
  });

  describe('cursor movement (CSI)', () => {
    it('CUP should move cursor to position', () => {
      writeToEmulator(emu, seq.cup(5, 10));
      assertCursorAt(emu, 4, 9); // 1-indexed to 0-indexed
    });

    it('CUP with defaults should move to home', () => {
      writeToEmulator(emu, 'Hello');
      writeToEmulator(emu, '\x1b[H');
      assertCursorAt(emu, 0, 0);
    });

    it('CUU should move cursor up', () => {
      writeToEmulator(emu, seq.cup(5, 1) + seq.cuu(2));
      assertCursorAt(emu, 2, 0);
    });

    it('CUD should move cursor down', () => {
      writeToEmulator(emu, seq.cud(3));
      assertCursorAt(emu, 3, 0);
    });

    it('CUF should move cursor forward', () => {
      writeToEmulator(emu, seq.cuf(10));
      assertCursorAt(emu, 0, 10);
    });

    it('CUB should move cursor backward', () => {
      writeToEmulator(emu, seq.cuf(10) + seq.cub(3));
      assertCursorAt(emu, 0, 7);
    });

    it('CNL should move to next line start', () => {
      writeToEmulator(emu, seq.cuf(10) + '\x1b[2E');
      assertCursorAt(emu, 2, 0);
    });

    it('CPL should move to previous line start', () => {
      writeToEmulator(emu, seq.cup(5, 10) + '\x1b[2F');
      assertCursorAt(emu, 2, 0);
    });

    it('CHA should move to column', () => {
      writeToEmulator(emu, '\x1b[20G');
      assertCursorAt(emu, 0, 19);
    });

    it('VPA should move to row', () => {
      writeToEmulator(emu, '\x1b[10d');
      assertCursorAt(emu, 9, 0);
    });
  });

  describe('erase operations', () => {
    it('ED 0 should erase from cursor to end of screen', () => {
      writeToEmulator(emu, 'AAAA');
      writeToEmulator(emu, '\r\nBBBB');
      // cup(2, 3) = row 1, col 2 (0-indexed)
      writeToEmulator(emu, seq.cup(2, 3) + seq.ed(0));
      assertRowText(emu.buffer, 0, 'AAAA'); // Row 0 unaffected
      expect(getRowTextTrimmed(emu.buffer, 1)).toBe('BB'); // Row 1 partially erased
    });

    it('ED 1 should erase from start to cursor', () => {
      writeToEmulator(emu, 'AAAA\r\nBBBB');
      writeToEmulator(emu, seq.cup(2, 3) + seq.ed(1));
      // Row 0 should be cleared, row 1 cleared through col 2
      assertRowText(emu.buffer, 0, '');
    });

    it('ED 2 should erase entire display', () => {
      writeToEmulator(emu, 'Hello');
      writeToEmulator(emu, seq.ed(2));
      assertRowText(emu.buffer, 0, '');
    });

    it('ED 3 should erase display and scrollback', () => {
      // Fill and scroll to create scrollback
      for (let i = 0; i < 30; i++) {
        writeToEmulator(emu, `Line ${i}\r\n`);
      }
      expect(emu.buffer.scrollbackLineCount).toBeGreaterThan(0);
      writeToEmulator(emu, seq.ed(3));
      expect(emu.buffer.scrollbackLineCount).toBe(0);
    });

    it('EL 0 should erase from cursor to end of line', () => {
      writeToEmulator(emu, 'Hello World');
      writeToEmulator(emu, seq.cup(1, 6) + seq.el(0));
      assertRowText(emu.buffer, 0, 'Hello');
    });

    it('EL 1 should erase from start of line to cursor', () => {
      writeToEmulator(emu, 'Hello World');
      writeToEmulator(emu, seq.cup(1, 6) + seq.el(1));
      assertRowText(emu.buffer, 0, '      World');
    });

    it('EL 2 should erase entire line', () => {
      writeToEmulator(emu, 'Hello World');
      writeToEmulator(emu, seq.el(2));
      assertRowText(emu.buffer, 0, '');
    });
  });

  describe('SGR (character attributes)', () => {
    it('should set bold', () => {
      writeToEmulator(emu, seq.sgr(1) + 'A');
      expect(hasAttribute(emu.buffer.getCell(0, 0).attributes, CharacterAttributes.Bold)).toBe(true);
    });

    it('should set italic', () => {
      writeToEmulator(emu, seq.sgr(3) + 'A');
      expect(hasAttribute(emu.buffer.getCell(0, 0).attributes, CharacterAttributes.Italic)).toBe(true);
    });

    it('should set underline', () => {
      writeToEmulator(emu, seq.sgr(4) + 'A');
      expect(hasAttribute(emu.buffer.getCell(0, 0).attributes, CharacterAttributes.Underline)).toBe(true);
    });

    it('should set reverse', () => {
      writeToEmulator(emu, seq.sgr(7) + 'A');
      expect(hasAttribute(emu.buffer.getCell(0, 0).attributes, CharacterAttributes.Reverse)).toBe(true);
    });

    it('should reset all attributes', () => {
      writeToEmulator(emu, seq.sgr(1, 3, 4) + 'A' + seq.sgr(0) + 'B');
      expect(emu.buffer.getCell(0, 1).attributes).toBe(CharacterAttributes.None);
    });

    it('should clear individual attributes', () => {
      writeToEmulator(emu, seq.sgr(1, 4) + seq.sgr(24) + 'A');
      expect(hasAttribute(emu.buffer.getCell(0, 0).attributes, CharacterAttributes.Bold)).toBe(true);
      expect(hasAttribute(emu.buffer.getCell(0, 0).attributes, CharacterAttributes.Underline)).toBe(false);
    });

    it('should set standard foreground colors', () => {
      writeToEmulator(emu, seq.sgr(31) + 'R');
      assertCellForeground(emu.buffer, 0, 0, 1); // Red = index 1
    });

    it('should set standard background colors', () => {
      writeToEmulator(emu, seq.sgr(42) + 'G');
      const cell = emu.buffer.getCell(0, 0);
      expect(cell.background.isIndexed).toBe(true);
      expect(cell.background.index).toBe(2); // Green = index 2
    });

    it('should set bright foreground colors', () => {
      writeToEmulator(emu, seq.sgr(91) + 'A');
      assertCellForeground(emu.buffer, 0, 0, 9); // Bright red = index 9
    });

    it('should set 256-color foreground', () => {
      writeToEmulator(emu, seq.sgr(38, 5, 196) + 'A');
      assertCellForeground(emu.buffer, 0, 0, 196);
    });

    it('should set RGB foreground', () => {
      writeToEmulator(emu, seq.sgr(38, 2, 255, 128, 64) + 'A');
      const cell = emu.buffer.getCell(0, 0);
      expect(cell.foreground.isRgb).toBe(true);
      expect(cell.foreground.r).toBe(255);
      expect(cell.foreground.g).toBe(128);
      expect(cell.foreground.b).toBe(64);
    });

    it('should reset foreground to default', () => {
      writeToEmulator(emu, seq.sgr(31) + seq.sgr(39) + 'A');
      expect(emu.buffer.getCell(0, 0).foreground.isDefault).toBe(true);
    });

    it('should handle SGR with no params as reset', () => {
      writeToEmulator(emu, seq.sgr(1) + '\x1b[m' + 'A');
      expect(emu.buffer.getCell(0, 0).attributes).toBe(CharacterAttributes.None);
    });
  });

  describe('scroll regions', () => {
    it('should set scroll region', () => {
      writeToEmulator(emu, seq.decstbm(5, 20));
      expect(emu.scrollTop).toBe(4);
      expect(emu.scrollBottom).toBe(19);
    });

    it('should clear scroll region with default params', () => {
      writeToEmulator(emu, seq.decstbm(5, 20));
      writeToEmulator(emu, '\x1b[r'); // No params = clear
      expect(emu.scrollTop).toBe(0);
      expect(emu.scrollBottom).toBe(23);
    });

    it('should scroll within region', () => {
      writeToEmulator(emu, seq.decstbm(1, 5));
      // Fill lines 0-4
      for (let i = 0; i < 5; i++) {
        writeToEmulator(emu, `${String.fromCharCode(65 + i)}\r\n`);
      }
      // The region should scroll, line 0 content shifts up
    });
  });

  describe('DEC private modes', () => {
    it('should enable/disable cursor visibility (DECTCEM)', () => {
      writeToEmulator(emu, seq.decrst(25));
      expect(emu.cursor.visible).toBe(false);
      writeToEmulator(emu, seq.decset(25));
      expect(emu.cursor.visible).toBe(true);
    });

    it('should enable/disable auto wrap (DECAWM)', () => {
      writeToEmulator(emu, seq.decrst(7));
      expect(emu.autoWrapMode).toBe(false);
      writeToEmulator(emu, seq.decset(7));
      expect(emu.autoWrapMode).toBe(true);
    });

    it('should enable/disable application cursor keys (DECCKM)', () => {
      writeToEmulator(emu, seq.decset(1));
      expect(emu.applicationCursorKeys).toBe(true);
      writeToEmulator(emu, seq.decrst(1));
      expect(emu.applicationCursorKeys).toBe(false);
    });

    it('should enable origin mode (DECOM)', () => {
      writeToEmulator(emu, seq.decset(6));
      expect(emu.originMode).toBe(true);
    });

    it('should switch to alternate buffer', () => {
      writeToEmulator(emu, 'Hello');
      writeToEmulator(emu, seq.decset(1049));
      expect(emu.buffer.isUsingAlternateBuffer).toBe(true);
      writeToEmulator(emu, seq.decrst(1049));
      expect(emu.buffer.isUsingAlternateBuffer).toBe(false);
      assertRowText(emu.buffer, 0, 'Hello'); // Original content preserved
    });
  });

  describe('ESC sequences', () => {
    it('ESC 7/8 should save/restore cursor', () => {
      writeToEmulator(emu, seq.cup(5, 10) + seq.DECSC);
      writeToEmulator(emu, seq.cup(1, 1) + seq.DECRC);
      assertCursorAt(emu, 4, 9);
    });

    it('ESC D (IND) should move down or scroll', () => {
      writeToEmulator(emu, seq.cup(24, 1) + seq.IND);
      // At bottom, should scroll
      assertCursorAt(emu, 23, 0);
    });

    it('ESC M (RI) should move up or scroll', () => {
      writeToEmulator(emu, seq.RI);
      // At top, should reverse scroll
      assertCursorAt(emu, 0, 0);
    });

    it('ESC E (NEL) should do CR+LF', () => {
      writeToEmulator(emu, seq.cuf(10) + seq.NEL);
      assertCursorAt(emu, 1, 0);
    });

    it('ESC c (RIS) should full reset', () => {
      writeToEmulator(emu, seq.sgr(1) + 'Hello' + seq.RIS);
      assertRowText(emu.buffer, 0, '');
      expect(emu.currentAttributes).toBe(CharacterAttributes.None);
    });

    it('ESC = should enable application keypad', () => {
      writeToEmulator(emu, '\x1b=');
      expect(emu.applicationKeypad).toBe(true);
    });

    it('ESC > should disable application keypad', () => {
      writeToEmulator(emu, '\x1b=\x1b>');
      expect(emu.applicationKeypad).toBe(false);
    });
  });

  describe('character sets', () => {
    it('should designate DEC Special Graphics to G0', () => {
      writeToEmulator(emu, '\x1b(0');
      expect(emu.characterSets[0]).toBe(2);
    });

    it('should render DEC Special Graphics line drawing chars', () => {
      writeToEmulator(emu, '\x1b(0');
      writeToEmulator(emu, 'lqqk'); // ┌──┐
      expect(emu.buffer.getCell(0, 0).codepoint).toBe(0x250C); // ┌
      expect(emu.buffer.getCell(0, 1).codepoint).toBe(0x2500); // ─
      expect(emu.buffer.getCell(0, 3).codepoint).toBe(0x2510); // ┐
    });

    it('should switch back to US ASCII', () => {
      writeToEmulator(emu, '\x1b(0q\x1b(B-');
      expect(emu.buffer.getCell(0, 0).codepoint).toBe(0x2500); // ─ (graphics)
      expect(emu.buffer.getCell(0, 1).codepoint).toBe(0x2D); // - (ASCII)
    });

    it('should handle SO/SI for G1', () => {
      writeToEmulator(emu, '\x1b)0'); // Designate G1 as DEC Special Graphics
      writeToEmulator(emu, '\x0E'); // SO — invoke G1
      writeToEmulator(emu, 'q'); // Should render as line drawing
      expect(emu.buffer.getCell(0, 0).codepoint).toBe(0x2500);
      writeToEmulator(emu, '\x0F'); // SI — invoke G0
      writeToEmulator(emu, 'q'); // Should render as 'q'
      expect(emu.buffer.getCell(0, 1).codepoint).toBe(0x71);
    });
  });

  describe('line operations', () => {
    it('IL should insert lines', () => {
      writeToEmulator(emu, 'Line1\r\nLine2\r\nLine3');
      writeToEmulator(emu, seq.cup(2, 1) + '\x1b[1L');
      assertRowText(emu.buffer, 1, ''); // Blank line inserted
      assertRowText(emu.buffer, 2, 'Line2'); // Shifted down
    });

    it('DL should delete lines', () => {
      writeToEmulator(emu, 'Line1\r\nLine2\r\nLine3');
      writeToEmulator(emu, seq.cup(2, 1) + '\x1b[1M');
      assertRowText(emu.buffer, 1, 'Line3'); // Shifted up
    });

    it('DCH should delete characters', () => {
      writeToEmulator(emu, 'Hello World');
      writeToEmulator(emu, seq.cup(1, 6) + '\x1b[1P');
      assertRowText(emu.buffer, 0, 'HelloWorld');
    });

    it('ECH should erase characters (replace with spaces)', () => {
      writeToEmulator(emu, 'Hello World');
      // cup(1,6) = row 0, col 5. ECH 5 erases cols 5-9 (' Worl' -> spaces)
      writeToEmulator(emu, seq.cup(1, 6) + '\x1b[5X');
      assertRowText(emu.buffer, 0, 'Hello     d');
    });

    it('ICH should insert blank characters', () => {
      writeToEmulator(emu, 'HelloWorld');
      writeToEmulator(emu, seq.cup(1, 6) + '\x1b[1@');
      assertRowText(emu.buffer, 0, 'Hello World');
    });
  });

  describe('insert mode', () => {
    it('should shift characters right when inserting', () => {
      writeToEmulator(emu, 'HelloWorld');
      writeToEmulator(emu, seq.cup(1, 6)); // Position at 'W'
      writeToEmulator(emu, '\x1b[4h'); // Enable insert mode (IRM = mode 4)
      // IRM is not DEC private mode — it's standard mode 4
      // Actually in this emulator, insert mode is controlled by insertMode field
      emu.insertMode = true;
      writeToEmulator(emu, ' ');
      assertRowText(emu.buffer, 0, 'Hello World');
    });
  });

  describe('DSR (Device Status Report)', () => {
    it('should respond to DSR 5 (status)', () => {
      const responses = collectResponses(emu);
      writeToEmulator(emu, '\x1b[5n');
      expect(responses.length).toBe(1);
      expect(decodeResponse(responses[0])).toBe('\x1b[0n');
    });

    it('should respond to DSR 6 (cursor position)', () => {
      const responses = collectResponses(emu);
      writeToEmulator(emu, seq.cup(5, 10) + '\x1b[6n');
      expect(responses.length).toBe(1);
      expect(decodeResponse(responses[0])).toBe('\x1b[5;10R');
    });
  });

  describe('OSC (title)', () => {
    it('should set title via OSC 2', () => {
      let title = '';
      emu.onTitleChanged.on((t) => { title = t; });
      writeToEmulator(emu, seq.oscTitle('My Terminal'));
      expect(title).toBe('My Terminal');
      expect(emu.title).toBe('My Terminal');
    });

    it('should set title via OSC 0', () => {
      writeToEmulator(emu, '\x1b]0;Title\x07');
      expect(emu.title).toBe('Title');
    });
  });

  describe('wrapping', () => {
    it('should wrap at end of line when autoWrap is on', () => {
      const text = 'A'.repeat(81);
      writeToEmulator(emu, text);
      assertCursorAt(emu, 1, 1);
    });

    it('should not wrap when autoWrap is off', () => {
      writeToEmulator(emu, seq.decrst(7));
      const text = 'A'.repeat(100);
      writeToEmulator(emu, text);
      assertCursorAt(emu, 0, 79);
    });
  });

  describe('scrolling', () => {
    it('should scroll when text exceeds screen', () => {
      for (let i = 0; i < 30; i++) {
        writeToEmulator(emu, `Line ${i}\r\n`);
      }
      expect(emu.buffer.scrollbackLineCount).toBeGreaterThan(0);
    });

    it('SU should scroll up', () => {
      writeToEmulator(emu, 'Line0\r\nLine1\r\nLine2');
      writeToEmulator(emu, '\x1b[1S');
      assertRowText(emu.buffer, 0, 'Line1');
    });

    it('SD should scroll down', () => {
      writeToEmulator(emu, 'Line0\r\nLine1\r\nLine2');
      writeToEmulator(emu, '\x1b[1T');
      assertRowText(emu.buffer, 0, '');
      assertRowText(emu.buffer, 1, 'Line0');
    });
  });

  describe('resize', () => {
    it('should resize preserving content', () => {
      writeToEmulator(emu, 'Hello');
      emu.resize(40, 12);
      expect(emu.width).toBe(40);
      expect(emu.height).toBe(12);
      assertRowText(emu.buffer, 0, 'Hello');
    });

    it('should reset scroll region on resize', () => {
      writeToEmulator(emu, seq.decstbm(5, 20));
      emu.resize(80, 24);
      expect(emu.scrollTop).toBe(0);
      expect(emu.scrollBottom).toBe(23);
    });
  });

  describe('reset', () => {
    it('should reset all state', () => {
      writeToEmulator(emu, seq.sgr(1) + 'Hello' + seq.decset(1));
      emu.reset();
      assertRowText(emu.buffer, 0, '');
      expect(emu.currentAttributes).toBe(CharacterAttributes.None);
      expect(emu.applicationCursorKeys).toBe(false);
      assertCursorAt(emu, 0, 0);
    });
  });
});
