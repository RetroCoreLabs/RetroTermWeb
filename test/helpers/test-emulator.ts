/**
 * Test helper utilities for creating emulators and encoding test data.
 */

import { TerminalEmulatorBase } from '../../src/emulators/TerminalEmulatorBase';
import { TerminalBuffer } from '../../src/buffer/TerminalBuffer';

/** Encode a string to Uint8Array (ASCII/Latin-1 — for escape sequences) */
export function encode(str: string): Uint8Array {
  const arr = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    arr[i] = str.charCodeAt(i);
  }
  return arr;
}

/** Encode a string to Uint8Array using TextEncoder (proper UTF-8) */
export function encodeUtf8(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/** Create a VT100 emulator with default dimensions */
export function createEmulator(cols: number = 80, rows: number = 24): TerminalEmulatorBase {
  return new TerminalEmulatorBase(cols, rows);
}

/** Write a string to the emulator (convenience) */
export function writeToEmulator(emulator: TerminalEmulatorBase, str: string): void {
  emulator.processData(encode(str));
}

/** Get the text content of a buffer row */
export function getRowText(buffer: TerminalBuffer, row: number): string {
  let text = '';
  for (let col = 0; col < buffer.width; col++) {
    text += buffer.getCell(row, col).getString();
  }
  return text;
}

/** Get the trimmed text content of a buffer row */
export function getRowTextTrimmed(buffer: TerminalBuffer, row: number): string {
  return getRowText(buffer, row).trimEnd();
}

/** Get text from a range of columns on a row */
export function getRowTextRange(buffer: TerminalBuffer, row: number, startCol: number, endCol: number): string {
  let text = '';
  for (let col = startCol; col <= endCol && col < buffer.width; col++) {
    text += buffer.getCell(row, col).getString();
  }
  return text;
}

/** Collect data sent back by emulator (responses) */
export function collectResponses(emulator: TerminalEmulatorBase): Uint8Array[] {
  const responses: Uint8Array[] = [];
  emulator.onDataToSend.on((data) => {
    responses.push(new Uint8Array(data));
  });
  return responses;
}

/** Decode a Uint8Array response to string */
export function decodeResponse(data: Uint8Array): string {
  let str = '';
  for (let i = 0; i < data.length; i++) {
    str += String.fromCharCode(data[i]);
  }
  return str;
}
