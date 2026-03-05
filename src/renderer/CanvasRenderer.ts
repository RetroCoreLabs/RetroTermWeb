/**
 * Canvas2D terminal renderer.
 * Renders the terminal buffer to an HTML Canvas element.
 * Supports both system fonts (VT100) and bitmap fonts (TDV).
 *
 * Rendering strategy:
 * - Canvas is rendered at native resolution (charWidth * cols x charHeight * rows)
 * - CSS scaling fills the container (image-rendering: pixelated for bitmap fonts)
 * - Dirty tracking only re-renders changed cells
 * - RequestAnimationFrame coalesces multiple writes
 */

import { TerminalBuffer } from '../buffer/TerminalBuffer';
import { CursorState } from '../emulators/CursorState';
import { SystemFontRenderer } from './SystemFontRenderer';
import { BitmapFontRenderer } from './BitmapFontRenderer';
import { FontTDV2200 } from '../fonts/FontTDV2200';
import { FontTDV2215 } from '../fonts/FontTDV2215';
import { FontVT100 } from '../fonts/FontVT100';
import { RenderState } from './RenderState';
import type { TerminalTheme } from '../terminal/TerminalOptions';
import type { SelectionManager } from '../features/SelectionManager';
import type { ScrollbackSearch } from '../features/ScrollbackSearch';

export class CanvasRenderer {
  private _canvas: HTMLCanvasElement;
  private _ctx: CanvasRenderingContext2D;
  private _systemFontRenderer: SystemFontRenderer;
  private _bitmapFontRenderer: BitmapFontRenderer | null = null;
  private _useBitmapFont: boolean = false;
  private _renderState: RenderState;
  private _theme: TerminalTheme;
  private _cols: number;
  private _rows: number;
  private _animFrameId: number = 0;
  private _pendingRender: boolean = false;
  private _cursorBlinkOn: boolean = true;
  private _cursorBlinkTimer: number = 0;
  private _resizeObserver: ResizeObserver | null = null;
  private _lastSyncedVariant: number = 0;
  private _bitmapEmulatorType: string = '';

  constructor(
    container: HTMLElement,
    cols: number,
    rows: number,
    theme: TerminalTheme,
    fontFamily: string = 'monospace',
    fontSize: number = 16,
  ) {
    this._cols = cols;
    this._rows = rows;
    this._theme = theme;

    // Create canvas
    this._canvas = document.createElement('canvas');
    this._canvas.className = 'retroterm-canvas retroterm-system';
    this._canvas.style.width = '100%';
    this._canvas.style.height = '100%';
    this._canvas.style.display = 'block';
    this._canvas.tabIndex = 0;
    container.appendChild(this._canvas);

    const ctx = this._canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas 2D context');
    this._ctx = ctx;

    // Initialize font renderer and measure
    this._systemFontRenderer = new SystemFontRenderer();
    this._systemFontRenderer.measureFont(this._ctx, fontFamily, fontSize);

    // Set canvas native resolution
    this._canvas.width = this._systemFontRenderer.charWidth * cols;
    this._canvas.height = this._systemFontRenderer.charHeight * rows;

    // Initialize render state
    this._renderState = new RenderState(cols, rows);

    // Start cursor blink
    this._cursorBlinkTimer = window.setInterval(() => {
      this._cursorBlinkOn = !this._cursorBlinkOn;
      this._renderState.markCursorDirty();
      this.scheduleRender();
    }, 500);

    // Watch for container resize
    this._resizeObserver = new ResizeObserver(() => {
      // CSS scaling handles resize — no re-rendering needed
    });
    this._resizeObserver.observe(container);
  }

  get canvas(): HTMLCanvasElement { return this._canvas; }
  get charWidth(): number {
    if (this._useBitmapFont && this._bitmapFontRenderer) {
      return this._bitmapFontRenderer.charWidth;
    }
    return this._systemFontRenderer.charWidth;
  }
  get charHeight(): number {
    if (this._useBitmapFont && this._bitmapFontRenderer) {
      return this._bitmapFontRenderer.charHeight;
    }
    return this._systemFontRenderer.charHeight;
  }

  /** Schedule a render on the next animation frame */
  scheduleRender(): void {
    if (this._pendingRender) return;
    this._pendingRender = true;
    this._animFrameId = requestAnimationFrame(() => {
      this._pendingRender = false;
    });
  }

  /** Full render of the terminal buffer */
  render(
    buffer: TerminalBuffer,
    cursor: CursorState,
    selectionManager?: SelectionManager,
    searchManager?: ScrollbackSearch,
    scrollOffset: number = 0,
  ): void {
    const ctx = this._ctx;
    const cw = this.charWidth;
    const ch = this.charHeight;

    // Clear with background
    ctx.fillStyle = this._theme.background ?? '#000000';
    ctx.fillRect(0, 0, this._canvas.width, this._canvas.height);

    // Render each cell
    for (let row = 0; row < this._rows; row++) {
      for (let col = 0; col < this._cols; col++) {
        const cell = scrollOffset > 0
          ? buffer.getViewportCell(row, col, scrollOffset)
          : buffer.getCellRef(row, col);
        if (!cell) continue;
        const isSelected = selectionManager ? selectionManager.isCellSelected(row, col) : false;

        if (this._useBitmapFont && this._bitmapFontRenderer) {
          // Bitmap font rendering
          const x = col * cw;
          const y = row * ch;

          // Draw background
          let bg = this._theme.background ?? '#000000';
          if (!cell.background.isDefault) {
            const rgb = cell.background.toRgb();
            bg = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
          }
          if (isSelected) {
            bg = this._theme.selectionBackground ?? 'rgba(100,100,255,0.5)';
          }
          ctx.fillStyle = bg;
          ctx.fillRect(x, y, cw, ch);

          // Draw character with bitmap font
          let fg = this._theme.foreground ?? '#ffffff';
          if (!cell.foreground.isDefault) {
            const rgb = cell.foreground.toRgb();
            fg = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
          }
          if (cell.codepoint > 0x20 || cell.fontNumber > 0) {
            this._bitmapFontRenderer.drawCharacter(
              ctx, cell.codepoint, cell.fontNumber, cell.attributes,
              x, y, fg, cw, ch,
            );
          }
        } else {
          this._systemFontRenderer.renderCell(ctx, cell, col, row, this._theme, isSelected);
        }

        // Render search highlights (overlay)
        if (searchManager) {
          if (searchManager.isCellCurrentMatch(row, col)) {
            const x = col * cw;
            const y = row * ch;
            ctx.fillStyle = 'rgba(255, 165, 0, 0.4)';
            ctx.fillRect(x, y, cw, ch);
          } else if (searchManager.isCellHighlighted(row, col)) {
            const x = col * cw;
            const y = row * ch;
            ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
            ctx.fillRect(x, y, cw, ch);
          }
        }
      }
    }

    // Hide cursor when scrolled back
    if (scrollOffset === 0) {
      this._systemFontRenderer.renderCursor(ctx, cursor, this._theme, this._cursorBlinkOn);
    }

    this._renderState.clearDirty();
  }

  /** Render only dirty rows */
  renderDirty(
    buffer: TerminalBuffer,
    cursor: CursorState,
    selectionManager?: SelectionManager,
    searchManager?: ScrollbackSearch,
    scrollOffset: number = 0,
  ): void {
    if (this._renderState.isFullDirty) {
      this.render(buffer, cursor, selectionManager, searchManager, scrollOffset);
      return;
    }

    const ctx = this._ctx;
    const cw = this.charWidth;
    const ch = this.charHeight;

    for (let row = 0; row < this._rows; row++) {
      if (this._renderState.isRowDirty(row)) {
        // Clear row background
        const y = row * ch;
        ctx.fillStyle = this._theme.background ?? '#000000';
        ctx.fillRect(0, y, this._canvas.width, ch);

        for (let col = 0; col < this._cols; col++) {
          const cell = scrollOffset > 0
            ? buffer.getViewportCell(row, col, scrollOffset)
            : buffer.getCellRef(row, col);
          if (!cell) continue;
          const isSelected = selectionManager ? selectionManager.isCellSelected(row, col) : false;

          if (this._useBitmapFont && this._bitmapFontRenderer) {
            const x = col * cw;
            // Draw background
            let bg = this._theme.background ?? '#000000';
            if (!cell.background.isDefault) {
              const rgb = cell.background.toRgb();
              bg = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
            }
            if (isSelected) {
              bg = this._theme.selectionBackground ?? 'rgba(100,100,255,0.5)';
            }
            ctx.fillStyle = bg;
            ctx.fillRect(x, y, cw, ch);

            // Draw character with bitmap font
            let fg = this._theme.foreground ?? '#ffffff';
            if (!cell.foreground.isDefault) {
              const rgb = cell.foreground.toRgb();
              fg = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
            }
            if (cell.codepoint > 0x20 || cell.fontNumber > 0) {
              this._bitmapFontRenderer.drawCharacter(
                ctx, cell.codepoint, cell.fontNumber, cell.attributes,
                x, y, fg, cw, ch,
              );
            }
          } else {
            this._systemFontRenderer.renderCell(ctx, cell, col, row, this._theme, isSelected);
          }
        }
      }
    }

    // Hide cursor when scrolled back
    if (scrollOffset === 0) {
      this._systemFontRenderer.renderCursor(ctx, cursor, this._theme, this._cursorBlinkOn);
    }
    this._renderState.clearDirty();
  }

  /** Mark everything dirty (e.g., after write) */
  invalidate(): void {
    this._renderState.markAllDirty();
  }

  /** Update theme */
  setTheme(theme: TerminalTheme): void {
    this._theme = theme;
    this._renderState.markAllDirty();
  }

  /** Update font */
  setFont(fontFamily: string, fontSize: number): void {
    this._systemFontRenderer.measureFont(this._ctx, fontFamily, fontSize);
    this._canvas.width = this.charWidth * this._cols;
    this._canvas.height = this.charHeight * this._rows;
    this._renderState.markAllDirty();
  }

  /** Switch bitmap font for the given emulator type.
   * All emulators use bitmap fonts — there is no system font fallback. */
  setUseBitmapFont(_useBitmap: boolean, emulatorType: string): void {
    this._useBitmapFont = true;

    if (!this._bitmapFontRenderer || emulatorType !== this._bitmapEmulatorType) {
      let font;
      if (emulatorType === 'tdv2200') {
        font = new FontTDV2200();
      } else if (emulatorType === 'tdv2215') {
        font = new FontTDV2215();
      } else {
        font = new FontVT100();
      }
      this._bitmapFontRenderer = new BitmapFontRenderer(font);
      this._bitmapEmulatorType = emulatorType;
      this._lastSyncedVariant = 0;
    }

    this._canvas.className = 'retroterm-canvas retroterm-bitmap';
    this._canvas.style.imageRendering = 'pixelated';
    this._canvas.width = this._bitmapFontRenderer!.charWidth * this._cols;
    this._canvas.height = this._bitmapFontRenderer!.charHeight * this._rows;

    this._renderState.markAllDirty();
  }

  /** Get the bitmap font renderer, if active */
  get bitmapFontRenderer(): BitmapFontRenderer | null { return this._bitmapFontRenderer; }

  /** Check if bitmap font rendering is active */
  get isBitmapFontActive(): boolean { return this._useBitmapFont && this._bitmapFontRenderer !== null; }

  /**
   * Sync the ISO 646 character set variant from the emulator to the bitmap font.
   * Must be called before each render to ensure the font uses the correct variant.
   */
  syncCharacterSetVariant(variant: number): void {
    if (!this._useBitmapFont || !this._bitmapFontRenderer) return;
    if (variant === this._lastSyncedVariant) return;
    const font = this._bitmapFontRenderer.font;
    if ('characterSetVariant' in font) {
      (font as { characterSetVariant: number }).characterSetVariant = variant;
      this._lastSyncedVariant = variant;
      this._renderState.markAllDirty();
    }
  }

  /** Resize the renderer */
  resize(cols: number, rows: number): void {
    this._cols = cols;
    this._rows = rows;
    this._canvas.width = this.charWidth * cols;
    this._canvas.height = this.charHeight * rows;
    this._renderState.resize(cols, rows);
  }

  /** Clean up resources */
  dispose(): void {
    if (this._animFrameId) {
      cancelAnimationFrame(this._animFrameId);
    }
    if (this._cursorBlinkTimer) {
      clearInterval(this._cursorBlinkTimer);
    }
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
    if (this._canvas.parentElement) {
      this._canvas.parentElement.removeChild(this._canvas);
    }
  }
}
