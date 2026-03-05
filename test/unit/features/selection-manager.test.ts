/**
 * Tests for SelectionManager — canvas-based text selection.
 */
import { describe, it, expect } from 'vitest';
import { SelectionManager } from '../../../src/features/SelectionManager';
import { TerminalBuffer } from '../../../src/buffer/TerminalBuffer';

function createBufferWithText(rows: number, cols: number, lines: string[]): TerminalBuffer {
  const buffer = new TerminalBuffer(cols, rows);
  for (let r = 0; r < lines.length && r < rows; r++) {
    for (let c = 0; c < lines[r].length && c < cols; c++) {
      const cell = buffer.getCellRef(r, c);
      cell.codepoint = lines[r].charCodeAt(c);
    }
  }
  return buffer;
}

describe('SelectionManager', () => {
  describe('Basic selection', () => {
    it('should start with no selection', () => {
      const sm = new SelectionManager();
      expect(sm.hasSelection).toBe(false);
      expect(sm.selection).toBeNull();
    });

    it('should create selection on drag', () => {
      const sm = new SelectionManager();
      sm.startSelection(0, 0);
      sm.updateSelection(0, 5);
      sm.endSelection();

      expect(sm.hasSelection).toBe(true);
      expect(sm.selection!.startRow).toBe(0);
      expect(sm.selection!.startCol).toBe(0);
      expect(sm.selection!.endRow).toBe(0);
      expect(sm.selection!.endCol).toBe(5);
    });

    it('should normalize backward selection', () => {
      const sm = new SelectionManager();
      sm.startSelection(2, 10);
      sm.updateSelection(0, 5);
      sm.endSelection();

      expect(sm.selection!.startRow).toBe(0);
      expect(sm.selection!.startCol).toBe(5);
      expect(sm.selection!.endRow).toBe(2);
      expect(sm.selection!.endCol).toBe(10);
    });

    it('should clear selection', () => {
      const sm = new SelectionManager();
      sm.startSelection(0, 0);
      sm.updateSelection(0, 5);
      sm.endSelection();
      expect(sm.hasSelection).toBe(true);

      sm.clearSelection();
      expect(sm.hasSelection).toBe(false);
    });
  });

  describe('Line selection (triple click)', () => {
    it('should select entire line on triple click', () => {
      const sm = new SelectionManager();
      // Simulate triple click with rapid clicks
      sm.startSelection(5, 10);
      sm.startSelection(5, 10);
      sm.startSelection(5, 10);

      expect(sm.mode).toBe('line');
      expect(sm.selection!.startCol).toBe(0);
      expect(sm.selection!.endCol).toBe(79);
    });
  });

  describe('Rectangular selection', () => {
    it('should create rectangular selection', () => {
      const sm = new SelectionManager();
      sm.startSelection(1, 5, true);
      sm.updateSelection(4, 15);
      sm.endSelection();

      expect(sm.selection!.isRectangular).toBe(true);
      expect(sm.selection!.startRow).toBe(1);
      expect(sm.selection!.startCol).toBe(5);
      expect(sm.selection!.endRow).toBe(4);
      expect(sm.selection!.endCol).toBe(15);
    });
  });

  describe('isCellSelected', () => {
    it('should identify selected cells in linear selection', () => {
      const sm = new SelectionManager();
      sm.startSelection(1, 5);
      sm.updateSelection(3, 10);
      sm.endSelection();

      // Before selection
      expect(sm.isCellSelected(0, 0)).toBe(false);

      // Start row
      expect(sm.isCellSelected(1, 4)).toBe(false);
      expect(sm.isCellSelected(1, 5)).toBe(true);
      expect(sm.isCellSelected(1, 40)).toBe(true);

      // Middle row — fully selected
      expect(sm.isCellSelected(2, 0)).toBe(true);
      expect(sm.isCellSelected(2, 79)).toBe(true);

      // End row
      expect(sm.isCellSelected(3, 0)).toBe(true);
      expect(sm.isCellSelected(3, 10)).toBe(true);
      expect(sm.isCellSelected(3, 11)).toBe(false);

      // After selection
      expect(sm.isCellSelected(4, 0)).toBe(false);
    });

    it('should identify selected cells in rectangular selection', () => {
      const sm = new SelectionManager();
      sm.startSelection(1, 5, true);
      sm.updateSelection(3, 10);
      sm.endSelection();

      expect(sm.isCellSelected(1, 4)).toBe(false);
      expect(sm.isCellSelected(1, 5)).toBe(true);
      expect(sm.isCellSelected(2, 7)).toBe(true);
      expect(sm.isCellSelected(3, 10)).toBe(true);
      expect(sm.isCellSelected(2, 11)).toBe(false);
      expect(sm.isCellSelected(2, 4)).toBe(false);
    });
  });

  describe('getSelectedText', () => {
    it('should extract single-line selection', () => {
      const buffer = createBufferWithText(24, 80, ['Hello, World!']);
      const sm = new SelectionManager();
      sm.startSelection(0, 0);
      sm.updateSelection(0, 4);
      sm.endSelection();

      const text = sm.getSelectedText(buffer, 80);
      expect(text).toBe('Hello');
    });

    it('should extract multi-line selection', () => {
      const buffer = createBufferWithText(24, 80, ['Line 1', 'Line 2', 'Line 3']);
      const sm = new SelectionManager();
      sm.startSelection(0, 0);
      sm.updateSelection(2, 5);
      sm.endSelection();

      const text = sm.getSelectedText(buffer, 80);
      expect(text).toBe('Line 1\nLine 2\nLine 3');
    });

    it('should trim trailing whitespace from selected lines', () => {
      const buffer = createBufferWithText(24, 80, ['Hello   ']);
      const sm = new SelectionManager();
      sm.startSelection(0, 0);
      sm.updateSelection(0, 79);
      sm.endSelection();

      const text = sm.getSelectedText(buffer, 80);
      expect(text).toBe('Hello');
    });
  });

  describe('onChange callback', () => {
    it('should fire onChange when selection changes', () => {
      const sm = new SelectionManager();
      let callCount = 0;
      sm.onChange = () => { callCount++; };

      sm.startSelection(0, 0);
      expect(callCount).toBe(1);

      sm.updateSelection(0, 5);
      expect(callCount).toBe(2);

      sm.clearSelection();
      expect(callCount).toBe(3);
    });
  });
});
