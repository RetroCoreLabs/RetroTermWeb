/**
 * Tracks dirty state for efficient terminal rendering.
 * Only re-renders cells that have changed since last frame.
 */

export class RenderState {
  private _dirtyRows: boolean[];
  private _fullDirty: boolean = true;
  private _cursorDirty: boolean = true;
  private _width: number;
  private _height: number;

  constructor(width: number, height: number) {
    this._width = width;
    this._height = height;
    this._dirtyRows = new Array(height).fill(true);
  }

  get isFullDirty(): boolean { return this._fullDirty; }
  get isCursorDirty(): boolean { return this._cursorDirty; }

  /** Mark a specific row as dirty */
  markRowDirty(row: number): void {
    if (row >= 0 && row < this._height) {
      this._dirtyRows[row] = true;
    }
  }

  /** Mark all rows as dirty */
  markAllDirty(): void {
    this._fullDirty = true;
    for (let i = 0; i < this._height; i++) {
      this._dirtyRows[i] = true;
    }
  }

  /** Mark cursor as dirty */
  markCursorDirty(): void {
    this._cursorDirty = true;
  }

  /** Check if a row is dirty */
  isRowDirty(row: number): boolean {
    if (this._fullDirty) return true;
    return row >= 0 && row < this._height && this._dirtyRows[row];
  }

  /** Clear all dirty flags */
  clearDirty(): void {
    this._fullDirty = false;
    this._cursorDirty = false;
    for (let i = 0; i < this._height; i++) {
      this._dirtyRows[i] = false;
    }
  }

  /** Resize dirty tracking */
  resize(width: number, height: number): void {
    this._width = width;
    this._height = height;
    this._dirtyRows = new Array(height).fill(true);
    this._fullDirty = true;
  }
}
