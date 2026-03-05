/**
 * Base class for bitmap fonts used by TDV terminals.
 * Provides glyph lookup logic with font number offsets and stretch support.
 *
 * Port of RetroTerm.Core.Fonts.FontBase (C#).
 */

export class FontBase {
  /** Total height of each glyph in the font data (rows per glyph) */
  height: number = 0;
  /** Number of rows actually rendered (may be less than height) */
  heightToUse: number = 0;
  /** Width of each glyph in pixels/bits */
  width: number = 0;
  /** Vertical stretch factor (1 = no stretch, 2 = double each row) */
  stretchY: number = 1;
  /** Whether the font includes blank space around glyphs */
  includeBlankSpace: boolean = false;

  /** Raw glyph bitmap data — each glyph is `height` consecutive uint16 values */
  glyphs: Uint16Array = new Uint16Array(0);

  /** Offset into the glyph table for each font number (character set) */
  fontNumOffset: number[] = [];

  /** Character code to substitute for SPACE (0x20). Default 0 = use position 0. */
  mapSpaceChar: number = 0;

  /**
   * Get the bitmap rows for a character.
   * @param fontValue - Character code (0x00-0xFF typically)
   * @param fontNum - Font/character set number (0-4)
   * @returns Array of uint16 row values, or null if glyph not found
   */
  getFontBits(fontValue: number, fontNum: number): Uint16Array | null {
    // Map space character to alternate position
    if (fontValue === 0x20) {
      fontValue = this.mapSpaceChar;
    }

    let glyphOffset = 0;

    if (fontNum > 0) {
      if (this.fontNumOffset.length >= fontNum) {
        glyphOffset = this.fontNumOffset[fontNum];
      }
      fontValue = fontValue + glyphOffset;
    }

    const rowsPerGlyph = this.height / this.stretchY;
    const startPos = fontValue * rowsPerGlyph;

    if (this.glyphs.length === 0) return null;
    if (startPos >= this.glyphs.length) return null;

    const fb = new Uint16Array(this.height);
    for (let i = 0; i < this.height; i++) {
      const bitrow = Math.floor(i / this.stretchY);

      if (this.stretchY > 1 && i % 2 === 1) {
        fb[i] = 0;
      } else {
        const idx = bitrow + startPos;
        fb[i] = idx < this.glyphs.length ? this.glyphs[idx] : 0;
      }
    }

    return fb;
  }
}
