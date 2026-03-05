import { describe, it, expect } from 'vitest';
import { TDVRectangleOperations } from '../../../src/emulators/tdv/components/TDVRectangleOperations';
import { TerminalBuffer } from '../../../src/buffer/TerminalBuffer';
import { CharacterAttributes, hasAttribute } from '../../../src/buffer/CharacterAttributes';

describe('TDVRectangleOperations', () => {
  function createBufferWithText(width: number, height: number): TerminalBuffer {
    const buf = new TerminalBuffer(width, height);
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const cell = buf.getCellRef(row, col);
        cell.codepoint = 0x41 + (row % 26); // A, B, C, ...
      }
    }
    return buf;
  }

  it('should set attribute in rectangle', () => {
    const ops = new TDVRectangleOperations();
    const buf = createBufferWithText(80, 24);
    // setAttributeInRectangle(buf, attr, x1, y1, x2, y2) where x=col, y=row
    // Bold in cols 3-10, rows 2-5
    ops.setAttributeInRectangle(buf, 1, 3, 2, 10, 5);
    for (let row = 2; row <= 5; row++) {
      for (let col = 3; col <= 10; col++) {
        expect(hasAttribute(buf.getCellRef(row, col).attributes, CharacterAttributes.Bold)).toBe(true);
      }
    }
    // Outside rectangle
    expect(hasAttribute(buf.getCellRef(1, 5).attributes, CharacterAttributes.Bold)).toBe(false);
    expect(hasAttribute(buf.getCellRef(2, 2).attributes, CharacterAttributes.Bold)).toBe(false);
  });

  it('should add attribute in rectangle', () => {
    const ops = new TDVRectangleOperations();
    const buf = createBufferWithText(80, 24);
    // Set bold, then add underline
    ops.setAttributeInRectangle(buf, 1, 0, 0, 5, 0); // Bold in cols 0-5, row 0
    ops.addAttributeInRectangle(buf, 4, 0, 0, 5, 0);  // Underline in same area
    const cell = buf.getCellRef(0, 0);
    expect(hasAttribute(cell.attributes, CharacterAttributes.Bold)).toBe(true);
    expect(hasAttribute(cell.attributes, CharacterAttributes.Underline)).toBe(true);
  });

  it('should remove attribute in rectangle', () => {
    const ops = new TDVRectangleOperations();
    const buf = createBufferWithText(80, 24);
    ops.setAttributeInRectangle(buf, 1, 0, 0, 5, 0); // Bold
    ops.removeAttributeInRectangle(buf, 1, 0, 0, 5, 0); // Remove bold
    expect(hasAttribute(buf.getCellRef(0, 0).attributes, CharacterAttributes.Bold)).toBe(false);
  });

  it('should fill character in rectangle', () => {
    const ops = new TDVRectangleOperations();
    const buf = createBufferWithText(80, 24);
    // fillCharacterInRectangle(buf, char, x1, y1, x2, y2) where x=col, y=row
    ops.fillCharacterInRectangle(buf, 0x2A, 2, 1, 5, 3); // Fill '*' in cols 2-5, rows 1-3
    for (let row = 1; row <= 3; row++) {
      for (let col = 2; col <= 5; col++) {
        expect(buf.getCellRef(row, col).codepoint).toBe(0x2A);
      }
    }
  });

  it('should save and restore rectangle', () => {
    const ops = new TDVRectangleOperations();
    const buf = createBufferWithText(80, 24);
    // Save cols 0-5, rows 0-2
    ops.saveRectangle(buf, 0, 0, 5, 2);
    // Overwrite the area
    for (let row = 0; row <= 2; row++) {
      for (let col = 0; col <= 5; col++) {
        buf.getCellRef(row, col).codepoint = 0x58; // 'X'
      }
    }
    // Restore at position (0, 0)
    ops.restoreRectangle(buf, 0, 0);
    // Should be back to original
    expect(buf.getCellRef(0, 0).codepoint).toBe(0x41); // 'A'
  });

  it('should normalize rectangle coordinates (swap inverted)', () => {
    const ops = new TDVRectangleOperations();
    const buf = createBufferWithText(80, 24);
    // Reversed: x1=5, y1=3, x2=2, y2=1 should normalize to cols 2-5, rows 1-3
    ops.fillCharacterInRectangle(buf, 0x2A, 5, 3, 2, 1);
    for (let row = 1; row <= 3; row++) {
      for (let col = 2; col <= 5; col++) {
        expect(buf.getCellRef(row, col).codepoint).toBe(0x2A);
      }
    }
  });

  it('should clear saved rectangles', () => {
    const ops = new TDVRectangleOperations();
    const buf = createBufferWithText(80, 24);
    ops.saveRectangle(buf, 0, 0, 5, 2);
    ops.clear();
    // Restore should do nothing (no saved rectangles)
    for (let col = 0; col <= 5; col++) {
      buf.getCellRef(0, col).codepoint = 0x58; // 'X'
    }
    ops.restoreRectangle(buf, 0, 0);
    expect(buf.getCellRef(0, 0).codepoint).toBe(0x58); // Still 'X'
  });
});
