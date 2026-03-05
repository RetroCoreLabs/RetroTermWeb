/**
 * Bitmap font renderer for TDV terminals (TDV2200, TDV2215).
 * Renders glyphs pixel-by-pixel from ROM bitmap font data onto a Canvas2D context.
 *
 * Port of RetroTerm.Desktop.Rendering.BitmapFontRenderer (C#).
 */

import { FontBase } from '../fonts/FontBase';
import { hasAttribute } from '../buffer/CharacterAttributes';

/** Attribute flag for underline — imported value to avoid circular dependency */
const ATTR_UNDERLINE = 0x0008;

export class BitmapFontRenderer {
  private readonly _font: FontBase;
  private readonly _charWidth: number;
  private readonly _charHeight: number;

  constructor(font: FontBase) {
    this._font = font;
    this._charWidth = font.width;
    this._charHeight = font.heightToUse > 0 ? font.heightToUse : font.height;
  }

  /** Get the underlying font for configuration (e.g., setting variant on TDV2215) */
  get font(): FontBase { return this._font; }

  get charWidth(): number { return this._charWidth; }
  get charHeight(): number { return this._charHeight; }

  /**
   * Draw a single character glyph at the given position.
   * @param ctx - Canvas 2D rendering context
   * @param codepoint - Unicode codepoint of the character
   * @param fontNumber - Font/character set number (0-4)
   * @param attributes - Character attribute flags
   * @param x - X position in canvas pixels
   * @param y - Y position in canvas pixels
   * @param foregroundColor - CSS color string for the foreground
   * @param cellWidth - Width of the character cell (for scaling)
   * @param cellHeight - Height of the character cell (for scaling)
   */
  drawCharacter(
    ctx: CanvasRenderingContext2D,
    codepoint: number,
    fontNumber: number,
    attributes: number,
    x: number,
    y: number,
    foregroundColor: string,
    cellWidth: number,
    cellHeight: number,
  ): boolean {
    let charValue = codepoint <= 0xFFFF ? codepoint : 0;

    // Try to get font bits for this character and font number
    let fontBits = this._font.getFontBits(charValue, fontNumber);

    // If still null, try fontNum 0 as fallback
    if (fontBits === null && fontNumber !== 0) {
      fontBits = this._font.getFontBits(charValue, 0);
    }

    if (fontBits === null) return false;

    const fontWidth = this._font.width;
    const heightToUse = this._font.heightToUse > 0 ? this._font.heightToUse : this._font.height;

    // Calculate pixel size (scale bitmap to character cell size)
    const pixelWidth = cellWidth / fontWidth;
    const pixelHeight = cellHeight / heightToUse;

    ctx.fillStyle = foregroundColor;

    // Render each row of the bitmap
    for (let row = 0; row < heightToUse && row < fontBits.length; row++) {
      const rowBits = fontBits[row];
      if (rowBits === 0) continue; // Skip empty rows for performance

      const pixelY = y + row * pixelHeight;

      // Render each bit in the row (MSB first = leftmost pixel)
      for (let col = 0; col < fontWidth; col++) {
        const bitIndex = fontWidth - 1 - col;
        const pixelOn = (rowBits & (1 << bitIndex)) !== 0;

        if (pixelOn) {
          const pixelX = x + col * pixelWidth;
          ctx.fillRect(pixelX, pixelY, pixelWidth, pixelHeight);
        }
      }
    }

    // Draw underline if needed
    if (hasAttribute(attributes, ATTR_UNDERLINE)) {
      ctx.fillRect(x, y + cellHeight - 2, cellWidth, 1);
    }

    return true;
  }

  /**
   * Render a glyph to an ImageData object (for testing or offscreen rendering).
   * Returns an array of booleans representing pixel on/off states.
   * @param codepoint - Character codepoint
   * @param fontNumber - Font number
   * @returns 2D boolean array [row][col] or null if glyph not found
   */
  getGlyphPixels(codepoint: number, fontNumber: number = 0): boolean[][] | null {
    const charValue = codepoint <= 0xFFFF ? codepoint : 0;
    const fontBits = this._font.getFontBits(charValue, fontNumber);
    if (fontBits === null) return null;

    const fontWidth = this._font.width;
    const heightToUse = this._font.heightToUse > 0 ? this._font.heightToUse : this._font.height;

    const pixels: boolean[][] = [];
    for (let row = 0; row < heightToUse && row < fontBits.length; row++) {
      const rowPixels: boolean[] = [];
      const rowBits = fontBits[row];
      for (let col = 0; col < fontWidth; col++) {
        const bitIndex = fontWidth - 1 - col;
        rowPixels.push((rowBits & (1 << bitIndex)) !== 0);
      }
      pixels.push(rowPixels);
    }

    return pixels;
  }
}
