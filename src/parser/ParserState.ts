/**
 * Parser state machine states.
 * Mirrors the C# ParserState enum.
 */
export const enum ParserState {
  Ground = 0,
  Escape = 1,
  CsiEntry = 2,
  CsiIntermediate = 3,
  CsiParam = 4,
  CsiIgnore = 5,
  OscString = 6,
  DcsEntry = 7,
  DcsParam = 8,
  DcsIntermediate = 9,
  DcsPassthrough = 10,
  DcsIgnore = 11,
  EscapeIntermediate = 12,
  Utf8Sequence = 13,
  ApcString = 14,
  PmString = 15,
  SosString = 16,
}
