/**
 * Handles rectangle operations for TDV terminals.
 * Supports attribute manipulation, save/restore, and fill operations.
 * Port of C# TDVRectangleOperations.
 */

import { TerminalBuffer } from '../../../buffer/TerminalBuffer';
import { TerminalCell } from '../../../buffer/TerminalCell';
import { CharacterAttributes, setAttribute, clearAttribute } from '../../../buffer/CharacterAttributes';

/** Map SGR-style attribute value to CharacterAttributes flag */
function attrValueToFlag(attr: number): CharacterAttributes {
  switch (attr) {
    case 1: return CharacterAttributes.Bold;
    case 2: return CharacterAttributes.Dim;
    case 4: return CharacterAttributes.Underline;
    case 5: return CharacterAttributes.Blink;
    case 7: return CharacterAttributes.Reverse;
    case 8: return CharacterAttributes.Hidden;
    default: return CharacterAttributes.None;
  }
}

function normalizeRectangle(
  x1: number, y1: number, x2: number, y2: number,
  maxWidth: number, maxHeight: number,
): { left: number; top: number; right: number; bottom: number } {
  return {
    left: Math.max(0, Math.min(x1, x2)),
    top: Math.max(0, Math.min(y1, y2)),
    right: Math.min(maxWidth - 1, Math.max(x1, x2)),
    bottom: Math.min(maxHeight - 1, Math.max(y1, y2)),
  };
}

export class TDVRectangleOperations {
  private _savedRectangles: Map<string, TerminalCell[][]> = new Map();

  /** NDSAR — Set attribute in rectangle */
  setAttributeInRectangle(buffer: TerminalBuffer, attr: number, x1: number, y1: number, x2: number, y2: number): void {
    const { left, top, right, bottom } = normalizeRectangle(x1, y1, x2, y2, buffer.width, buffer.height);
    const flag = attrValueToFlag(attr);
    if (flag === CharacterAttributes.None) return;
    for (let row = top; row <= bottom; row++) {
      for (let col = left; col <= right; col++) {
        const cell = buffer.getCellRef(row, col);
        cell.attributes = setAttribute(cell.attributes, flag);
      }
    }
  }

  /** NDAAR — Add attribute in rectangle (same as set) */
  addAttributeInRectangle(buffer: TerminalBuffer, attr: number, x1: number, y1: number, x2: number, y2: number): void {
    this.setAttributeInRectangle(buffer, attr, x1, y1, x2, y2);
  }

  /** NDRAR — Remove attribute in rectangle */
  removeAttributeInRectangle(buffer: TerminalBuffer, attr: number, x1: number, y1: number, x2: number, y2: number): void {
    const { left, top, right, bottom } = normalizeRectangle(x1, y1, x2, y2, buffer.width, buffer.height);
    const flag = attrValueToFlag(attr);
    if (flag === CharacterAttributes.None) return;
    for (let row = top; row <= bottom; row++) {
      for (let col = left; col <= right; col++) {
        const cell = buffer.getCellRef(row, col);
        cell.attributes = clearAttribute(cell.attributes, flag);
      }
    }
  }

  /** NDSREC — Save rectangle contents */
  saveRectangle(buffer: TerminalBuffer, x1: number, y1: number, x2: number, y2: number): void {
    const { left, top, right, bottom } = normalizeRectangle(x1, y1, x2, y2, buffer.width, buffer.height);
    const height = bottom - top + 1;
    const width = right - left + 1;
    const saved: TerminalCell[][] = [];
    for (let row = 0; row < height; row++) {
      const line: TerminalCell[] = [];
      for (let col = 0; col < width; col++) {
        line.push(buffer.getCell(top + row, left + col).clone());
      }
      saved.push(line);
    }
    const key = `${left},${top},${right},${bottom}`;
    this._savedRectangles.set(key, saved);
  }

  /** NDRREC — Restore rectangle at position */
  restoreRectangle(buffer: TerminalBuffer, x: number, y: number): void {
    // Get the most recently saved rectangle
    let lastKey: string | undefined;
    // Iterate to find last key (Map preserves insertion order)
    for (const key of this._savedRectangles.keys()) {
      lastKey = key;
    }
    if (!lastKey) return;

    const saved = this._savedRectangles.get(lastKey)!;
    const height = saved.length;
    if (height === 0) return;
    const width = saved[0].length;

    const startX = Math.max(0, Math.min(x, buffer.width - width));
    const startY = Math.max(0, Math.min(y, buffer.height - height));

    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const destRow = startY + row;
        const destCol = startX + col;
        if (destRow < buffer.height && destCol < buffer.width) {
          buffer.setCell(destRow, destCol, saved[row][col]);
        }
      }
    }
  }

  /** NDFC — Fill character in rectangle */
  fillCharacterInRectangle(buffer: TerminalBuffer, character: number, x1: number, y1: number, x2: number, y2: number): void {
    const { left, top, right, bottom } = normalizeRectangle(x1, y1, x2, y2, buffer.width, buffer.height);
    for (let row = top; row <= bottom; row++) {
      for (let col = left; col <= right; col++) {
        buffer.getCellRef(row, col).codepoint = character;
      }
    }
  }

  /** Clear all saved rectangles */
  clear(): void {
    this._savedRectangles.clear();
  }
}
