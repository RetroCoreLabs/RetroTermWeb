/**
 * TDV character set type definitions and font number mapping.
 * Static data layer — pure lookup tables and mapping functions.
 *
 * All character rendering is handled by bitmap fonts from ROM.
 * The TDV2200 ROM has 5 font banks (fontNumOffset = [0, 0, 128, 256, 384]):
 *   fontNum 0/1: Main ASCII (offset 0)
 *   fontNum 2: Greek/Math/Graphics (offset 128)
 *   fontNum 3: Subscripts/Superscripts (offset 256)
 *   fontNum 4: Control code display (offset 384)
 *   fontNum 5-7: ISO 646 national variants (Norwegian/Swedish/German)
 */

/** TDV character set type identifiers */
export const enum TDVCharacterSetType {
  USASCII = 0,
  GraphicsI = 1,
  GraphicsII = 2,
  Math = 3,
  Greek = 4,
  Diacritics = 5,
  Box = 6,
  NIX = 7,
  T = 8,
  ND = 9,
}

/**
 * Maps TDVCharacterSetType → fontNumber for bitmap font rendering.
 * Each charset maps to the closest matching ROM font bank.
 */
export const CHARSET_TYPE_TO_FONTNUM: Record<number, number> = {
  1: 2,  // GraphicsI  → bank 2 (Greek/Math at offset 128)
  2: 3,  // GraphicsII → bank 3 (Sub/Superscripts at offset 256)
  3: 2,  // Math       → bank 2 (Greek/Math ROM has math symbols)
  4: 2,  // Greek      → bank 2 (Greek/Math ROM has Greek letters)
  5: 0,  // Diacritics → main ASCII (no dedicated ROM bank)
  6: 2,  // Box        → bank 2 (has graphic symbols)
  7: 0,  // NIX        → main ASCII (no dedicated ROM bank)
  8: 2,  // Technical  → bank 2 (closest match)
  9: 4,  // ND Private → bank 4 (control display)
};

/** Check if a character set type exists */
export function characterSetExists(type: TDVCharacterSetType): boolean {
  return type >= TDVCharacterSetType.GraphicsI && type <= TDVCharacterSetType.ND;
}

/** Get the human-readable name of a character set type */
export function getCharacterSetName(type: TDVCharacterSetType): string {
  switch (type) {
    case TDVCharacterSetType.USASCII: return 'US ASCII';
    case TDVCharacterSetType.GraphicsI: return 'Graphics I';
    case TDVCharacterSetType.GraphicsII: return 'Graphics II';
    case TDVCharacterSetType.Math: return 'Math';
    case TDVCharacterSetType.Greek: return 'Greek';
    case TDVCharacterSetType.Diacritics: return 'Diacritics';
    case TDVCharacterSetType.Box: return 'Box Drawing';
    case TDVCharacterSetType.NIX: return 'NIX (Nordic)';
    case TDVCharacterSetType.T: return 'Technical';
    case TDVCharacterSetType.ND: return 'ND Private';
    default: return 'Unknown';
  }
}

