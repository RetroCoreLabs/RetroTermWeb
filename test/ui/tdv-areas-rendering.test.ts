/**
 * UI tests for TDV protected areas, work areas, and extended rectangle operations.
 * Tests through the Terminal pipeline where escape sequences exist,
 * and via direct API calls for features without escape sequence handlers.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Terminal } from '../../src/terminal/Terminal';
import { CharacterAttributes, hasAttribute } from '../../src/buffer/CharacterAttributes';

describe('TDV Areas & Rectangle Operations Rendering', () => {
  let container: HTMLElement;
  let term: Terminal;

  beforeEach(() => {
    container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '400px';
    document.body.appendChild(container);
  });

  afterEach(() => {
    term.dispose();
    document.body.innerHTML = '';
  });

  function emu(): any { return term.getEmulator(); }
  function buf() { return emu().buffer; }
  function rowText(row: number): string {
    let text = '';
    for (let col = 0; col < 80; col++) text += buf().getCell(row, col).getString();
    return text.trimEnd();
  }

  describe('Protected Areas (API)', () => {
    it('setProtectedArea should mark cell as protected', () => {
      term = new Terminal({ rows: 24, cols: 80, emulatorType: 'tdv2200' });
      term.open(container);
      emu().protectedAreas.setProtectedArea(0, 5);
      expect(emu().protectedAreas.isProtected(0, 5)).toBe(true);
    });

    it('clearProtectedArea should unmark cell', () => {
      term = new Terminal({ rows: 24, cols: 80, emulatorType: 'tdv2200' });
      term.open(container);
      emu().protectedAreas.setProtectedArea(0, 5);
      emu().protectedAreas.clearProtectedArea(0, 5);
      expect(emu().protectedAreas.isProtected(0, 5)).toBe(false);
    });

    it('setProtectedRectangle should protect all cells in range', () => {
      term = new Terminal({ rows: 24, cols: 80, emulatorType: 'tdv2200' });
      term.open(container);
      emu().protectedAreas.setProtectedRectangle(2, 5, 4, 10);
      // Corners should be protected
      expect(emu().protectedAreas.isProtected(2, 5)).toBe(true);
      expect(emu().protectedAreas.isProtected(4, 10)).toBe(true);
      // Interior should be protected
      expect(emu().protectedAreas.isProtected(3, 7)).toBe(true);
      // Outside should not be protected
      expect(emu().protectedAreas.isProtected(1, 5)).toBe(false);
      expect(emu().protectedAreas.isProtected(5, 5)).toBe(false);
    });

    it('clearProtectedRectangle should unprotect range', () => {
      term = new Terminal({ rows: 24, cols: 80, emulatorType: 'tdv2200' });
      term.open(container);
      emu().protectedAreas.setProtectedRectangle(2, 5, 4, 10);
      emu().protectedAreas.clearProtectedRectangle(2, 5, 4, 10);
      expect(emu().protectedAreas.isProtected(3, 7)).toBe(false);
    });

    it('clear should unprotect entire screen', () => {
      term = new Terminal({ rows: 24, cols: 80, emulatorType: 'tdv2200' });
      term.open(container);
      emu().protectedAreas.setProtectedRectangle(0, 0, 23, 79);
      emu().protectedAreas.clear();
      expect(emu().protectedAreas.isProtected(0, 0)).toBe(false);
      expect(emu().protectedAreas.isProtected(23, 79)).toBe(false);
    });
  });

  describe('Work Areas (NDDWA via ESC sequences)', () => {
    it('NDDWA should define work area', () => {
      term = new Terminal({ rows: 24, cols: 80, emulatorType: 'tdv2200' });
      term.open(container);
      // ESC [ x1;y1;x2;y2 ~ defines work area
      term.write('\x1b[5;3;70;20~');
      expect(emu().workAreas.hasWorkArea).toBe(true);
      const wa = emu().workAreas.getCurrentWorkArea();
      expect(wa.left).toBe(5);
      expect(wa.top).toBe(3);
      expect(wa.right).toBe(70);
      expect(wa.bottom).toBe(20);
    });

    it('NDDWA with no params should clear work area', () => {
      term = new Terminal({ rows: 24, cols: 80, emulatorType: 'tdv2200' });
      term.open(container);
      term.write('\x1b[5;3;70;20~');
      term.write('\x1b[~');
      expect(emu().workAreas.hasWorkArea).toBe(false);
    });

    it('isInWorkArea should check coordinates', () => {
      term = new Terminal({ rows: 24, cols: 80, emulatorType: 'tdv2200' });
      term.open(container);
      term.write('\x1b[5;3;70;20~');
      // Interior point (work area uses exclusive boundaries)
      expect(emu().workAreas.isInWorkArea(10, 30)).toBe(true);
    });

    it('without work area, entire screen should be in work area', () => {
      term = new Terminal({ rows: 24, cols: 80, emulatorType: 'tdv2200' });
      term.open(container);
      expect(emu().workAreas.isInWorkArea(0, 0)).toBe(true);
      expect(emu().workAreas.isInWorkArea(23, 79)).toBe(true);
    });
  });

  describe('Rectangle remove attribute (NDRAR)', () => {
    it('NDRAR should remove attribute from rectangle', () => {
      term = new Terminal({ rows: 24, cols: 80, emulatorType: 'tdv2200' });
      term.open(container);
      term.write('\x1b[1;1HABCDEFGHIJ');
      // Set bold on cols 2-6, row 0
      term.write('\x1b[1;2;0;6;0z');
      expect(hasAttribute(buf().getCell(0, 3).attributes, CharacterAttributes.Bold)).toBe(true);
      // Remove bold from same rectangle: ESC [ attr;x1;y1;x2;y2 }
      term.write('\x1b[1;2;0;6;0}');
      expect(hasAttribute(buf().getCell(0, 3).attributes, CharacterAttributes.Bold)).toBe(false);
    });
  });

  describe('Rectangle fill character (NDFC)', () => {
    it('NDFC should fill rectangle with character', () => {
      term = new Terminal({ rows: 24, cols: 80, emulatorType: 'tdv2200' });
      term.open(container);
      // Fill rectangle (cols 0-4, rows 0-2) with 'X' (0x58)
      // ESC [ char;x1;y1;x2;y2 |
      term.write('\x1b[88;0;0;4;2|');
      expect(buf().getCell(0, 0).codepoint).toBe(0x58); // X
      expect(buf().getCell(0, 4).codepoint).toBe(0x58);
      expect(buf().getCell(2, 0).codepoint).toBe(0x58);
      expect(buf().getCell(2, 4).codepoint).toBe(0x58);
    });

    it('NDFC should not affect cells outside rectangle', () => {
      term = new Terminal({ rows: 24, cols: 80, emulatorType: 'tdv2200' });
      term.open(container);
      term.write('\x1b[1;1HABCDE');
      term.write('\x1b[88;1;1;3;1|'); // Fill cols 1-3, row 1 with X
      // Row 0 should be unaffected
      expect(buf().getCell(0, 0).codepoint).toBe(0x41); // A
    });
  });

  describe('Rectangle save/restore (NDSREC/NDRREC)', () => {
    it('should save and restore rectangle content', () => {
      term = new Terminal({ rows: 24, cols: 80, emulatorType: 'tdv2200' });
      term.open(container);
      // Write text
      term.write('\x1b[1;1HABCDE');
      // Save rectangle: cols 0-4, row 0: ESC [ x1;y1;x2;y2 u
      term.write('\x1b[0;0;4;0u');
      // Clear the area
      term.write('\x1b[1;1H\x1b[2K');
      expect(rowText(0)).toBe('');
      // Restore at position (0,2): ESC [ x;y v
      term.write('\x1b[0;2v');
      // Content should be restored at row 2
      expect(buf().getCell(2, 0).codepoint).toBe(0x41); // A
    });
  });

  describe('Push Keys (API)', () => {
    it('programKey should program a push key', () => {
      term = new Terminal({ rows: 24, cols: 80, emulatorType: 'tdv2200' });
      term.open(container);
      emu().pushKeys.programKey(1, 'Hello');
      expect(emu().pushKeys.isKeyProgrammed(1)).toBe(true);
      expect(emu().pushKeys.getKeySequence(1)).toBe('Hello');
    });

    it('clearKey should remove programming', () => {
      term = new Terminal({ rows: 24, cols: 80, emulatorType: 'tdv2200' });
      term.open(container);
      emu().pushKeys.programKey(1, 'Hello');
      emu().pushKeys.clearKey(1);
      expect(emu().pushKeys.isKeyProgrammed(1)).toBe(false);
    });

    it('clear should remove all programming', () => {
      term = new Terminal({ rows: 24, cols: 80, emulatorType: 'tdv2200' });
      term.open(container);
      emu().pushKeys.programKey(1, 'A');
      emu().pushKeys.programKey(2, 'B');
      emu().pushKeys.clear();
      expect(emu().pushKeys.programmedKeyCount).toBe(0);
    });

    it('executePushKey should process programmed sequence', () => {
      term = new Terminal({ rows: 24, cols: 80, emulatorType: 'tdv2200' });
      term.open(container);
      emu().programPushKey(1, 'Test');
      emu().executePushKey(1);
      expect(rowText(0)).toBe('Test');
    });
  });
});
