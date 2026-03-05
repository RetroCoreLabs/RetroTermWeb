/**
 * Manages per-cell protected areas (SPA/EPA).
 * Protected cells prevent cursor movement and text modification.
 * Port of C# TDVProtectedAreas.
 */

export class TDVProtectedAreas {
  private readonly _protectedCells: boolean[][];
  private readonly _width: number;
  private readonly _height: number;

  constructor(width: number, height: number) {
    this._width = width;
    this._height = height;
    this._protectedCells = [];
    for (let r = 0; r < height; r++) {
      this._protectedCells.push(new Array(width).fill(false));
    }
  }

  setProtectedArea(row: number, col: number): void {
    if (this.isValidPosition(row, col)) {
      this._protectedCells[row][col] = true;
    }
  }

  clearProtectedArea(row: number, col: number): void {
    if (this.isValidPosition(row, col)) {
      this._protectedCells[row][col] = false;
    }
  }

  setProtectedRectangle(top: number, left: number, bottom: number, right: number): void {
    const t = Math.max(0, top);
    const l = Math.max(0, left);
    const b = Math.min(this._height - 1, bottom);
    const r = Math.min(this._width - 1, right);
    for (let row = t; row <= b; row++) {
      for (let col = l; col <= r; col++) {
        this._protectedCells[row][col] = true;
      }
    }
  }

  clearProtectedRectangle(top: number, left: number, bottom: number, right: number): void {
    const t = Math.max(0, top);
    const l = Math.max(0, left);
    const b = Math.min(this._height - 1, bottom);
    const r = Math.min(this._width - 1, right);
    for (let row = t; row <= b; row++) {
      for (let col = l; col <= r; col++) {
        this._protectedCells[row][col] = false;
      }
    }
  }

  isProtected(row: number, col: number): boolean {
    return this.isValidPosition(row, col) && this._protectedCells[row][col];
  }

  clear(): void {
    for (let r = 0; r < this._height; r++) {
      for (let c = 0; c < this._width; c++) {
        this._protectedCells[r][c] = false;
      }
    }
  }

  getProtectedPositions(): { row: number; col: number }[] {
    const positions: { row: number; col: number }[] = [];
    for (let r = 0; r < this._height; r++) {
      for (let c = 0; c < this._width; c++) {
        if (this._protectedCells[r][c]) {
          positions.push({ row: r, col: c });
        }
      }
    }
    return positions;
  }

  private isValidPosition(row: number, col: number): boolean {
    return row >= 0 && row < this._height && col >= 0 && col < this._width;
  }
}
