/**
 * Canvas2D terminal renderer.
 * Renders the terminal buffer to an HTML Canvas element.
 * Supports both system fonts (VT100) and bitmap fonts (TDV).
 *
 * Rendering strategy:
 * - Canvas is rendered at display resolution (container size * devicePixelRatio)
 * - Bitmap glyphs are scaled up to fill display cells (no CSS upscaling needed)
 * - Dirty tracking only re-renders changed cells
 * - RequestAnimationFrame coalesces multiple writes
 */

import { TerminalBuffer } from '../buffer/TerminalBuffer';
import { CursorState, CursorStyle } from '../emulators/CursorState';
import { SystemFontRenderer } from './SystemFontRenderer';
import { BitmapFontRenderer } from './BitmapFontRenderer';
import { FontTDV2200 } from '../fonts/FontTDV2200';
import { FontTDV2215 } from '../fonts/FontTDV2215';
import { FontVT100 } from '../fonts/FontVT100';
import { RenderState } from './RenderState';
import { CharacterAttributes, hasAttribute } from '../buffer/CharacterAttributes';
import type { TerminalTheme } from '../terminal/TerminalOptions';
import type { SelectionManager } from '../features/SelectionManager';
import type { ScrollbackSearch } from '../features/ScrollbackSearch';

export class CanvasRenderer {
  private _canvas: HTMLCanvasElement;
  private _container: HTMLElement;
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
  /** Scale multiplier for bitmap rendering (integer multiple of native) */
  private _bitmapScale: number = 1;

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
    this._canvas.style.display = 'block';
    this._canvas.tabIndex = 0;
    this._container = container;
    container.appendChild(this._canvas);

    const ctx = this._canvas.getContext('2d', { alpha: false });
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

    // Start cursor blink (also drives character blink attribute)
    this._cursorBlinkTimer = window.setInterval(() => {
      this._cursorBlinkOn = !this._cursorBlinkOn;
      if (this._bitmapFontRenderer) {
        this._bitmapFontRenderer.blinkOn = this._cursorBlinkOn;
      }
      this._renderState.markCursorDirty();
      this.scheduleRender();
    }, 500);

    // Watch for container resize — update CSS display size to fit
    this._resizeObserver = new ResizeObserver(() => {
      this._fitCanvasToContainer();
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

  /** Rendering cell width (bitmap charWidth * scale) */
  get renderCellWidth(): number {
    if (this._useBitmapFont && this._bitmapFontRenderer) {
      return this._bitmapFontRenderer.charWidth * this._bitmapScale;
    }
    return this._systemFontRenderer.charWidth;
  }
  /** Rendering cell height (bitmap charHeight * scale) */
  get renderCellHeight(): number {
    if (this._useBitmapFont && this._bitmapFontRenderer) {
      return this._bitmapFontRenderer.charHeight * this._bitmapScale;
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
    // Ensure CSS fit is applied before rendering — guards against the race
    // where the first render fires before _fitCanvasToContainer() succeeded.
    if (this._useBitmapFont && this._canvas.style.width === '') {
      this._fitCanvasToContainer();
    }

    const ctx = this._ctx;
    const cw = this.renderCellWidth;
    const ch = this.renderCellHeight;

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

          // Resolve fg and bg colors
          let fg = this._theme.foreground ?? '#ffffff';
          let bg = this._theme.background ?? '#000000';
          if (!cell.foreground.isDefault) {
            const rgb = cell.foreground.toRgb();
            fg = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
          }
          if (!cell.background.isDefault) {
            const rgb = cell.background.toRgb();
            bg = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
          }

          // Reverse video: swap fg/bg
          if (hasAttribute(cell.attributes, CharacterAttributes.Reverse)) {
            const tmp = fg;
            fg = bg;
            bg = tmp;
          }

          // Selection overrides background
          if (isSelected) {
            bg = this._theme.selectionBackground ?? 'rgba(100,100,255,0.5)';
          }

          // Draw background
          ctx.fillStyle = bg;
          ctx.fillRect(x, y, cw, ch);

          // Draw character with bitmap font
          if (cell.codepoint > 0x20 || cell.fontNumber > 0 || cell.characterSet === 2) {
            this._bitmapFontRenderer.drawCharacter(
              ctx, cell.codepoint, cell.fontNumber, cell.attributes,
              x, y, fg, cw, ch, cell.characterSet,
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
      this.renderCursorWithCorrectDimensions(ctx, cursor);
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
    const cw = this.renderCellWidth;
    const ch = this.renderCellHeight;

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

            // Resolve fg and bg colors
            let fg = this._theme.foreground ?? '#ffffff';
            let bg = this._theme.background ?? '#000000';
            if (!cell.foreground.isDefault) {
              const rgb = cell.foreground.toRgb();
              fg = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
            }
            if (!cell.background.isDefault) {
              const rgb = cell.background.toRgb();
              bg = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
            }

            // Reverse video: swap fg/bg
            if (hasAttribute(cell.attributes, CharacterAttributes.Reverse)) {
              const tmp = fg;
              fg = bg;
              bg = tmp;
            }

            // Selection overrides background
            if (isSelected) {
              bg = this._theme.selectionBackground ?? 'rgba(100,100,255,0.5)';
            }

            // Draw background
            ctx.fillStyle = bg;
            ctx.fillRect(x, y, cw, ch);

            // Draw character with bitmap font
            if (cell.codepoint > 0x20 || cell.fontNumber > 0 || cell.characterSet === 2) {
              this._bitmapFontRenderer.drawCharacter(
                ctx, cell.codepoint, cell.fontNumber, cell.attributes,
                x, y, fg, cw, ch, cell.characterSet,
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
      this.renderCursorWithCorrectDimensions(ctx, cursor);
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
    this._canvas.style.imageRendering = 'auto';

    // Render at 3x native resolution — small enough to be cheap,
    // large enough that CSS bilinear scaling looks clean in both directions
    this._bitmapScale = 3;
    this._canvas.width = this._bitmapFontRenderer!.charWidth * this._cols * this._bitmapScale;
    this._canvas.height = this._bitmapFontRenderer!.charHeight * this._rows * this._bitmapScale;

    // Set CSS display size to fit within the container
    this._fitCanvasToContainer();

    this._renderState.markAllDirty();
  }

  /** Render cursor using the correct character dimensions (bitmap or system font) */
  private renderCursorWithCorrectDimensions(ctx: CanvasRenderingContext2D, cursor: CursorState): void {
    if (!cursor.visible) return;
    if (!this._cursorBlinkOn) return;

    const cw = this.renderCellWidth;
    const ch = this.renderCellHeight;
    const x = cursor.column * cw;
    const y = cursor.row * ch;
    ctx.fillStyle = this._theme.cursor ?? this._theme.foreground ?? '#ffffff';

    switch (cursor.style) {
      case CursorStyle.Block:
      case CursorStyle.BlinkingBlock:
        ctx.globalAlpha = 0.5;
        ctx.fillRect(x, y, cw, ch);
        ctx.globalAlpha = 1.0;
        break;
      case CursorStyle.Underline:
      case CursorStyle.BlinkingUnderline:
        ctx.fillRect(x, y + ch - 2, cw, 2);
        break;
      case CursorStyle.Bar:
      case CursorStyle.BlinkingBar:
        ctx.fillRect(x, y, 2, ch);
        break;
    }
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

  /**
   * Fit the canvas CSS display size to the container while maintaining aspect ratio.
   * The canvas pixel buffer may be larger (e.g., 3x for quality) — CSS scales it down.
   */
  private _fitCanvasToContainer(retries: number = 0): void {
    if (!this._useBitmapFont || !this._bitmapFontRenderer) {
      // System font: no scaling needed, canvas pixels = display pixels
      this._canvas.style.width = '';
      this._canvas.style.height = '';
      return;
    }

    const containerW = this._container.clientWidth;
    const containerH = this._container.clientHeight;
    if ((containerW === 0 || containerH === 0) && retries < 3) {
      // Container not laid out yet — retry after the browser completes layout.
      // This handles the race where open() + setUseBitmapFont() runs before
      // the container has non-zero dimensions (e.g., display:none → display:flex).
      requestAnimationFrame(() => this._fitCanvasToContainer(retries + 1));
      return;
    }

    // Native (1x) dimensions of the terminal
    const nativeW = this._bitmapFontRenderer.charWidth * this._cols;
    const nativeH = this._bitmapFontRenderer.charHeight * this._rows;

    // Scale to fit container, maintaining aspect ratio
    const scaleW = containerW / nativeW;
    const scaleH = containerH / nativeH;
    const fitScale = Math.min(scaleW, scaleH);

    // Use integer pixel sizes to avoid sub-pixel blurriness
    const displayW = Math.floor(nativeW * fitScale);
    const displayH = Math.floor(nativeH * fitScale);

    this._canvas.style.width = displayW + 'px';
    this._canvas.style.height = displayH + 'px';
  }

  /** Resize the renderer */
  resize(cols: number, rows: number): void {
    this._cols = cols;
    this._rows = rows;
    this._renderState.resize(cols, rows);
    this._canvas.width = this.renderCellWidth * cols;
    this._canvas.height = this.renderCellHeight * rows;
    this._fitCanvasToContainer();
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
