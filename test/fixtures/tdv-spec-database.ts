/**
 * TDV2200 specification compliance database.
 * Expected values for device attribute responses, mode queries,
 * and capability checks based on the TDV2200 specification.
 */

// --- Device Attribute Responses ---

/** Expected DA response for TDV2200 */
export const TDV2200_DA_RESPONSE = '\x1b[?62;1;4;6;7;8;9;15c';

/** Expected DA response for TDV2215 */
export const TDV2215_DA_RESPONSE = '\x1b[?62;1;4;6;7;8;9c';

/** Expected DA2 (secondary) response for TDV2200 */
export const TDV2200_DA2_RESPONSE = '\x1b[>0;95;0c';

/** Expected DA2 (secondary) response for TDV2215 */
export const TDV2215_DA2_RESPONSE = '\x1b[>0;70;0c';

/** Expected DSR (device status report) response — OK */
export const DSR_OK_RESPONSE = '\x1b[0n';

/** Expected DECID response for TDV2200 */
export const TDV2200_DECID_RESPONSE = '\x1b[?62;1;4;6;7;8;9;15c';

// --- Cursor Position Report Format ---

/** CPR response format: ESC [ row ; col R (1-based) */
export function expectedCPR(row: number, col: number): string {
  return `\x1b[${row};${col}R`;
}

// --- TDV Character Set Indices ---

export const TDV_CHARSET_INDICES = {
  International: 0,
  Norwegian: 1,
  Swedish: 2,
  German: 3,
  GraphicsI: 4,
  GraphicsII: 5,
  LineDrawing: 6,
  Subscript: 7,
  Math: 8,
  Greek: 9,
} as const;

// --- ISO 646 Variant Expected Character Mappings ---

/** Characters that vary by ISO 646 national variant */
export const ISO646_VARIANT_POSITIONS = [
  0x23, // # → varies
  0x40, // @ → varies
  0x5B, // [ → varies
  0x5C, // \ → varies
  0x5D, // ] → varies
  0x5E, // ^ → varies
  0x60, // ` → varies
  0x7B, // { → varies
  0x7C, // | → varies
  0x7D, // } → varies
  0x7E, // ~ → varies
] as const;

/** Expected ISO 646 Norwegian variant character replacements */
export const ISO646_NORWEGIAN: Record<number, number> = {
  0x23: 0xA3, // £
  0x40: 0xC4, // Ä (mapped differently in Norwegian)
  0x5B: 0xC6, // Æ
  0x5C: 0xD8, // Ø
  0x5D: 0xC5, // Å
  0x5E: 0xDC, // Ü
  0x60: 0xE4, // ä
  0x7B: 0xE6, // æ
  0x7C: 0xF8, // ø
  0x7D: 0xE5, // å
  0x7E: 0xFC, // ü
};

// --- TDV Modes and Their Default States ---

export interface TDVModeSpec {
  readonly id: number;
  readonly name: string;
  readonly defaultOn: boolean;
  readonly desc: string;
}

export const TDV_PRIVATE_MODES: TDVModeSpec[] = [
  { id: 1,  name: 'DECCKM',  defaultOn: false, desc: 'Cursor key mode (normal/application)' },
  { id: 7,  name: 'DECAWM',  defaultOn: true,  desc: 'Auto-wrap mode' },
  { id: 25, name: 'DECTCEM', defaultOn: true,  desc: 'Text cursor enable' },
  { id: 67, name: 'NDSSM',   defaultOn: false, desc: 'Smooth scroll mode' },
  { id: 68, name: 'NDBLWM',  defaultOn: false, desc: 'Blink mode' },
  { id: 69, name: 'NDELWM',  defaultOn: false, desc: 'Enhanced blink mode' },
];

// --- TDV Keyboard Grid Positions ---

/** Grid position rows (top to bottom) */
export const GRID_ROWS = ['G', 'F', 'E', 'D', 'C', 'B', 'A'] as const;

/** Number of keys per main area row */
export const MAIN_AREA_KEYS: Record<string, number> = {
  'G': 15,  // ESC + 8 PUSH + 6 function
  'F': 0,   // Function keys only (in nav/func area)
  'E': 15,  // Number row
  'D': 14,  // QWERTY row
  'C': 14,  // ASDF row
  'B': 12,  // ZXCV row
  'A': 1,   // Space bar
};

// --- Terminal Dimensions ---

export const TDV_TERMINAL_SPECS = {
  /** TDV2200/2215 are 80-column terminals only */
  cols: 80,
  /** Standard rows */
  rows: 24,
  /** No 132-column support */
  supports132: false,
  /** Scrollback lines (default) */
  scrollback: 10000,
} as const;

// --- Push Key Constraints ---

export const PUSH_KEY_SPECS = {
  /** Number of programmable push keys */
  count: 8,
  /** Maximum bytes per push key definition */
  maxBytes: 127,
  /** Push keys grid positions */
  gridPositions: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8'],
} as const;

// --- LED Indicators ---

export const LED_SPECS = {
  /** Number of LEDs */
  count: 4,
  /** LED names */
  names: ['L1', 'L2', 'L3', 'L4'],
  /** LED states */
  states: ['off', 'on', 'slow_blink', 'fast_blink'] as const,
} as const;
