/**
 * Bitmap font renderer for TDV terminals (TDV2200, TDV2215).
 * Renders glyphs pixel-by-pixel from ROM bitmap font data onto a Canvas2D context.
 *
 * Port of RetroTerm.Desktop.Rendering.BitmapFontRenderer (C#).
 */

import { FontBase } from '../fonts/FontBase';
import { CharacterAttributes, hasAttribute } from '../buffer/CharacterAttributes';

/** Attribute flags — imported values to avoid circular dependency */
const ATTR_UNDERLINE = CharacterAttributes.Underline;
const ATTR_BOLD = CharacterAttributes.Bold;
const ATTR_DIM = CharacterAttributes.Dim;
const ATTR_ITALIC = CharacterAttributes.Italic;
const ATTR_HIDDEN = CharacterAttributes.Hidden;
const ATTR_STRIKETHROUGH = CharacterAttributes.Strikethrough;
const ATTR_BLINK = CharacterAttributes.Blink;
const ATTR_DOUBLE_WIDTH = CharacterAttributes.DoubleWidth;
const ATTR_DOUBLE_HEIGHT_TOP = CharacterAttributes.DoubleHeightTop;
const ATTR_DOUBLE_HEIGHT_BOTTOM = CharacterAttributes.DoubleHeightBottom;

/**
 * Reverse mapping: Unicode box-drawing codepoints back to VT100 ROM positions (0x00-0x1F).
 * When DEC Special Graphics charset maps ASCII 0x60-0x7E to Unicode,
 * the bitmap font needs to find the original ROM glyph.
 */
const UNICODE_TO_VT100_ROM: Map<number, number> = new Map([
  [0x25C6, 0x01], // diamond
  [0x2592, 0x02], // checkerboard
  [0x23BA, 0x0F], // scanline 1 (mapped to horizontal line variant)
  [0x23BB, 0x10], // scanline 3
  [0x23BC, 0x11], // scanline 7
  [0x23BD, 0x12], // scanline 9
  [0x2500, 0x12], // horizontal line -> HT glyph row (mapped to scanline in ROM)
  [0x2518, 0x0B], // bottom-right corner
  [0x2510, 0x0C], // top-right corner
  [0x250C, 0x0D], // top-left corner
  [0x2514, 0x0E], // bottom-left corner
  [0x253C, 0x0F], // cross
  [0x251C, 0x15], // left tee
  [0x2524, 0x16], // right tee
  [0x2534, 0x17], // bottom tee
  [0x252C, 0x18], // top tee
  [0x2502, 0x19], // vertical line
  [0x2264, 0x1A], // less-equal
  [0x2265, 0x1B], // greater-equal
  [0x03C0, 0x1C], // pi
  [0x2260, 0x1D], // not-equal
  [0x00A3, 0x1E], // pound sign
  [0x00B7, 0x1F], // middle dot
  [0x00B0, 0x07], // degree
  [0x00B1, 0x08], // plus-minus
]);

export class BitmapFontRenderer {
  private readonly _font: FontBase;
  private readonly _charWidth: number;
  private readonly _charHeight: number;

  /** Blink state — toggled externally by the renderer's blink timer */
  blinkOn: boolean = true;

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
   * @param codepoint - Character codepoint
   * @param fontNumber - Font/character set number (0-4)
   * @param attributes - Character attribute flags
   * @param x - X position in canvas pixels
   * @param y - Y position in canvas pixels
   * @param foregroundColor - CSS color string for the foreground
   * @param cellWidth - Width of the character cell (for scaling)
   * @param cellHeight - Height of the character cell (for scaling)
   * @param characterSet - Character set designation (0=ASCII, 2=DEC Special Graphics)
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
    characterSet: number = 0,
  ): boolean {
    // Hidden: skip rendering entirely
    if (hasAttribute(attributes, ATTR_HIDDEN)) return true;

    // Blink: skip glyph when blink is off
    if (hasAttribute(attributes, ATTR_BLINK) && !this.blinkOn) return true;

    let charValue = codepoint <= 0xFFFF ? codepoint : 0;

    // DEC Special Graphics: map ASCII 0x60-0x7E to ROM positions 0x00-0x1E
    // This is the proper 8-bit path - no Unicode involved
    if (characterSet === 2 && charValue >= 0x60 && charValue <= 0x7E) {
      charValue = charValue - 0x60;
    }

    // If the codepoint came through as Unicode (from applyCharacterSetMapping),
    // reverse-map it back to the ROM position
    if (charValue > 0x7F) {
      const romPos = UNICODE_TO_VT100_ROM.get(charValue);
      if (romPos !== undefined) {
        charValue = romPos;
      }
    }

    // Try to get font bits for this character and font number
    let fontBits = this._font.getFontBits(charValue, fontNumber);

    // If still null, try fontNum 0 as fallback
    if (fontBits === null && fontNumber !== 0) {
      fontBits = this._font.getFontBits(charValue, 0);
    }

    if (fontBits === null) return false;

    const fontWidth = this._font.width;
    const heightToUse = this._font.heightToUse > 0 ? this._font.heightToUse : this._font.height;

    // Double-width/height: scale factor for rendering
    const isDoubleWidth = hasAttribute(attributes, ATTR_DOUBLE_WIDTH);
    const isDoubleHeightTop = hasAttribute(attributes, ATTR_DOUBLE_HEIGHT_TOP);
    const isDoubleHeightBottom = hasAttribute(attributes, ATTR_DOUBLE_HEIGHT_BOTTOM);
    const scaleX = isDoubleWidth ? 2 : 1;
    const scaleY = (isDoubleHeightTop || isDoubleHeightBottom) ? 2 : 1;

    // Calculate pixel size (scale bitmap to character cell size)
    const pixelWidth = (cellWidth / fontWidth) * scaleX;
    const pixelHeight = (cellHeight / heightToUse) * scaleY;

    // Dim: reduce alpha
    if (hasAttribute(attributes, ATTR_DIM)) {
      ctx.globalAlpha = 0.5;
    }

    ctx.fillStyle = foregroundColor;

    // Clip to cell bounds for double-size rendering
    const needsClip = scaleX > 1 || scaleY > 1;
    if (needsClip) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, cellWidth, cellHeight);
      ctx.clip();
    }

    // For double-height bottom, offset Y up so we render the bottom half of 2x
    const yOffset = isDoubleHeightBottom ? -(cellHeight) : 0;

    // Italic: apply shear transform
    if (hasAttribute(attributes, ATTR_ITALIC)) {
      ctx.save();
      const skew = -0.2; // horizontal shear
      ctx.setTransform(1, 0, skew, 1, -skew * (y + cellHeight), 0);
    }

    // Render each row of the bitmap
    // Use integer snapping to avoid sub-pixel anti-aliasing artifacts
    for (let row = 0; row < heightToUse && row < fontBits.length; row++) {
      const rowBits = fontBits[row];
      if (rowBits === 0) continue; // Skip empty rows for performance

      const py = Math.round(y + yOffset + row * pixelHeight);
      const pyNext = Math.round(y + yOffset + (row + 1) * pixelHeight);
      const ph = pyNext - py;

      // Render each bit in the row (MSB first = leftmost pixel)
      for (let col = 0; col < fontWidth; col++) {
        const bitIndex = fontWidth - 1 - col;
        const pixelOn = (rowBits & (1 << bitIndex)) !== 0;

        if (pixelOn) {
          const px = Math.round(x + col * pixelWidth);
          const pxNext = Math.round(x + (col + 1) * pixelWidth);
          const pw = pxNext - px;
          ctx.fillRect(px, py, pw, ph);

          // Bold: draw a second time 1px to the right (thickening)
          if (hasAttribute(attributes, ATTR_BOLD)) {
            ctx.fillRect(px + 1, py, pw, ph);
          }
        }
      }
    }

    // Restore italic transform
    if (hasAttribute(attributes, ATTR_ITALIC)) {
      ctx.restore();
    }

    // Restore clip
    if (needsClip) {
      ctx.restore();
    }

    // Restore alpha
    if (hasAttribute(attributes, ATTR_DIM)) {
      ctx.globalAlpha = 1.0;
    }

    // Draw underline if needed
    if (hasAttribute(attributes, ATTR_UNDERLINE)) {
      ctx.fillRect(x, y + cellHeight - 2, cellWidth, 1);
    }

    // Draw strikethrough if needed
    if (hasAttribute(attributes, ATTR_STRIKETHROUGH)) {
      ctx.fillRect(x, y + Math.floor(cellHeight / 2), cellWidth, 1);
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
    let fontBits = this._font.getFontBits(charValue, fontNumber);
    if (fontBits === null && charValue > 0x7F) {
      const romPos = UNICODE_TO_VT100_ROM.get(charValue);
      if (romPos !== undefined) {
        fontBits = this._font.getFontBits(romPos, 0);
      }
    }
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
