/**
 * TDV-specific escape sequence test data.
 * Covers TDV2200/2215 extensions beyond standard VT100.
 */

export interface TDVSequenceTestCase {
  /** The escape sequence string */
  readonly seq: string;
  /** Short identifier */
  readonly name: string;
  /** Human-readable description */
  readonly desc: string;
  /** Which emulator level ('base' = VT100, 'tdv' = TDVEmulatorBase, '2215' = TDV2215, '2200' = TDV2200) */
  readonly level: 'base' | 'tdv' | '2215' | '2200';
  /** Category for grouping */
  readonly category: string;
}

// --- TDV-Specific Modes ---

export const TDV_MODES: TDVSequenceTestCase[] = [
  { seq: '\x1b[?67h',  name: 'NDSSM',   desc: 'Smooth Scroll Mode ON',       level: 'tdv', category: 'mode' },
  { seq: '\x1b[?67l',  name: 'NDSSM',   desc: 'Smooth Scroll Mode OFF',      level: 'tdv', category: 'mode' },
  { seq: '\x1b[?68h',  name: 'NDBLWM',  desc: 'Blink Mode ON',               level: 'tdv', category: 'mode' },
  { seq: '\x1b[?68l',  name: 'NDBLWM',  desc: 'Blink Mode OFF',              level: 'tdv', category: 'mode' },
  { seq: '\x1b[?69h',  name: 'NDELWM',  desc: 'Enhanced Blink Mode ON',      level: 'tdv', category: 'mode' },
  { seq: '\x1b[?69l',  name: 'NDELWM',  desc: 'Enhanced Blink Mode OFF',     level: 'tdv', category: 'mode' },
];

// --- Protected Areas ---

export const TDV_PROTECTED: TDVSequenceTestCase[] = [
  { seq: '\x1b[1"q',   name: 'SPA',     desc: 'Start Protected Area',        level: 'tdv', category: 'protected' },
  { seq: '\x1b[2"q',   name: 'EPA',     desc: 'End Protected Area',          level: 'tdv', category: 'protected' },
  { seq: '\x1b[1"p',   name: 'DECSCA1', desc: 'Select Char Protection On',   level: 'tdv', category: 'protected' },
  { seq: '\x1b[0"p',   name: 'DECSCA0', desc: 'Select Char Protection Off',  level: 'tdv', category: 'protected' },
];

// --- Rectangle Operations ---

export const TDV_RECTANGLES: TDVSequenceTestCase[] = [
  { seq: '\x1b[1;1;24;80z',  name: 'NDSAR',  desc: 'Set Attributes in Rectangle',   level: 'tdv', category: 'rectangle' },
  { seq: '\x1b[1;1;24;80u',  name: 'NDSREC', desc: 'Save Rectangle',                level: 'tdv', category: 'rectangle' },
  { seq: '\x1b[1;1;24;80v',  name: 'NDRREC', desc: 'Restore Rectangle',             level: 'tdv', category: 'rectangle' },
];

// --- Character Sets ---

export const TDV_CHARSETS: TDVSequenceTestCase[] = [
  { seq: '\x1bN',       name: 'SS2',     desc: 'Single Shift to G2',          level: 'tdv', category: 'charset' },
  { seq: '\x1bO',       name: 'SS3',     desc: 'Single Shift to G3',         level: 'tdv', category: 'charset' },
  { seq: '\x1bn',       name: 'LS2',     desc: 'Locking Shift G2',           level: 'tdv', category: 'charset' },
  { seq: '\x1bo',       name: 'LS3',     desc: 'Locking Shift G3',           level: 'tdv', category: 'charset' },
  { seq: '\x1b(A',      name: 'SCS_G0',  desc: 'Designate G0 (UK)',          level: 'base', category: 'charset' },
  { seq: '\x1b(B',      name: 'SCS_G0',  desc: 'Designate G0 (US ASCII)',    level: 'base', category: 'charset' },
  { seq: '\x1b(0',      name: 'SCS_G0',  desc: 'Designate G0 (Line Drawing)', level: 'base', category: 'charset' },
];

// --- TDV Character Set Names (all 10) ---

export const TDV_CHARSET_NAMES = [
  'International',
  'Norwegian',
  'Swedish',
  'German',
  'Graphics I',
  'Graphics II',
  'Line Drawing',
  'Subscript',
  'Math',
  'Greek',
] as const;

// --- LED / Message Indicators ---

export const TDV_LEDS: TDVSequenceTestCase[] = [
  { seq: '\x1b[0q',    name: 'DECLL0',  desc: 'Clear All LEDs',              level: 'tdv', category: 'led' },
  { seq: '\x1b[1q',    name: 'DECLL1',  desc: 'Set LED 1',                   level: 'tdv', category: 'led' },
  { seq: '\x1b[2q',    name: 'DECLL2',  desc: 'Set LED 2',                   level: 'tdv', category: 'led' },
  { seq: '\x1b[3q',    name: 'DECLL3',  desc: 'Set LED 3',                   level: 'tdv', category: 'led' },
  { seq: '\x1b[4q',    name: 'DECLL4',  desc: 'Set LED 4',                   level: 'tdv', category: 'led' },
];

// --- Query/Response (TDV) ---

export const TDV_QUERIES: TDVSequenceTestCase[] = [
  { seq: '\x1b[c',     name: 'DA',      desc: 'Primary Device Attributes',   level: 'tdv', category: 'query' },
  { seq: '\x1b[>c',    name: 'DA2',     desc: 'Secondary Device Attributes', level: 'tdv', category: 'query' },
  { seq: '\x1b[5n',    name: 'DSR',     desc: 'Device Status Report',        level: 'tdv', category: 'query' },
  { seq: '\x1b[6n',    name: 'CPR',     desc: 'Cursor Position Report',      level: 'tdv', category: 'query' },
  { seq: '\x1bZ',      name: 'DECID',   desc: 'DEC Terminal ID',             level: 'tdv', category: 'query' },
];

// --- TDV2215-Specific Features ---

export const TDV2215_FEATURES: TDVSequenceTestCase[] = [
  { seq: '\x1b[?70h',  name: 'EXTMODE', desc: 'Extended Mode ON',            level: '2215', category: 'mode' },
  { seq: '\x1b[?70l',  name: 'EXTMODE', desc: 'Extended Mode OFF',           level: '2215', category: 'mode' },
  { seq: '\x1b[?71h',  name: 'TRMODE', desc: 'Transparent Mode ON',          level: '2215', category: 'mode' },
  { seq: '\x1b[?71l',  name: 'TRMODE', desc: 'Transparent Mode OFF',         level: '2215', category: 'mode' },
];

// --- TDV2200-Specific Features ---

export const TDV2200_FEATURES: TDVSequenceTestCase[] = [
  // ISO 646 variant selection (via DCS or control sequence)
  { seq: '\x1b[1 @',   name: 'ISO646', desc: 'ISO 646 Norwegian variant',    level: '2200', category: 'iso646' },
  { seq: '\x1b[2 @',   name: 'ISO646', desc: 'ISO 646 Danish variant',       level: '2200', category: 'iso646' },
  { seq: '\x1b[3 @',   name: 'ISO646', desc: 'ISO 646 Swedish variant',      level: '2200', category: 'iso646' },
  { seq: '\x1b[4 @',   name: 'ISO646', desc: 'ISO 646 German variant',       level: '2200', category: 'iso646' },
  { seq: '\x1b[5 @',   name: 'ISO646', desc: 'ISO 646 US ASCII variant',     level: '2200', category: 'iso646' },
];

// --- DCS (Device Control Strings) ---

export const TDV_DCS: TDVSequenceTestCase[] = [
  { seq: '\x1bP',      name: 'DCS',     desc: 'DCS Introducer',              level: 'tdv', category: 'dcs' },
  { seq: '\x1b\\',     name: 'ST',      desc: 'String Terminator',           level: 'tdv', category: 'dcs' },
];

// --- Work Areas ---

export const TDV_WORK_AREAS: TDVSequenceTestCase[] = [
  { seq: '\x1b[1;24s',  name: 'NDDWA',  desc: 'Define Work Area (1-24)',     level: 'tdv', category: 'workarea' },
  { seq: '\x1b[5;20s',  name: 'NDDWA',  desc: 'Define Work Area (5-20)',     level: 'tdv', category: 'workarea' },
];

/** All TDV sequences combined */
export const ALL_TDV_SEQUENCES: TDVSequenceTestCase[] = [
  ...TDV_MODES,
  ...TDV_PROTECTED,
  ...TDV_RECTANGLES,
  ...TDV_CHARSETS,
  ...TDV_LEDS,
  ...TDV_QUERIES,
  ...TDV2215_FEATURES,
  ...TDV2200_FEATURES,
  ...TDV_DCS,
  ...TDV_WORK_AREAS,
];
