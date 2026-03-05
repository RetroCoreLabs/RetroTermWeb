/**
 * Complete validation of TDV character set font number mapping.
 * All graphic character rendering is handled by bitmap fonts from ROM.
 */
import { describe, it, expect } from 'vitest';
import {
  TDVCharacterSetType,
  CHARSET_TYPE_TO_FONTNUM,
} from '../../../src/emulators/tdv/components/TDVCharacterSets';

describe('TDV Character Set Complete Validation', () => {
  it('CHARSET_TYPE_TO_FONTNUM should map all charsets correctly', () => {
    // USASCII (0) has no entry — defaults to fontNumber 0
    expect(CHARSET_TYPE_TO_FONTNUM[TDVCharacterSetType.USASCII]).toBeUndefined();

    // GraphicsI → fontNumber 2 (dedicated bitmap ROM bank)
    expect(CHARSET_TYPE_TO_FONTNUM[TDVCharacterSetType.GraphicsI]).toBe(2);

    // GraphicsII → fontNumber 3 (dedicated bitmap ROM bank)
    expect(CHARSET_TYPE_TO_FONTNUM[TDVCharacterSetType.GraphicsII]).toBe(3);

    // Charsets 3-9 → correct ROM bank mappings
    expect(CHARSET_TYPE_TO_FONTNUM[TDVCharacterSetType.Math]).toBe(2);       // Greek/Math ROM
    expect(CHARSET_TYPE_TO_FONTNUM[TDVCharacterSetType.Greek]).toBe(2);      // Greek/Math ROM
    expect(CHARSET_TYPE_TO_FONTNUM[TDVCharacterSetType.Diacritics]).toBe(0); // main ASCII
    expect(CHARSET_TYPE_TO_FONTNUM[TDVCharacterSetType.Box]).toBe(2);        // graphic symbols
    expect(CHARSET_TYPE_TO_FONTNUM[TDVCharacterSetType.NIX]).toBe(0);        // main ASCII
    expect(CHARSET_TYPE_TO_FONTNUM[TDVCharacterSetType.T]).toBe(2);          // closest match
    expect(CHARSET_TYPE_TO_FONTNUM[TDVCharacterSetType.ND]).toBe(4);         // control display

    // Verify total number of entries (charsets 1-9)
    const keys = Object.keys(CHARSET_TYPE_TO_FONTNUM);
    expect(keys.length).toBe(9);
  });
});
