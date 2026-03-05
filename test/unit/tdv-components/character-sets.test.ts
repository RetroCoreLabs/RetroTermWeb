import { describe, it, expect } from 'vitest';
import {
  TDVCharacterSetType,
  CHARSET_TYPE_TO_FONTNUM,
  characterSetExists,
  getCharacterSetName,
} from '../../../src/emulators/tdv/components/TDVCharacterSets';

describe('TDVCharacterSets', () => {
  it('CHARSET_TYPE_TO_FONTNUM should have entries for charsets 1-9', () => {
    for (let i = 1; i <= 9; i++) {
      expect(CHARSET_TYPE_TO_FONTNUM[i]).toBeDefined();
    }
    // GraphicsI → fontNumber 2
    expect(CHARSET_TYPE_TO_FONTNUM[TDVCharacterSetType.GraphicsI]).toBe(2);
    // GraphicsII → fontNumber 3
    expect(CHARSET_TYPE_TO_FONTNUM[TDVCharacterSetType.GraphicsII]).toBe(3);
    // Charsets 3-9 → correct ROM bank mappings
    expect(CHARSET_TYPE_TO_FONTNUM[TDVCharacterSetType.Math]).toBe(2);
    expect(CHARSET_TYPE_TO_FONTNUM[TDVCharacterSetType.Greek]).toBe(2);
    expect(CHARSET_TYPE_TO_FONTNUM[TDVCharacterSetType.Diacritics]).toBe(0);
    expect(CHARSET_TYPE_TO_FONTNUM[TDVCharacterSetType.Box]).toBe(2);
    expect(CHARSET_TYPE_TO_FONTNUM[TDVCharacterSetType.NIX]).toBe(0);
    expect(CHARSET_TYPE_TO_FONTNUM[TDVCharacterSetType.T]).toBe(2);
    expect(CHARSET_TYPE_TO_FONTNUM[TDVCharacterSetType.ND]).toBe(4);
  });

  it('characterSetExists should return true for valid sets', () => {
    expect(characterSetExists(TDVCharacterSetType.GraphicsI)).toBe(true);
    expect(characterSetExists(TDVCharacterSetType.ND)).toBe(true);
  });

  it('should return descriptive names for all character sets', () => {
    expect(getCharacterSetName(TDVCharacterSetType.USASCII)).toBe('US ASCII');
    expect(getCharacterSetName(TDVCharacterSetType.GraphicsI)).toBe('Graphics I');
    expect(getCharacterSetName(TDVCharacterSetType.Math)).toBe('Math');
    expect(getCharacterSetName(TDVCharacterSetType.Greek)).toBe('Greek');
    expect(getCharacterSetName(TDVCharacterSetType.NIX)).toBe('NIX (Nordic)');
  });
});
