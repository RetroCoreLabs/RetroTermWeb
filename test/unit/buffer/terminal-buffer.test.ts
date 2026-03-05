import { describe, it, expect, beforeEach } from 'vitest';
import { TerminalBuffer } from '../../../src/buffer/TerminalBuffer';
import { TerminalCell } from '../../../src/buffer/TerminalCell';

describe('TerminalBuffer', () => {
  let buffer: TerminalBuffer;

  beforeEach(() => {
    buffer = new TerminalBuffer(80, 24);
  });

  describe('constructor', () => {
    it('should create buffer with correct dimensions', () => {
      expect(buffer.width).toBe(80);
      expect(buffer.height).toBe(24);
    });

    it('should throw for invalid dimensions', () => {
      expect(() => new TerminalBuffer(0, 24)).toThrow();
      expect(() => new TerminalBuffer(80, 0)).toThrow();
      expect(() => new TerminalBuffer(80, 24, -1)).toThrow();
    });

    it('should initialize cells to spaces (codepoint 0x20)', () => {
      const cell = buffer.getCell(0, 0);
      expect(cell.codepoint).toBe(0x20);
    });

    it('should default to 10000 scrollback lines', () => {
      expect(buffer.maxScrollbackLines).toBe(10000);
    });
  });

  describe('getCell / setCell', () => {
    it('should return empty cell for out-of-range', () => {
      const cell = buffer.getCell(-1, 0);
      expect(cell.codepoint).toBe(0);
    });

    it('should set and get cell', () => {
      const cell = new TerminalCell(0x41); // 'A'
      buffer.setCell(0, 0, cell);
      expect(buffer.getCell(0, 0).codepoint).toBe(0x41);
    });

    it('should silently ignore setCell out of range', () => {
      const cell = new TerminalCell(0x41);
      buffer.setCell(-1, 0, cell); // Should not throw
      buffer.setCell(0, 100, cell); // Should not throw
    });
  });

  describe('getCellRef', () => {
    it('should return mutable reference', () => {
      const ref = buffer.getCellRef(0, 0);
      ref.codepoint = 0x42;
      expect(buffer.getCell(0, 0).codepoint).toBe(0x42);
    });

    it('should throw for out of range', () => {
      expect(() => buffer.getCellRef(-1, 0)).toThrow();
    });
  });

  describe('clear', () => {
    it('should clear all cells to spaces', () => {
      buffer.getCellRef(0, 0).codepoint = 0x41;
      buffer.clear();
      expect(buffer.getCell(0, 0).codepoint).toBe(0x20);
    });
  });

  describe('clearLine', () => {
    it('should clear a single line', () => {
      buffer.getCellRef(0, 0).codepoint = 0x41;
      buffer.getCellRef(0, 1).codepoint = 0x42;
      buffer.clearLine(0);
      expect(buffer.getCell(0, 0).codepoint).toBe(0x20);
      expect(buffer.getCell(0, 1).codepoint).toBe(0x20);
    });

    it('should throw for invalid row', () => {
      expect(() => buffer.clearLine(-1)).toThrow();
      expect(() => buffer.clearLine(24)).toThrow();
    });
  });

  describe('clearToEndOfLine', () => {
    it('should clear from start col to end', () => {
      for (let c = 0; c < 10; c++) {
        buffer.getCellRef(0, c).codepoint = 0x41 + c;
      }
      buffer.clearToEndOfLine(0, 5);
      expect(buffer.getCell(0, 4).codepoint).toBe(0x45); // Unchanged
      expect(buffer.getCell(0, 5).codepoint).toBe(0x20); // Cleared
      expect(buffer.getCell(0, 9).codepoint).toBe(0x20); // Cleared
    });
  });

  describe('clearFromStartOfLine', () => {
    it('should clear from start to end col (inclusive)', () => {
      for (let c = 0; c < 10; c++) {
        buffer.getCellRef(0, c).codepoint = 0x41 + c;
      }
      buffer.clearFromStartOfLine(0, 5);
      expect(buffer.getCell(0, 5).codepoint).toBe(0x20); // Cleared
      expect(buffer.getCell(0, 0).codepoint).toBe(0x20); // Cleared
      expect(buffer.getCell(0, 6).codepoint).toBe(0x47); // Unchanged
    });
  });

  describe('scrollUp', () => {
    it('should scroll entire buffer up by one line', () => {
      buffer.getCellRef(0, 0).codepoint = 0x41; // A on row 0
      buffer.getCellRef(1, 0).codepoint = 0x42; // B on row 1
      buffer.scrollUp();
      expect(buffer.getCell(0, 0).codepoint).toBe(0x42); // B moved to row 0
      expect(buffer.getCell(23, 0).codepoint).toBe(0x20); // Bottom cleared
    });

    it('should save top line to scrollback', () => {
      buffer.getCellRef(0, 0).codepoint = 0x41;
      buffer.scrollUp();
      expect(buffer.scrollbackLineCount).toBe(1);
      const line = buffer.getScrollbackLine(0);
      expect(line).not.toBeNull();
      expect(line![0].codepoint).toBe(0x41);
    });
  });

  describe('scrollUpRegion', () => {
    it('should scroll a region without affecting lines outside', () => {
      buffer.getCellRef(5, 0).codepoint = 0x41;
      buffer.getCellRef(6, 0).codepoint = 0x42;
      buffer.getCellRef(4, 0).codepoint = 0x43; // Outside region
      buffer.scrollUpRegion(5, 10);
      expect(buffer.getCell(5, 0).codepoint).toBe(0x42); // Row 6 moved to 5
      expect(buffer.getCell(4, 0).codepoint).toBe(0x43); // Outside unchanged
    });

    it('should not save to scrollback when topRow > 0', () => {
      buffer.scrollUpRegion(5, 10);
      expect(buffer.scrollbackLineCount).toBe(0);
    });
  });

  describe('scrollDownRegion', () => {
    it('should scroll a region down by one line', () => {
      buffer.getCellRef(5, 0).codepoint = 0x41;
      buffer.getCellRef(6, 0).codepoint = 0x42;
      buffer.scrollDownRegion(5, 10);
      expect(buffer.getCell(5, 0).codepoint).toBe(0x20); // Top cleared
      expect(buffer.getCell(6, 0).codepoint).toBe(0x41); // Shifted down
    });
  });

  describe('insertLines / deleteLines', () => {
    it('should insert lines by scrolling down', () => {
      buffer.getCellRef(5, 0).codepoint = 0x41;
      buffer.insertLines(5, 1);
      expect(buffer.getCell(5, 0).codepoint).toBe(0x20); // Blank inserted
      expect(buffer.getCell(6, 0).codepoint).toBe(0x41); // Shifted down
    });

    it('should delete lines by scrolling up', () => {
      buffer.getCellRef(5, 0).codepoint = 0x41;
      buffer.getCellRef(6, 0).codepoint = 0x42;
      buffer.deleteLines(5, 1);
      expect(buffer.getCell(5, 0).codepoint).toBe(0x42); // Shifted up
    });
  });

  describe('resize', () => {
    it('should resize preserving existing content', () => {
      buffer.getCellRef(0, 0).codepoint = 0x41;
      buffer.resize(40, 12);
      expect(buffer.width).toBe(40);
      expect(buffer.height).toBe(12);
      expect(buffer.getCell(0, 0).codepoint).toBe(0x41);
    });

    it('should no-op for same dimensions', () => {
      buffer.getCellRef(0, 0).codepoint = 0x41;
      buffer.resize(80, 24);
      expect(buffer.getCell(0, 0).codepoint).toBe(0x41);
    });
  });

  describe('alternate buffer', () => {
    it('should switch to alternate buffer', () => {
      buffer.getCellRef(0, 0).codepoint = 0x41;
      buffer.switchToAlternateBuffer();
      expect(buffer.isUsingAlternateBuffer).toBe(true);
      expect(buffer.getCell(0, 0).codepoint).toBe(0); // Alternate is cleared to 0
    });

    it('should switch back to primary preserving content', () => {
      buffer.getCellRef(0, 0).codepoint = 0x41;
      buffer.switchToAlternateBuffer();
      buffer.switchToPrimaryBuffer();
      expect(buffer.isUsingAlternateBuffer).toBe(false);
      expect(buffer.getCell(0, 0).codepoint).toBe(0x41);
    });

    it('should no-op when already in alternate', () => {
      buffer.switchToAlternateBuffer();
      buffer.switchToAlternateBuffer(); // Should not throw
      expect(buffer.isUsingAlternateBuffer).toBe(true);
    });
  });

  describe('scrollback', () => {
    it('should limit scrollback to maxScrollbackLines', () => {
      const smallBuffer = new TerminalBuffer(80, 24, 5);
      for (let i = 0; i < 10; i++) {
        smallBuffer.getCellRef(0, 0).codepoint = 0x41 + i;
        smallBuffer.scrollUp();
      }
      expect(smallBuffer.scrollbackLineCount).toBe(5);
    });

    it('should clear scrollback', () => {
      buffer.scrollUp();
      expect(buffer.scrollbackLineCount).toBe(1);
      buffer.clearScrollback();
      expect(buffer.scrollbackLineCount).toBe(0);
    });
  });

  describe('getLineText', () => {
    it('should return text content of a row', () => {
      const text = 'Hello';
      for (let i = 0; i < text.length; i++) {
        buffer.getCellRef(0, i).codepoint = text.charCodeAt(i);
      }
      const result = buffer.getLineText(0);
      expect(result.substring(0, 5)).toBe('Hello');
    });
  });

  describe('getViewportCell', () => {
    it('should return screen cell with zero offset', () => {
      buffer.getCellRef(0, 0).codepoint = 0x41;
      const cell = buffer.getViewportCell(0, 0, 0);
      expect(cell).not.toBeNull();
      expect(cell!.codepoint).toBe(0x41);
    });

    it('should return scrollback cells with non-zero offset', () => {
      buffer.getCellRef(0, 0).codepoint = 0x41; // A on screen
      buffer.scrollUp(); // A goes to scrollback
      const cell = buffer.getViewportCell(0, 0, 1);
      expect(cell).not.toBeNull();
      expect(cell!.codepoint).toBe(0x41);
    });
  });
});
