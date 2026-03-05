/**
 * VT100/ECMA-48 escape sequence test data.
 * Provides structured test cases for parser and emulator tests.
 */

export interface SequenceTestCase {
  /** The escape sequence string */
  readonly seq: string;
  /** Short identifier (e.g., 'CUP', 'SGR') */
  readonly name: string;
  /** Human-readable description */
  readonly desc: string;
  /** Category for grouping */
  readonly category: string;
}

// --- Cursor Movement ---

export const CURSOR_MOVEMENT: SequenceTestCase[] = [
  { seq: '\x1b[A',     name: 'CUU',    desc: 'Cursor Up 1',                  category: 'cursor' },
  { seq: '\x1b[5A',    name: 'CUU5',   desc: 'Cursor Up 5',                  category: 'cursor' },
  { seq: '\x1b[B',     name: 'CUD',    desc: 'Cursor Down 1',                category: 'cursor' },
  { seq: '\x1b[3B',    name: 'CUD3',   desc: 'Cursor Down 3',                category: 'cursor' },
  { seq: '\x1b[C',     name: 'CUF',    desc: 'Cursor Forward 1',             category: 'cursor' },
  { seq: '\x1b[10C',   name: 'CUF10',  desc: 'Cursor Forward 10',            category: 'cursor' },
  { seq: '\x1b[D',     name: 'CUB',    desc: 'Cursor Backward 1',            category: 'cursor' },
  { seq: '\x1b[H',     name: 'CUP',    desc: 'Cursor Position (home)',        category: 'cursor' },
  { seq: '\x1b[5;10H', name: 'CUP',    desc: 'Cursor Position (5,10)',        category: 'cursor' },
  { seq: '\x1b[f',     name: 'HVP',    desc: 'Horizontal Vertical Position',  category: 'cursor' },
  { seq: '\x1b7',      name: 'DECSC',  desc: 'Save Cursor',                  category: 'cursor' },
  { seq: '\x1b8',      name: 'DECRC',  desc: 'Restore Cursor',               category: 'cursor' },
  { seq: '\x1bD',      name: 'IND',    desc: 'Index (cursor down, scroll)',   category: 'cursor' },
  { seq: '\x1bM',      name: 'RI',     desc: 'Reverse Index',                category: 'cursor' },
  { seq: '\x1bE',      name: 'NEL',    desc: 'Next Line',                    category: 'cursor' },
];

// --- Erase Operations ---

export const ERASE_OPERATIONS: SequenceTestCase[] = [
  { seq: '\x1b[J',     name: 'ED0',    desc: 'Erase Below',                  category: 'erase' },
  { seq: '\x1b[0J',    name: 'ED0',    desc: 'Erase Below (explicit)',        category: 'erase' },
  { seq: '\x1b[1J',    name: 'ED1',    desc: 'Erase Above',                  category: 'erase' },
  { seq: '\x1b[2J',    name: 'ED2',    desc: 'Erase Entire Screen',          category: 'erase' },
  { seq: '\x1b[3J',    name: 'ED3',    desc: 'Erase Scrollback',             category: 'erase' },
  { seq: '\x1b[K',     name: 'EL0',    desc: 'Erase to End of Line',         category: 'erase' },
  { seq: '\x1b[0K',    name: 'EL0',    desc: 'Erase to End of Line (explicit)', category: 'erase' },
  { seq: '\x1b[1K',    name: 'EL1',    desc: 'Erase to Start of Line',       category: 'erase' },
  { seq: '\x1b[2K',    name: 'EL2',    desc: 'Erase Entire Line',            category: 'erase' },
];

// --- SGR (Select Graphic Rendition) ---

export const SGR_SEQUENCES: SequenceTestCase[] = [
  { seq: '\x1b[0m',    name: 'SGR0',   desc: 'Reset all attributes',         category: 'sgr' },
  { seq: '\x1b[m',     name: 'SGR0',   desc: 'Reset (no param)',             category: 'sgr' },
  { seq: '\x1b[1m',    name: 'SGR1',   desc: 'Bold',                         category: 'sgr' },
  { seq: '\x1b[2m',    name: 'SGR2',   desc: 'Dim',                          category: 'sgr' },
  { seq: '\x1b[3m',    name: 'SGR3',   desc: 'Italic',                       category: 'sgr' },
  { seq: '\x1b[4m',    name: 'SGR4',   desc: 'Underline',                    category: 'sgr' },
  { seq: '\x1b[5m',    name: 'SGR5',   desc: 'Blink',                        category: 'sgr' },
  { seq: '\x1b[7m',    name: 'SGR7',   desc: 'Reverse Video',                category: 'sgr' },
  { seq: '\x1b[8m',    name: 'SGR8',   desc: 'Hidden',                       category: 'sgr' },
  { seq: '\x1b[9m',    name: 'SGR9',   desc: 'Strikethrough',                category: 'sgr' },
  { seq: '\x1b[22m',   name: 'SGR22',  desc: 'Normal intensity',             category: 'sgr' },
  { seq: '\x1b[23m',   name: 'SGR23',  desc: 'Not italic',                   category: 'sgr' },
  { seq: '\x1b[24m',   name: 'SGR24',  desc: 'Not underline',                category: 'sgr' },
  { seq: '\x1b[25m',   name: 'SGR25',  desc: 'Not blink',                    category: 'sgr' },
  { seq: '\x1b[27m',   name: 'SGR27',  desc: 'Not reverse',                  category: 'sgr' },
  { seq: '\x1b[28m',   name: 'SGR28',  desc: 'Not hidden',                   category: 'sgr' },
  { seq: '\x1b[29m',   name: 'SGR29',  desc: 'Not strikethrough',            category: 'sgr' },
];

// --- Colors ---

export const COLOR_SEQUENCES: SequenceTestCase[] = [
  // Standard foreground
  { seq: '\x1b[30m',   name: 'FG0',    desc: 'Foreground Black',             category: 'color' },
  { seq: '\x1b[31m',   name: 'FG1',    desc: 'Foreground Red',               category: 'color' },
  { seq: '\x1b[32m',   name: 'FG2',    desc: 'Foreground Green',             category: 'color' },
  { seq: '\x1b[33m',   name: 'FG3',    desc: 'Foreground Yellow',            category: 'color' },
  { seq: '\x1b[34m',   name: 'FG4',    desc: 'Foreground Blue',              category: 'color' },
  { seq: '\x1b[35m',   name: 'FG5',    desc: 'Foreground Magenta',           category: 'color' },
  { seq: '\x1b[36m',   name: 'FG6',    desc: 'Foreground Cyan',              category: 'color' },
  { seq: '\x1b[37m',   name: 'FG7',    desc: 'Foreground White',             category: 'color' },
  // Standard background
  { seq: '\x1b[40m',   name: 'BG0',    desc: 'Background Black',             category: 'color' },
  { seq: '\x1b[41m',   name: 'BG1',    desc: 'Background Red',               category: 'color' },
  { seq: '\x1b[42m',   name: 'BG2',    desc: 'Background Green',             category: 'color' },
  { seq: '\x1b[43m',   name: 'BG3',    desc: 'Background Yellow',            category: 'color' },
  { seq: '\x1b[44m',   name: 'BG4',    desc: 'Background Blue',              category: 'color' },
  { seq: '\x1b[45m',   name: 'BG5',    desc: 'Background Magenta',           category: 'color' },
  { seq: '\x1b[46m',   name: 'BG6',    desc: 'Background Cyan',              category: 'color' },
  { seq: '\x1b[47m',   name: 'BG7',    desc: 'Background White',             category: 'color' },
  // Bright foreground
  { seq: '\x1b[90m',   name: 'FG8',    desc: 'Foreground Bright Black',      category: 'color' },
  { seq: '\x1b[91m',   name: 'FG9',    desc: 'Foreground Bright Red',        category: 'color' },
  { seq: '\x1b[97m',   name: 'FG15',   desc: 'Foreground Bright White',      category: 'color' },
  // 256-color
  { seq: '\x1b[38;5;196m', name: 'FG256', desc: '256-color foreground (196=red)', category: 'color' },
  { seq: '\x1b[48;5;21m',  name: 'BG256', desc: '256-color background (21=blue)', category: 'color' },
  // 24-bit RGB
  { seq: '\x1b[38;2;255;0;128m', name: 'FGRGB', desc: 'RGB foreground',      category: 'color' },
  { seq: '\x1b[48;2;0;128;255m', name: 'BGRGB', desc: 'RGB background',      category: 'color' },
  // Default colors
  { seq: '\x1b[39m',   name: 'DFG',    desc: 'Default foreground',           category: 'color' },
  { seq: '\x1b[49m',   name: 'DBG',    desc: 'Default background',           category: 'color' },
];

// --- DEC Private Modes ---

export const DEC_MODES: SequenceTestCase[] = [
  { seq: '\x1b[?1h',   name: 'DECCKM',   desc: 'Application cursor keys ON',   category: 'mode' },
  { seq: '\x1b[?1l',   name: 'DECCKM',   desc: 'Application cursor keys OFF',  category: 'mode' },
  { seq: '\x1b[?7h',   name: 'DECAWM',   desc: 'Auto-wrap ON',                 category: 'mode' },
  { seq: '\x1b[?7l',   name: 'DECAWM',   desc: 'Auto-wrap OFF',                category: 'mode' },
  { seq: '\x1b[?25h',  name: 'DECTCEM',  desc: 'Show cursor',                  category: 'mode' },
  { seq: '\x1b[?25l',  name: 'DECTCEM',  desc: 'Hide cursor',                  category: 'mode' },
  { seq: '\x1b[?1049h', name: 'ALTBUF',  desc: 'Switch to alternate buffer',   category: 'mode' },
  { seq: '\x1b[?1049l', name: 'ALTBUF',  desc: 'Switch to normal buffer',      category: 'mode' },
];

// --- Scroll Region ---

export const SCROLL_SEQUENCES: SequenceTestCase[] = [
  { seq: '\x1b[r',       name: 'DECSTBM', desc: 'Reset scroll region',         category: 'scroll' },
  { seq: '\x1b[1;24r',   name: 'DECSTBM', desc: 'Set scroll region 1-24',      category: 'scroll' },
  { seq: '\x1b[5;20r',   name: 'DECSTBM', desc: 'Set scroll region 5-20',      category: 'scroll' },
];

// --- Line Operations ---

export const LINE_OPERATIONS: SequenceTestCase[] = [
  { seq: '\x1b[L',     name: 'IL',     desc: 'Insert Line',                  category: 'line' },
  { seq: '\x1b[5L',    name: 'IL5',    desc: 'Insert 5 Lines',               category: 'line' },
  { seq: '\x1b[M',     name: 'DL',     desc: 'Delete Line',                  category: 'line' },
  { seq: '\x1b[3M',    name: 'DL3',    desc: 'Delete 3 Lines',               category: 'line' },
];

// --- Character Operations ---

export const CHAR_OPERATIONS: SequenceTestCase[] = [
  { seq: '\x1b[@',     name: 'ICH',    desc: 'Insert Character',             category: 'char' },
  { seq: '\x1b[P',     name: 'DCH',    desc: 'Delete Character',             category: 'char' },
  { seq: '\x1b[X',     name: 'ECH',    desc: 'Erase Character',              category: 'char' },
];

// --- Tab Stops ---

export const TAB_SEQUENCES: SequenceTestCase[] = [
  { seq: '\x1bH',      name: 'HTS',    desc: 'Set Horizontal Tab Stop',      category: 'tab' },
  { seq: '\x1b[g',     name: 'TBC0',   desc: 'Clear Tab Stop at Cursor',     category: 'tab' },
  { seq: '\x1b[3g',    name: 'TBC3',   desc: 'Clear All Tab Stops',          category: 'tab' },
];

// --- Query/Response ---

export const QUERY_SEQUENCES: SequenceTestCase[] = [
  { seq: '\x1b[c',     name: 'DA',     desc: 'Device Attributes',            category: 'query' },
  { seq: '\x1b[>c',    name: 'DA2',    desc: 'Secondary Device Attributes',  category: 'query' },
  { seq: '\x1b[5n',    name: 'DSR',    desc: 'Device Status Report',         category: 'query' },
  { seq: '\x1b[6n',    name: 'CPR',    desc: 'Cursor Position Report',       category: 'query' },
  { seq: '\x1bZ',      name: 'DECID',  desc: 'DEC Identify Terminal',        category: 'query' },
];

// --- Control Characters ---

export const CONTROL_CHARS: SequenceTestCase[] = [
  { seq: '\x07',        name: 'BEL',    desc: 'Bell',                         category: 'control' },
  { seq: '\x08',        name: 'BS',     desc: 'Backspace',                    category: 'control' },
  { seq: '\x09',        name: 'HT',     desc: 'Horizontal Tab',              category: 'control' },
  { seq: '\x0A',        name: 'LF',     desc: 'Line Feed',                   category: 'control' },
  { seq: '\x0B',        name: 'VT',     desc: 'Vertical Tab',                category: 'control' },
  { seq: '\x0C',        name: 'FF',     desc: 'Form Feed',                   category: 'control' },
  { seq: '\x0D',        name: 'CR',     desc: 'Carriage Return',             category: 'control' },
];

// --- OSC (Operating System Commands) ---

export const OSC_SEQUENCES: SequenceTestCase[] = [
  { seq: '\x1b]0;Title\x07',     name: 'OSC0',   desc: 'Set Icon + Window Title', category: 'osc' },
  { seq: '\x1b]2;Title\x07',     name: 'OSC2',   desc: 'Set Window Title',        category: 'osc' },
  { seq: '\x1b]0;Title\x1b\\',   name: 'OSC0ST', desc: 'OSC with ST terminator',  category: 'osc' },
];

/** All VT100 sequences combined */
export const ALL_VT100_SEQUENCES: SequenceTestCase[] = [
  ...CURSOR_MOVEMENT,
  ...ERASE_OPERATIONS,
  ...SGR_SEQUENCES,
  ...COLOR_SEQUENCES,
  ...DEC_MODES,
  ...SCROLL_SEQUENCES,
  ...LINE_OPERATIONS,
  ...CHAR_OPERATIONS,
  ...TAB_SEQUENCES,
  ...QUERY_SEQUENCES,
  ...CONTROL_CHARS,
  ...OSC_SEQUENCES,
];
