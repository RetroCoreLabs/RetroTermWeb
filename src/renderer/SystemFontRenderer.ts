/**
 * Renders terminal text using system/web monospace fonts.
 * Used for VT100 mode and optionally for TDV modes.
 */

import { TerminalBuffer } from '../buffer/TerminalBuffer';
import { TerminalCell } from '../buffer/TerminalCell';
import { CharacterAttributes, hasAttribute } from '../buffer/CharacterAttributes';
import { TerminalColor } from '../buffer/TerminalColor';
import type { TerminalTheme } from '../terminal/TerminalOptions';
import { CursorState, CursorStyle } from '../emulators/CursorState';

export class SystemFontRenderer {
  private _charWidth: number = 0;
  private _charHeight: number = 0;
  private _fontFamily: string = 'monospace';
  private _fontSize: number = 16;
  private _baseline: number = 0;

  get charWidth(): number { return this._charWidth; }
  get charHeight(): number { return this._charHeight; }

  /** Measure character dimensions for a given font */
  measureFont(ctx: CanvasRenderingContext2D, fontFamily: string, fontSize: number): void {
    this._fontFamily = fontFamily;
    this._fontSize = fontSize;
    ctx.font = `${fontSize}px ${fontFamily}`;
    const metrics = ctx.measureText('W');
    this._charWidth = Math.ceil(metrics.width);
    this._charHeight = Math.ceil(fontSize * 1.2);
    this._baseline = Math.ceil(fontSize);
  }

  /** Render a single cell. Optional displayCodepoint overrides the codepoint for rendering. */
  renderCell(
    ctx: CanvasRenderingContext2D,
    cell: TerminalCell,
    col: number,
    row: number,
    theme: TerminalTheme,
    isSelected: boolean,
    displayCodepoint?: number,
  ): void {
    const x = col * this._charWidth;
    const y = row * this._charHeight;

    // Resolve colors — 'transparent' is not a usable render color
    let fg = this.resolveColor(cell.foreground, theme.foreground ?? '#ffffff', true, theme);
    let bg = this.resolveColor(cell.background, theme.background ?? '#000000', false, theme);
    if (bg === 'transparent') bg = '#000000';

    // Handle reverse video
    if (hasAttribute(cell.attributes, CharacterAttributes.Reverse) || isSelected) {
      const tmp = fg;
      fg = bg;
      bg = tmp;
    }

    // Draw background
    ctx.fillStyle = bg;
    ctx.fillRect(x, y, this._charWidth, this._charHeight);

    // Draw character (use displayCodepoint override when provided)
    const cp = displayCodepoint !== undefined ? displayCodepoint : cell.codepoint;
    if (cp > 0x20) {
      // Build font string
      let fontStyle = '';
      if (hasAttribute(cell.attributes, CharacterAttributes.Bold)) {
        fontStyle += 'bold ';
      }
      if (hasAttribute(cell.attributes, CharacterAttributes.Italic)) {
        fontStyle += 'italic ';
      }
      ctx.font = `${fontStyle}${this._fontSize}px ${this._fontFamily}`;
      ctx.fillStyle = fg;

      // Dim
      if (hasAttribute(cell.attributes, CharacterAttributes.Dim)) {
        ctx.globalAlpha = 0.5;
      }

      // Hidden
      if (hasAttribute(cell.attributes, CharacterAttributes.Hidden)) {
        ctx.globalAlpha = 0;
      }

      ctx.fillText(String.fromCodePoint(cp), x, y + this._baseline);
      ctx.globalAlpha = 1.0;
    }

    // Underline
    if (hasAttribute(cell.attributes, CharacterAttributes.Underline)) {
      ctx.strokeStyle = fg;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y + this._charHeight - 1);
      ctx.lineTo(x + this._charWidth, y + this._charHeight - 1);
      ctx.stroke();
    }

    // Strikethrough
    if (hasAttribute(cell.attributes, CharacterAttributes.Strikethrough)) {
      ctx.strokeStyle = fg;
      ctx.lineWidth = 1;
      ctx.beginPath();
      const midY = y + Math.floor(this._charHeight / 2);
      ctx.moveTo(x, midY);
      ctx.lineTo(x + this._charWidth, midY);
      ctx.stroke();
    }
  }

  /** Render cursor */
  renderCursor(
    ctx: CanvasRenderingContext2D,
    cursor: CursorState,
    theme: TerminalTheme,
    blinkOn: boolean,
  ): void {
    if (!cursor.visible) return;
    if (!blinkOn) return;

    const x = cursor.column * this._charWidth;
    const y = cursor.row * this._charHeight;
    ctx.fillStyle = theme.cursor ?? theme.foreground ?? '#ffffff';

    switch (cursor.style) {
      case CursorStyle.Block:
      case CursorStyle.BlinkingBlock:
        ctx.globalAlpha = 0.5;
        ctx.fillRect(x, y, this._charWidth, this._charHeight);
        ctx.globalAlpha = 1.0;
        break;
      case CursorStyle.Underline:
      case CursorStyle.BlinkingUnderline:
        ctx.fillRect(x, y + this._charHeight - 2, this._charWidth, 2);
        break;
      case CursorStyle.Bar:
      case CursorStyle.BlinkingBar:
        ctx.fillRect(x, y, 2, this._charHeight);
        break;
    }
  }

  /** Resolve a TerminalColor to a CSS color string */
  private resolveColor(color: TerminalColor, defaultColor: string, isForeground: boolean, theme: TerminalTheme): string {
    if (color.isDefault) return defaultColor;
    if (color.isIndexed) {
      const rgb = color.toRgb();
      return `rgb(${rgb.r},${rgb.g},${rgb.b})`;
    }
    const rgb = color.toRgb();
    return `rgb(${rgb.r},${rgb.g},${rgb.b})`;
  }
}
