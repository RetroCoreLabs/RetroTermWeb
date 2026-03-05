/**
 * Cursor state management.
 * Port of the C# Cursor class.
 */

export const enum CursorStyle {
  Block = 0,
  Underline = 1,
  Bar = 2,
  BlinkingBlock = 3,
  BlinkingUnderline = 4,
  BlinkingBar = 5,
}

export class CursorState {
  private _row: number = 0;
  private _col: number = 0;
  private _maxRows: number;
  private _maxCols: number;
  private _savedState: { row: number; col: number; style: CursorStyle } = {
    row: 0, col: 0, style: CursorStyle.Block,
  };

  style: CursorStyle = CursorStyle.Block;
  visible: boolean = true;
  autoWrap: boolean = true;
  wrapPending: boolean = false;
  reverseWrap: boolean = false;

  constructor(maxRows: number, maxCols: number) {
    this._maxRows = maxRows;
    this._maxCols = maxCols;
  }

  get row(): number { return this._row; }
  set row(value: number) {
    this._row = Math.max(0, Math.min(this._maxRows - 1, value));
  }

  get column(): number { return this._col; }
  set column(value: number) {
    this._col = Math.max(0, Math.min(this._maxCols - 1, value));
    this.wrapPending = false;
  }

  get maxRows(): number { return this._maxRows; }
  get maxCols(): number { return this._maxCols; }

  get atLastColumn(): boolean { return this._col >= this._maxCols - 1; }
  get atFirstColumn(): boolean { return this._col === 0; }
  get atLastRow(): boolean { return this._row >= this._maxRows - 1; }
  get atFirstRow(): boolean { return this._row === 0; }

  /** Move cursor to absolute position (clamped) */
  moveTo(row: number, col: number): void {
    this.row = row;
    this.column = col;
  }

  /** Move cursor to home (0, 0) */
  home(): void {
    this._row = 0;
    this._col = 0;
    this.wrapPending = false;
  }

  /** Move cursor up by count rows */
  moveUp(count: number = 1): void {
    this._row = Math.max(0, this._row - count);
    this.wrapPending = false;
  }

  /** Move cursor down by count rows */
  moveDown(count: number = 1): void {
    this._row = Math.min(this._maxRows - 1, this._row + count);
    this.wrapPending = false;
  }

  /** Move cursor forward by count columns */
  moveForward(count: number = 1): void {
    this._col = Math.min(this._maxCols - 1, this._col + count);
    this.wrapPending = false;
  }

  /** Move cursor backward by count columns */
  moveBackward(count: number = 1): void {
    this._col = Math.max(0, this._col - count);
    this.wrapPending = false;
  }

  /** Move cursor to start of line */
  carriageReturn(): void {
    this._col = 0;
    this.wrapPending = false;
  }

  /**
   * Advance cursor by one position (after writing a character).
   * Returns true if a wrap+scroll is needed.
   */
  advance(): boolean {
    if (this.wrapPending) {
      // We were at the end of the line and autoWrap is on — now wrap
      this._col = 0;
      this.wrapPending = false;
      // Need line feed / scroll
      if (this._row >= this._maxRows - 1) {
        return true; // Signal that caller should scroll
      }
      this._row++;
      return false;
    }

    if (this._col < this._maxCols - 1) {
      this._col++;
      return false;
    }

    // At last column
    if (this.autoWrap) {
      this.wrapPending = true;
    }
    return false;
  }

  /** Reverse cursor one position */
  reverse(): void {
    if (this._col > 0) {
      this._col--;
    } else if (this.reverseWrap && this._row > 0) {
      this._row--;
      this._col = this._maxCols - 1;
    }
    this.wrapPending = false;
  }

  /** Save cursor state (DECSC) */
  save(): void {
    this._savedState = { row: this._row, col: this._col, style: this.style };
  }

  /** Restore cursor state (DECRC) */
  restore(): void {
    this._row = Math.max(0, Math.min(this._maxRows - 1, this._savedState.row));
    this._col = Math.max(0, Math.min(this._maxCols - 1, this._savedState.col));
    this.style = this._savedState.style;
    this.wrapPending = false;
  }

  /** Reset cursor to defaults */
  reset(): void {
    this._row = 0;
    this._col = 0;
    this.style = CursorStyle.Block;
    this.visible = true;
    this.autoWrap = true;
    this.wrapPending = false;
    this.reverseWrap = false;
    this._savedState = { row: 0, col: 0, style: CursorStyle.Block };
  }

  /** Create a new cursor with updated dimensions, preserving state */
  withNewDimensions(rows: number, cols: number): CursorState {
    const cursor = new CursorState(rows, cols);
    cursor._row = Math.max(0, Math.min(rows - 1, this._row));
    cursor._col = Math.max(0, Math.min(cols - 1, this._col));
    cursor.style = this.style;
    cursor.visible = this.visible;
    cursor.autoWrap = this.autoWrap;
    cursor.reverseWrap = this.reverseWrap;
    cursor._savedState = { ...this._savedState };
    return cursor;
  }
}
