/**
 * Manages work areas (NDDWA) that define rectangular regions constraining operations.
 * Port of C# TDVWorkAreas.
 */

export class TDVWorkAreas {
  private readonly _width: number;
  private readonly _height: number;
  private _currentLeft: number = 0;
  private _currentTop: number = 0;
  private _currentRight: number = 0;
  private _currentBottom: number = 0;
  private _hasWorkArea: boolean = false;

  constructor(width: number, height: number) {
    this._width = width;
    this._height = height;
  }

  get hasWorkArea(): boolean {
    return this._hasWorkArea;
  }

  /** Define a work area (0-indexed coordinates) */
  defineWorkArea(x1: number, y1: number, x2: number, y2: number): void {
    this._currentLeft = Math.max(0, Math.min(Math.min(x1, x2), this._width - 1));
    this._currentTop = Math.max(0, Math.min(Math.min(y1, y2), this._height - 1));
    this._currentRight = Math.max(0, Math.min(Math.max(x1, x2), this._width - 1));
    this._currentBottom = Math.max(0, Math.min(Math.max(y1, y2), this._height - 1));
    this._hasWorkArea = true;
  }

  /** Get the current work area bounds. Returns full screen if no work area defined. */
  getCurrentWorkArea(): { left: number; top: number; right: number; bottom: number } {
    if (!this._hasWorkArea) {
      return { left: 0, top: 0, right: this._width - 1, bottom: this._height - 1 };
    }
    return {
      left: this._currentLeft,
      top: this._currentTop,
      right: this._currentRight,
      bottom: this._currentBottom,
    };
  }

  /** Check if a position is inside the work area. Boundaries are EXCLUSIVE. */
  isInWorkArea(row: number, col: number): boolean {
    if (!this._hasWorkArea) return true;
    return col > this._currentLeft && col < this._currentRight &&
      row > this._currentTop && row < this._currentBottom;
  }

  /** Clear the work area definition */
  clear(): void {
    this._hasWorkArea = false;
  }

  /** Get work area dimensions */
  getWorkAreaDimensions(): { width: number; height: number } {
    const area = this.getCurrentWorkArea();
    return {
      width: area.right - area.left + 1,
      height: area.bottom - area.top + 1,
    };
  }
}
