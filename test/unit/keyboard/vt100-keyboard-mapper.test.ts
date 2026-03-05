/**
 * Tests for VT100KeyboardMapper.
 */
import { describe, it, expect } from 'vitest';
import { VT100KeyboardMapper, KeyModifiers, TerminalModes, domKeyToVK, domModifiersToFlags } from '../../../src/keyboard/KeyboardMapper';

describe('VT100KeyboardMapper', () => {
  function createMapper(): VT100KeyboardMapper {
    return new VT100KeyboardMapper();
  }

  describe('Basic keys', () => {
    it('should map Enter to CR', () => {
      expect(createMapper().mapKey(13, KeyModifiers.None, TerminalModes.None)).toBe('\r');
    });

    it('should map Backspace to BS', () => {
      expect(createMapper().mapKey(8, KeyModifiers.None, TerminalModes.None)).toBe('\x08');
    });

    it('should map Tab to HT', () => {
      expect(createMapper().mapKey(9, KeyModifiers.None, TerminalModes.None)).toBe('\t');
    });

    it('should map Escape to ESC', () => {
      expect(createMapper().mapKey(27, KeyModifiers.None, TerminalModes.None)).toBe('\x1b');
    });
  });

  describe('Arrow keys', () => {
    it('should map arrows to CSI sequences in normal mode', () => {
      const m = createMapper();
      expect(m.mapKey(38, KeyModifiers.None, TerminalModes.None)).toBe('\x1b[A');
      expect(m.mapKey(40, KeyModifiers.None, TerminalModes.None)).toBe('\x1b[B');
      expect(m.mapKey(39, KeyModifiers.None, TerminalModes.None)).toBe('\x1b[C');
      expect(m.mapKey(37, KeyModifiers.None, TerminalModes.None)).toBe('\x1b[D');
    });

    it('should map arrows to SS3 sequences in application cursor keys mode', () => {
      const m = createMapper();
      expect(m.mapKey(38, KeyModifiers.None, TerminalModes.ApplicationCursorKeys)).toBe('\x1bOA');
      expect(m.mapKey(40, KeyModifiers.None, TerminalModes.ApplicationCursorKeys)).toBe('\x1bOB');
      expect(m.mapKey(39, KeyModifiers.None, TerminalModes.ApplicationCursorKeys)).toBe('\x1bOC');
      expect(m.mapKey(37, KeyModifiers.None, TerminalModes.ApplicationCursorKeys)).toBe('\x1bOD');
    });
  });

  describe('Function keys', () => {
    it('should map F1-F4 to VT100 style', () => {
      const m = createMapper();
      expect(m.mapKey(112, KeyModifiers.None, TerminalModes.None)).toBe('\x1bOP');
      expect(m.mapKey(113, KeyModifiers.None, TerminalModes.None)).toBe('\x1bOQ');
      expect(m.mapKey(114, KeyModifiers.None, TerminalModes.None)).toBe('\x1bOR');
      expect(m.mapKey(115, KeyModifiers.None, TerminalModes.None)).toBe('\x1bOS');
    });

    it('should map F5-F12 to xterm style', () => {
      const m = createMapper();
      expect(m.mapKey(116, KeyModifiers.None, TerminalModes.None)).toBe('\x1b[15~');
      expect(m.mapKey(117, KeyModifiers.None, TerminalModes.None)).toBe('\x1b[17~');
      expect(m.mapKey(118, KeyModifiers.None, TerminalModes.None)).toBe('\x1b[18~');
      expect(m.mapKey(119, KeyModifiers.None, TerminalModes.None)).toBe('\x1b[19~');
      expect(m.mapKey(120, KeyModifiers.None, TerminalModes.None)).toBe('\x1b[20~');
      expect(m.mapKey(121, KeyModifiers.None, TerminalModes.None)).toBe('\x1b[21~');
      expect(m.mapKey(122, KeyModifiers.None, TerminalModes.None)).toBe('\x1b[23~');
      expect(m.mapKey(123, KeyModifiers.None, TerminalModes.None)).toBe('\x1b[24~');
    });
  });

  describe('Navigation keys', () => {
    it('should map Home, End, PageUp, PageDown, Insert, Delete', () => {
      const m = createMapper();
      expect(m.mapKey(36, KeyModifiers.None, TerminalModes.None)).toBe('\x1b[H');
      expect(m.mapKey(35, KeyModifiers.None, TerminalModes.None)).toBe('\x1b[F');
      expect(m.mapKey(33, KeyModifiers.None, TerminalModes.None)).toBe('\x1b[5~');
      expect(m.mapKey(34, KeyModifiers.None, TerminalModes.None)).toBe('\x1b[6~');
      expect(m.mapKey(45, KeyModifiers.None, TerminalModes.None)).toBe('\x1b[2~');
      expect(m.mapKey(46, KeyModifiers.None, TerminalModes.None)).toBe('\x1b[3~');
    });
  });

  describe('Modifier combinations', () => {
    it('should add xterm modifier param for Shift+Arrow', () => {
      const m = createMapper();
      expect(m.mapKey(38, KeyModifiers.Shift, TerminalModes.None)).toBe('\x1b[1;2A'); // Shift+Up
    });

    it('should add xterm modifier param for Ctrl+Arrow', () => {
      const m = createMapper();
      expect(m.mapKey(39, KeyModifiers.Ctrl, TerminalModes.None)).toBe('\x1b[1;5C'); // Ctrl+Right
    });

    it('should add xterm modifier param for Shift+Delete', () => {
      const m = createMapper();
      expect(m.mapKey(46, KeyModifiers.Shift, TerminalModes.None)).toBe('\x1b[3;2~');
    });

    it('should add xterm modifier param for Ctrl+PageUp', () => {
      const m = createMapper();
      expect(m.mapKey(33, KeyModifiers.Ctrl, TerminalModes.None)).toBe('\x1b[5;5~');
    });
  });

  describe('Unmapped keys', () => {
    it('should return null for unmapped key codes', () => {
      const m = createMapper();
      expect(m.mapKey(999, KeyModifiers.None, TerminalModes.None)).toBeNull();
    });
  });
});

describe('domKeyToVK', () => {
  it('should map DOM key strings to VK codes', () => {
    expect(domKeyToVK('ArrowUp')).toBe(38);
    expect(domKeyToVK('ArrowDown')).toBe(40);
    expect(domKeyToVK('ArrowLeft')).toBe(37);
    expect(domKeyToVK('ArrowRight')).toBe(39);
    expect(domKeyToVK('Enter')).toBe(13);
    expect(domKeyToVK('Backspace')).toBe(8);
    expect(domKeyToVK('Tab')).toBe(9);
    expect(domKeyToVK('Escape')).toBe(27);
    expect(domKeyToVK('F1')).toBe(112);
    expect(domKeyToVK('F12')).toBe(123);
    expect(domKeyToVK('Home')).toBe(36);
    expect(domKeyToVK('End')).toBe(35);
    expect(domKeyToVK('PageUp')).toBe(33);
    expect(domKeyToVK('PageDown')).toBe(34);
    expect(domKeyToVK('Insert')).toBe(45);
    expect(domKeyToVK('Delete')).toBe(46);
  });

  it('should return 0 for text-producing keys', () => {
    expect(domKeyToVK('a')).toBe(0);
    expect(domKeyToVK('1')).toBe(0);
    expect(domKeyToVK(' ')).toBe(0);
  });
});

describe('domModifiersToFlags', () => {
  it('should convert modifier state to flags', () => {
    expect(domModifiersToFlags({ shiftKey: false, ctrlKey: false, altKey: false, metaKey: false })).toBe(KeyModifiers.None);
    expect(domModifiersToFlags({ shiftKey: true, ctrlKey: false, altKey: false, metaKey: false })).toBe(KeyModifiers.Shift);
    expect(domModifiersToFlags({ shiftKey: false, ctrlKey: true, altKey: false, metaKey: false })).toBe(KeyModifiers.Ctrl);
    expect(domModifiersToFlags({ shiftKey: false, ctrlKey: false, altKey: true, metaKey: false })).toBe(KeyModifiers.Alt);
    expect(domModifiersToFlags({ shiftKey: true, ctrlKey: true, altKey: false, metaKey: false })).toBe(KeyModifiers.Shift | KeyModifiers.Ctrl);
  });
});
