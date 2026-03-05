/**
 * Common escape sequence builders for tests.
 */

/** CSI sequence builder */
export function csi(...params: (number | string)[]): string {
  return '\x1b[' + params.join(';');
}

/** Move cursor to position (1-indexed) */
export function cup(row: number, col: number): string {
  return `\x1b[${row};${col}H`;
}

/** Move cursor up */
export function cuu(count: number = 1): string {
  return `\x1b[${count}A`;
}

/** Move cursor down */
export function cud(count: number = 1): string {
  return `\x1b[${count}B`;
}

/** Move cursor forward */
export function cuf(count: number = 1): string {
  return `\x1b[${count}C`;
}

/** Move cursor backward */
export function cub(count: number = 1): string {
  return `\x1b[${count}D`;
}

/** Erase in display */
export function ed(mode: number = 0): string {
  return `\x1b[${mode}J`;
}

/** Erase in line */
export function el(mode: number = 0): string {
  return `\x1b[${mode}K`;
}

/** Select Graphic Rendition */
export function sgr(...params: number[]): string {
  if (params.length === 0) return '\x1b[m';
  return `\x1b[${params.join(';')}m`;
}

/** Set scroll region */
export function decstbm(top: number, bottom: number): string {
  return `\x1b[${top};${bottom}r`;
}

/** DEC private mode set */
export function decset(mode: number): string {
  return `\x1b[?${mode}h`;
}

/** DEC private mode reset */
export function decrst(mode: number): string {
  return `\x1b[?${mode}l`;
}

/** Set window title via OSC */
export function oscTitle(title: string): string {
  return `\x1b]2;${title}\x07`;
}

/** Save cursor (DECSC) */
export const DECSC = '\x1b7';

/** Restore cursor (DECRC) */
export const DECRC = '\x1b8';

/** Index (move down, scroll if at bottom) */
export const IND = '\x1bD';

/** Reverse index (move up, scroll if at top) */
export const RI = '\x1bM';

/** Next line (CR + LF) */
export const NEL = '\x1bE';

/** Full reset */
export const RIS = '\x1bc';

/** Carriage return */
export const CR = '\r';

/** Line feed */
export const LF = '\n';

/** Backspace */
export const BS = '\x08';

/** Tab */
export const HT = '\x09';

/** Bell */
export const BEL = '\x07';
