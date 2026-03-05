/**
 * Buffer content assertion helpers for tests.
 */

import { TerminalBuffer } from '../../src/buffer/TerminalBuffer';
import { CharacterAttributes, hasAttribute } from '../../src/buffer/CharacterAttributes';
import { TerminalColor } from '../../src/buffer/TerminalColor';
import { expect } from 'vitest';

/** Assert that a row contains the expected text (trimmed) */
export function assertRowText(buffer: TerminalBuffer, row: number, expected: string): void {
  let text = '';
  for (let col = 0; col < buffer.width; col++) {
    text += buffer.getCell(row, col).getString();
  }
  expect(text.trimEnd()).toBe(expected);
}

/** Assert that a specific cell has the expected codepoint */
export function assertCellCodepoint(buffer: TerminalBuffer, row: number, col: number, expected: number): void {
  expect(buffer.getCell(row, col).codepoint).toBe(expected);
}

/** Assert that a specific cell has the expected character */
export function assertCellChar(buffer: TerminalBuffer, row: number, col: number, expected: string): void {
  expect(buffer.getCell(row, col).getString()).toBe(expected);
}

/** Assert that a cell has a specific attribute flag set */
export function assertCellAttribute(buffer: TerminalBuffer, row: number, col: number, attr: CharacterAttributes): void {
  const cell = buffer.getCell(row, col);
  expect(hasAttribute(cell.attributes, attr)).toBe(true);
}

/** Assert that a cell does NOT have a specific attribute flag set */
export function assertCellNoAttribute(buffer: TerminalBuffer, row: number, col: number, attr: CharacterAttributes): void {
  const cell = buffer.getCell(row, col);
  expect(hasAttribute(cell.attributes, attr)).toBe(false);
}

/** Assert that a cell has the expected foreground color (indexed) */
export function assertCellForeground(buffer: TerminalBuffer, row: number, col: number, colorIndex: number): void {
  const cell = buffer.getCell(row, col);
  expect(cell.foreground.isIndexed).toBe(true);
  expect(cell.foreground.index).toBe(colorIndex);
}

/** Assert that a cell has the expected background color (indexed) */
export function assertCellBackground(buffer: TerminalBuffer, row: number, col: number, colorIndex: number): void {
  const cell = buffer.getCell(row, col);
  expect(cell.background.isIndexed).toBe(true);
  expect(cell.background.index).toBe(colorIndex);
}

/** Assert that a cell has default foreground color */
export function assertCellDefaultForeground(buffer: TerminalBuffer, row: number, col: number): void {
  expect(buffer.getCell(row, col).foreground.isDefault).toBe(true);
}

/** Assert that a cell has default background color */
export function assertCellDefaultBackground(buffer: TerminalBuffer, row: number, col: number): void {
  expect(buffer.getCell(row, col).background.isDefault).toBe(true);
}

/** Assert that a row is entirely empty/spaces */
export function assertRowEmpty(buffer: TerminalBuffer, row: number): void {
  for (let col = 0; col < buffer.width; col++) {
    const cell = buffer.getCell(row, col);
    const cp = cell.codepoint;
    expect(cp === 0 || cp === 0x20).toBe(true);
  }
}

/** Assert cursor position */
export function assertCursorAt(emulator: { cursor: { row: number; column: number } }, row: number, col: number): void {
  expect(emulator.cursor.row).toBe(row);
  expect(emulator.cursor.column).toBe(col);
}
