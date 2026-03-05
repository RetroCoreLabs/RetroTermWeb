/**
 * Canvas-based text selection manager.
 * Handles click-drag selection on the terminal canvas, word/line selection
 * via double/triple click, and rectangular selection via Alt+drag.
 */

import type { TerminalBuffer } from '../buffer/TerminalBuffer';

export interface SelectionRange {
  /** Start row (0-based) */
  startRow: number;
  /** Start column (0-based) */
  startCol: number;
  /** End row (0-based, inclusive) */
  endRow: number;
  /** End column (0-based, inclusive) */
  endCol: number;
  /** Whether this is a rectangular (block) selection */
  isRectangular: boolean;
}

export type SelectionMode = 'none' | 'char' | 'word' | 'line' | 'rect';

export class SelectionManager {
  private _selection: SelectionRange | null = null;
  private _mode: SelectionMode = 'none';
  private _selecting: boolean = false;
  private _anchorRow: number = 0;
  private _anchorCol: number = 0;
  private _lastClickTime: number = 0;
  private _clickCount: number = 0;
  private _onChange: (() => void) | null = null;

  get selection(): SelectionRange | null { return this._selection; }
  get hasSelection(): boolean { return this._selection !== null; }
  get mode(): SelectionMode { return this._mode; }

  /** Set callback for when selection changes */
  set onChange(fn: (() => void) | null) { this._onChange = fn; }

  /** Start a selection from a mouse position (cell coordinates) */
  startSelection(row: number, col: number, rectangular: boolean = false): void {
    const now = Date.now();
    if (now - this._lastClickTime < 400) {
      this._clickCount++;
    } else {
      this._clickCount = 1;
    }
    this._lastClickTime = now;

    this._selecting = true;
    this._anchorRow = row;
    this._anchorCol = col;

    if (this._clickCount >= 3) {
      // Triple click: line selection
      this._mode = 'line';
      this._selection = { startRow: row, startCol: 0, endRow: row, endCol: 79, isRectangular: false };
    } else if (this._clickCount >= 2) {
      // Double click: word selection
      this._mode = 'word';
      this._selection = { startRow: row, startCol: col, endRow: row, endCol: col, isRectangular: false };
    } else if (rectangular) {
      this._mode = 'rect';
      this._selection = { startRow: row, startCol: col, endRow: row, endCol: col, isRectangular: true };
    } else {
      this._mode = 'char';
      this._selection = null; // No selection until drag
    }

    this._onChange?.();
  }

  /** Update selection during mouse drag */
  updateSelection(row: number, col: number): void {
    if (!this._selecting) return;

    if (this._mode === 'line') {
      const minRow = Math.min(this._anchorRow, row);
      const maxRow = Math.max(this._anchorRow, row);
      this._selection = { startRow: minRow, startCol: 0, endRow: maxRow, endCol: 79, isRectangular: false };
    } else if (this._mode === 'rect') {
      this._selection = {
        startRow: Math.min(this._anchorRow, row),
        startCol: Math.min(this._anchorCol, col),
        endRow: Math.max(this._anchorRow, row),
        endCol: Math.max(this._anchorCol, col),
        isRectangular: true,
      };
    } else {
      // Character selection — normalize direction
      if (row < this._anchorRow || (row === this._anchorRow && col < this._anchorCol)) {
        this._selection = { startRow: row, startCol: col, endRow: this._anchorRow, endCol: this._anchorCol, isRectangular: false };
      } else {
        this._selection = { startRow: this._anchorRow, startCol: this._anchorCol, endRow: row, endCol: col, isRectangular: false };
      }
    }

    this._onChange?.();
  }

  /** End selection on mouse up */
  endSelection(): void {
    this._selecting = false;
  }

  /** Clear the current selection */
  clearSelection(): void {
    this._selection = null;
    this._mode = 'none';
    this._selecting = false;
    this._onChange?.();
  }

  /** Check if a cell is within the current selection */
  isCellSelected(row: number, col: number): boolean {
    if (!this._selection) return false;
    const s = this._selection;

    if (s.isRectangular) {
      return row >= s.startRow && row <= s.endRow && col >= s.startCol && col <= s.endCol;
    }

    // Linear selection
    if (row < s.startRow || row > s.endRow) return false;
    if (row === s.startRow && row === s.endRow) {
      return col >= s.startCol && col <= s.endCol;
    }
    if (row === s.startRow) return col >= s.startCol;
    if (row === s.endRow) return col <= s.endCol;
    return true;
  }

  /**
   * Extract selected text from the buffer.
   * Trims trailing whitespace from each line and joins with newlines.
   */
  getSelectedText(buffer: TerminalBuffer, cols: number): string {
    if (!this._selection) return '';
    const s = this._selection;
    const lines: string[] = [];

    for (let row = s.startRow; row <= s.endRow; row++) {
      let startCol = 0;
      let endCol = cols - 1;

      if (s.isRectangular) {
        startCol = s.startCol;
        endCol = s.endCol;
      } else {
        if (row === s.startRow) startCol = s.startCol;
        if (row === s.endRow) endCol = s.endCol;
      }

      let line = '';
      for (let col = startCol; col <= endCol && col < cols; col++) {
        const cell = buffer.getCell(row, col);
        const cp = cell.codepoint;
        line += cp > 0 ? String.fromCodePoint(cp) : ' ';
      }

      // Trim trailing spaces
      lines.push(line.replace(/\s+$/, ''));
    }

    return lines.join('\n');
  }
}
