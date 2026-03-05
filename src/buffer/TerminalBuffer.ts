/**
 * 2D terminal buffer with scrollback history and alternate screen buffer.
 * Port of the C# TerminalBuffer class.
 */

import { TerminalCell } from './TerminalCell';

export class TerminalBuffer {
  private _screen: TerminalCell[][];
  private _alternateScreen: TerminalCell[][] | null = null;
  private _scrollback: TerminalCell[][] = [];
  private readonly _maxScrollbackLines: number;
  private _usingAlternateBuffer: boolean = false;
  private _width: number;
  private _height: number;

  constructor(width: number, height: number, maxScrollbackLines: number = 10000) {
    if (width <= 0) throw new RangeError('width must be positive');
    if (height <= 0) throw new RangeError('height must be positive');
    if (maxScrollbackLines < 0) throw new RangeError('maxScrollbackLines must be non-negative');

    this._width = width;
    this._height = height;
    this._maxScrollbackLines = maxScrollbackLines;
    this._screen = this.createScreen(width, height);
    this.clear();
  }

  get width(): number { return this._width; }
  get height(): number { return this._height; }
  get isUsingAlternateBuffer(): boolean { return this._usingAlternateBuffer; }
  get scrollbackLineCount(): number { return this._scrollback.length; }
  get maxScrollbackLines(): number { return this._maxScrollbackLines; }

  /** Get a cell by row/col. Returns empty cell if out of range. */
  getCell(row: number, col: number): TerminalCell {
    if (row < 0 || row >= this._height || col < 0 || col >= this._width) {
      return TerminalCell.empty();
    }
    return this._screen[row][col];
  }

  /** Set a cell by row/col. Silently ignores out-of-range. */
  setCell(row: number, col: number, cell: TerminalCell): void {
    if (row < 0 || row >= this._height || col < 0 || col >= this._width) return;
    this._screen[row][col].copyFrom(cell);
  }

  /** Get direct reference to a cell for in-place modification. Throws on out-of-range. */
  getCellRef(row: number, col: number): TerminalCell {
    if (row < 0 || row >= this._height || col < 0 || col >= this._width) {
      throw new RangeError(`Cell position (${row}, ${col}) out of range (${this._height}x${this._width})`);
    }
    return this._screen[row][col];
  }

  /** Get a scrollback line by index (0 = oldest). Returns null if out of range. */
  getScrollbackLine(index: number): TerminalCell[] | null {
    if (index < 0 || index >= this._scrollback.length) return null;
    return this._scrollback[index];
  }

  /** Clear the active screen to spaces */
  clear(): void {
    this.fillScreen(this._screen, 0x20);
    if (this._alternateScreen) {
      this.fillScreen(this._alternateScreen, 0x20);
    }
  }

  /** Clear a single line to spaces */
  clearLine(row: number): void {
    if (row < 0 || row >= this._height) {
      throw new RangeError(`Row ${row} out of range (0-${this._height - 1})`);
    }
    const line = this._screen[row];
    for (let col = 0; col < this._width; col++) {
      line[col].codepoint = 0x20;
      line[col].attributes = 0 as any;
      line[col].characterSet = 0;
      line[col].foreground = TerminalCell.space().foreground;
      line[col].background = TerminalCell.space().background;
    }
  }

  /** Clear from startCol to end of line */
  clearToEndOfLine(row: number, startCol: number): void {
    if (row < 0 || row >= this._height) {
      throw new RangeError(`Row ${row} out of range`);
    }
    const line = this._screen[row];
    for (let col = startCol; col < this._width; col++) {
      line[col] = TerminalCell.space();
    }
  }

  /** Clear from start of line to endCol (inclusive) */
  clearFromStartOfLine(row: number, endCol: number): void {
    if (row < 0 || row >= this._height) {
      throw new RangeError(`Row ${row} out of range`);
    }
    const line = this._screen[row];
    const end = Math.min(endCol, this._width - 1);
    for (let col = 0; col <= end; col++) {
      line[col] = TerminalCell.space();
    }
  }

  /** Clear the scrollback buffer */
  clearScrollback(): void {
    this._scrollback.length = 0;
  }

  /** Scroll the entire buffer up by 1 line */
  scrollUp(): void {
    this.scrollUpRegion(0, this._height - 1);
  }

  /** Scroll a region up by 1 line. If topRow is 0, saves to scrollback. */
  scrollUpRegion(topRow: number, bottomRow: number): void {
    if (topRow < 0 || bottomRow >= this._height || topRow >= bottomRow) return;

    // Save top line to scrollback if scrolling from row 0
    if (topRow === 0) {
      const savedLine = this.cloneLine(this._screen[0]);
      this._scrollback.push(savedLine);
      if (this._scrollback.length > this._maxScrollbackLines) {
        this._scrollback.shift();
      }
    }

    // Shift lines up
    for (let row = topRow; row < bottomRow; row++) {
      this.copyLine(this._screen[row + 1], this._screen[row]);
    }

    // Clear the bottom line
    this.clearLineToSpaces(this._screen[bottomRow]);
  }

  /** Scroll a region down by 1 line. Does NOT save to scrollback. */
  scrollDownRegion(topRow: number, bottomRow: number): void {
    if (topRow < 0 || bottomRow >= this._height || topRow >= bottomRow) return;

    // Shift lines down
    for (let row = bottomRow; row > topRow; row--) {
      this.copyLine(this._screen[row - 1], this._screen[row]);
    }

    // Clear the top line
    this.clearLineToSpaces(this._screen[topRow]);
  }

  /** Insert count lines at the given row (shifts content down) */
  insertLines(row: number, count: number): void {
    for (let i = 0; i < count; i++) {
      this.scrollDownRegion(row, this._height - 1);
    }
  }

  /** Delete count lines at the given row (shifts content up) */
  deleteLines(row: number, count: number): void {
    for (let i = 0; i < count; i++) {
      this.scrollUpRegion(row, this._height - 1);
    }
  }

  /** Resize the buffer to new dimensions */
  resize(newWidth: number, newHeight: number): void {
    if (newWidth === this._width && newHeight === this._height) return;
    if (newWidth <= 0 || newHeight <= 0) return;

    const newScreen = this.createScreen(newWidth, newHeight);

    // Copy existing content
    const copyRows = Math.min(this._height, newHeight);
    const copyCols = Math.min(this._width, newWidth);
    for (let row = 0; row < copyRows; row++) {
      for (let col = 0; col < copyCols; col++) {
        newScreen[row][col].copyFrom(this._screen[row][col]);
      }
    }

    this._screen = newScreen;
    this._width = newWidth;
    this._height = newHeight;
  }

  /** Get a viewport cell accounting for scrollback offset */
  getViewportCell(viewportRow: number, col: number, scrollOffset: number): TerminalCell | null {
    if (col < 0 || col >= this._width) return null;

    if (scrollOffset === 0) {
      if (viewportRow < 0 || viewportRow >= this._height) return null;
      return this._screen[viewportRow][col];
    }

    const totalLine = this._scrollback.length - scrollOffset + viewportRow;
    if (totalLine < 0) return null;

    if (totalLine < this._scrollback.length) {
      const line = this._scrollback[totalLine];
      if (col >= line.length) return null;
      return line[col];
    }

    const screenRow = totalLine - this._scrollback.length;
    if (screenRow < 0 || screenRow >= this._height) return null;
    return this._screen[screenRow][col];
  }

  /** Get a snapshot (deep copy) of the screen */
  getSnapshot(): TerminalCell[][] {
    const snapshot: TerminalCell[][] = [];
    for (let row = 0; row < this._height; row++) {
      snapshot.push(this.cloneLine(this._screen[row]));
    }
    return snapshot;
  }

  /** Switch to alternate screen buffer */
  switchToAlternateBuffer(clearOnSwitch: boolean = true): void {
    if (this._usingAlternateBuffer) return;

    if (!this._alternateScreen) {
      this._alternateScreen = this.createScreen(this._width, this._height);
    }

    if (clearOnSwitch) {
      this.fillScreen(this._alternateScreen, 0);
    }

    // Swap primary and alternate
    const temp = this._screen;
    this._screen = this._alternateScreen;
    this._alternateScreen = temp;
    this._usingAlternateBuffer = true;
  }

  /** Switch back to primary screen buffer */
  switchToPrimaryBuffer(): void {
    if (!this._usingAlternateBuffer) return;
    if (!this._alternateScreen) return;

    // Swap back
    const temp = this._screen;
    this._screen = this._alternateScreen;
    this._alternateScreen = temp;
    this._usingAlternateBuffer = false;
  }

  /** Extract text content from a row */
  getLineText(row: number): string {
    if (row < 0 || row >= this._height) return '';
    const line = this._screen[row];
    let result = '';
    for (let col = 0; col < this._width; col++) {
      result += line[col].getString();
    }
    return result;
  }

  // --- Private helpers ---

  /** Create a new screen filled with empty cells */
  private createScreen(width: number, height: number): TerminalCell[][] {
    const screen: TerminalCell[][] = [];
    for (let row = 0; row < height; row++) {
      const line: TerminalCell[] = [];
      for (let col = 0; col < width; col++) {
        line.push(new TerminalCell(0));
      }
      screen.push(line);
    }
    return screen;
  }

  /** Fill a screen with cells of the given codepoint */
  private fillScreen(screen: TerminalCell[][], codepoint: number): void {
    for (let row = 0; row < screen.length; row++) {
      const line = screen[row];
      for (let col = 0; col < line.length; col++) {
        line[col].clear();
        line[col].codepoint = codepoint;
      }
    }
  }

  /** Clear a line to space characters */
  private clearLineToSpaces(line: TerminalCell[]): void {
    for (let col = 0; col < line.length; col++) {
      line[col].clear();
      line[col].codepoint = 0x20;
    }
  }

  /** Clone a line (deep copy) */
  private cloneLine(line: TerminalCell[]): TerminalCell[] {
    const result: TerminalCell[] = [];
    for (let col = 0; col < line.length; col++) {
      result.push(line[col].clone());
    }
    return result;
  }

  /** Copy one line's content to another */
  private copyLine(src: TerminalCell[], dst: TerminalCell[]): void {
    const len = Math.min(src.length, dst.length);
    for (let col = 0; col < len; col++) {
      dst[col].copyFrom(src[col]);
    }
  }
}
