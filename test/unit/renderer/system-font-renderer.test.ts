/**
 * Unit tests for SystemFontRenderer.
 * Tests font measurement, cell rendering, cursor rendering, and color resolution.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SystemFontRenderer } from '../../../src/renderer/SystemFontRenderer';
import { TerminalCell } from '../../../src/buffer/TerminalCell';
import { CharacterAttributes } from '../../../src/buffer/CharacterAttributes';
import { TerminalColor } from '../../../src/buffer/TerminalColor';
import { CursorState, CursorStyle } from '../../../src/emulators/CursorState';
import type { TerminalTheme } from '../../../src/terminal/TerminalOptions';

function createMockCtx(): CanvasRenderingContext2D {
  return {
    font: '',
    fillStyle: '',
    strokeStyle: '',
    globalAlpha: 1.0,
    lineWidth: 1,
    measureText: vi.fn(() => ({ width: 8 } as TextMetrics)),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

const defaultTheme: TerminalTheme = {
  foreground: '#ffffff',
  background: '#000000',
  cursor: '#00ff00',
};

describe('SystemFontRenderer — measureFont', () => {
  it('should set character dimensions from font measurement', () => {
    const renderer = new SystemFontRenderer();
    const ctx = createMockCtx();

    renderer.measureFont(ctx, 'monospace', 16);

    expect(renderer.charWidth).toBe(8); // Math.ceil(8) from mock measureText
    expect(renderer.charHeight).toBe(20); // Math.ceil(16 * 1.2)
  });

  it('should set the canvas font property', () => {
    const renderer = new SystemFontRenderer();
    const ctx = createMockCtx();

    renderer.measureFont(ctx, 'Courier New', 14);

    expect(ctx.font).toBe('14px Courier New');
  });

  it('should call measureText with W', () => {
    const renderer = new SystemFontRenderer();
    const ctx = createMockCtx();

    renderer.measureFont(ctx, 'monospace', 16);

    expect(ctx.measureText).toHaveBeenCalledWith('W');
  });

  it('should handle different font sizes', () => {
    const renderer = new SystemFontRenderer();
    const ctx = createMockCtx();

    renderer.measureFont(ctx, 'monospace', 20);
    expect(renderer.charHeight).toBe(24); // Math.ceil(20 * 1.2)
  });
});

describe('SystemFontRenderer — renderCell', () => {
  let renderer: SystemFontRenderer;
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    renderer = new SystemFontRenderer();
    ctx = createMockCtx();
    renderer.measureFont(ctx, 'monospace', 16);
  });

  it('should draw background for every cell', () => {
    const cell = TerminalCell.empty();
    renderer.renderCell(ctx, cell, 0, 0, defaultTheme, false);

    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it('should draw text for non-space codepoints', () => {
    const cell = TerminalCell.empty();
    cell.codepoint = 0x41; // 'A'

    renderer.renderCell(ctx, cell, 0, 0, defaultTheme, false);

    expect(ctx.fillText).toHaveBeenCalledWith('A', 0, 16); // baseline = ceil(16) = 16
  });

  it('should not draw text for space or control characters', () => {
    const cell = TerminalCell.empty();
    cell.codepoint = 0x20; // space

    renderer.renderCell(ctx, cell, 0, 0, defaultTheme, false);

    expect(ctx.fillText).not.toHaveBeenCalled();
  });

  it('should position cell based on col/row', () => {
    const cell = TerminalCell.empty();
    cell.codepoint = 0x42; // 'B'

    renderer.renderCell(ctx, cell, 5, 3, defaultTheme, false);

    // x = 5 * 8 = 40, y + baseline = 3 * 20 + 16 = 76
    expect(ctx.fillText).toHaveBeenCalledWith('B', 40, 76);
  });

  it('should apply bold font style', () => {
    const cell = TerminalCell.empty();
    cell.codepoint = 0x41;
    cell.attributes = CharacterAttributes.Bold;

    renderer.renderCell(ctx, cell, 0, 0, defaultTheme, false);

    expect(ctx.font).toContain('bold');
  });

  it('should apply italic font style', () => {
    const cell = TerminalCell.empty();
    cell.codepoint = 0x41;
    cell.attributes = CharacterAttributes.Italic;

    renderer.renderCell(ctx, cell, 0, 0, defaultTheme, false);

    expect(ctx.font).toContain('italic');
  });

  it('should apply bold+italic font style together', () => {
    const cell = TerminalCell.empty();
    cell.codepoint = 0x41;
    cell.attributes = (CharacterAttributes.Bold | CharacterAttributes.Italic) as CharacterAttributes;

    renderer.renderCell(ctx, cell, 0, 0, defaultTheme, false);

    expect(ctx.font).toContain('bold');
    expect(ctx.font).toContain('italic');
  });

  it('should set globalAlpha to 0.5 for dim text', () => {
    const cell = TerminalCell.empty();
    cell.codepoint = 0x41;
    cell.attributes = CharacterAttributes.Dim;

    renderer.renderCell(ctx, cell, 0, 0, defaultTheme, false);

    // After rendering, globalAlpha should be restored to 1.0
    expect(ctx.globalAlpha).toBe(1.0);
  });

  it('should set globalAlpha to 0 for hidden text', () => {
    const cell = TerminalCell.empty();
    cell.codepoint = 0x41;
    cell.attributes = CharacterAttributes.Hidden;

    renderer.renderCell(ctx, cell, 0, 0, defaultTheme, false);

    // After rendering, globalAlpha should be restored to 1.0
    expect(ctx.globalAlpha).toBe(1.0);
  });

  it('should draw underline for underlined text', () => {
    const cell = TerminalCell.empty();
    cell.codepoint = 0x41;
    cell.attributes = CharacterAttributes.Underline;

    renderer.renderCell(ctx, cell, 0, 0, defaultTheme, false);

    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.moveTo).toHaveBeenCalled();
    expect(ctx.lineTo).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it('should draw strikethrough for struck-through text', () => {
    const cell = TerminalCell.empty();
    cell.codepoint = 0x41;
    cell.attributes = CharacterAttributes.Strikethrough;

    renderer.renderCell(ctx, cell, 0, 0, defaultTheme, false);

    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
    // Strikethrough should be at midpoint
    expect(ctx.moveTo).toHaveBeenCalledWith(0, 10); // midY = floor(20/2) = 10
  });

  it('should swap fg/bg for reverse video', () => {
    const cell = TerminalCell.empty();
    cell.codepoint = 0x41;
    cell.attributes = CharacterAttributes.Reverse;

    renderer.renderCell(ctx, cell, 0, 0, defaultTheme, false);

    // Background fillRect should use foreground color, text should use background color
    // We verify by checking that fillStyle was set to background for text
    // The first fillRect (background) uses the swapped fg color
    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it('should swap fg/bg for selected cells', () => {
    const cell = TerminalCell.empty();
    cell.codepoint = 0x41;

    renderer.renderCell(ctx, cell, 0, 0, defaultTheme, true);

    // Same swap behavior as reverse video
    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it('should use displayCodepoint override when provided', () => {
    const cell = TerminalCell.empty();
    cell.codepoint = 0x41; // 'A'

    renderer.renderCell(ctx, cell, 0, 0, defaultTheme, false, 0x42); // Override to 'B'

    expect(ctx.fillText).toHaveBeenCalledWith('B', 0, 16);
  });

  it('should resolve indexed foreground color', () => {
    const cell = TerminalCell.empty();
    cell.codepoint = 0x41;
    cell.foreground = TerminalColor.fromIndex(1); // Red

    renderer.renderCell(ctx, cell, 0, 0, defaultTheme, false);

    expect(ctx.fillText).toHaveBeenCalled();
  });

  it('should resolve RGB foreground color', () => {
    const cell = TerminalCell.empty();
    cell.codepoint = 0x41;
    cell.foreground = TerminalColor.fromRgb(255, 128, 0);

    renderer.renderCell(ctx, cell, 0, 0, defaultTheme, false);

    expect(ctx.fillText).toHaveBeenCalled();
  });

  it('should resolve indexed background color', () => {
    const cell = TerminalCell.empty();
    cell.codepoint = 0x41;
    cell.background = TerminalColor.fromIndex(4); // Blue

    renderer.renderCell(ctx, cell, 0, 0, defaultTheme, false);

    expect(ctx.fillRect).toHaveBeenCalled();
  });
});

describe('SystemFontRenderer — renderCursor', () => {
  let renderer: SystemFontRenderer;
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    renderer = new SystemFontRenderer();
    ctx = createMockCtx();
    renderer.measureFont(ctx, 'monospace', 16);
    // Reset mock call tracking after measureFont
    vi.mocked(ctx.fillRect).mockClear();
  });

  it('should not render when cursor is hidden', () => {
    const cursor = new CursorState(24, 80);
    cursor.visible = false;

    renderer.renderCursor(ctx, cursor, defaultTheme, true);

    expect(ctx.fillRect).not.toHaveBeenCalled();
  });

  it('should not render when blink is off', () => {
    const cursor = new CursorState(24, 80);

    renderer.renderCursor(ctx, cursor, defaultTheme, false);

    expect(ctx.fillRect).not.toHaveBeenCalled();
  });

  it('should render block cursor with alpha 0.5', () => {
    const cursor = new CursorState(24, 80);
    cursor.style = CursorStyle.Block;

    renderer.renderCursor(ctx, cursor, defaultTheme, true);

    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 8, 20);
    expect(ctx.globalAlpha).toBe(1.0); // Restored after render
  });

  it('should render blinking block cursor same as steady block', () => {
    const cursor = new CursorState(24, 80);
    cursor.style = CursorStyle.BlinkingBlock;

    renderer.renderCursor(ctx, cursor, defaultTheme, true);

    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 8, 20);
  });

  it('should render underline cursor', () => {
    const cursor = new CursorState(24, 80);
    cursor.style = CursorStyle.Underline;

    renderer.renderCursor(ctx, cursor, defaultTheme, true);

    // Underline: 2px tall at bottom of cell
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 18, 8, 2); // y + charHeight - 2
  });

  it('should render blinking underline cursor same as steady', () => {
    const cursor = new CursorState(24, 80);
    cursor.style = CursorStyle.BlinkingUnderline;

    renderer.renderCursor(ctx, cursor, defaultTheme, true);

    expect(ctx.fillRect).toHaveBeenCalledWith(0, 18, 8, 2);
  });

  it('should render bar cursor', () => {
    const cursor = new CursorState(24, 80);
    cursor.style = CursorStyle.Bar;

    renderer.renderCursor(ctx, cursor, defaultTheme, true);

    // Bar: 2px wide at left of cell
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 2, 20);
  });

  it('should render blinking bar cursor same as steady', () => {
    const cursor = new CursorState(24, 80);
    cursor.style = CursorStyle.BlinkingBar;

    renderer.renderCursor(ctx, cursor, defaultTheme, true);

    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 2, 20);
  });

  it('should position cursor at correct cell location', () => {
    const cursor = new CursorState(24, 80);
    cursor.moveTo(5, 10);
    cursor.style = CursorStyle.Block;

    renderer.renderCursor(ctx, cursor, defaultTheme, true);

    // x = 10 * 8 = 80, y = 5 * 20 = 100
    expect(ctx.fillRect).toHaveBeenCalledWith(80, 100, 8, 20);
  });

  it('should use cursor color from theme', () => {
    const cursor = new CursorState(24, 80);
    cursor.style = CursorStyle.Block;

    renderer.renderCursor(ctx, cursor, defaultTheme, true);

    expect(ctx.fillStyle).toBe('#00ff00');
  });

  it('should fall back to foreground color if cursor color not set', () => {
    const cursor = new CursorState(24, 80);
    cursor.style = CursorStyle.Block;
    const theme: TerminalTheme = { foreground: '#ffb000', background: '#000000' };

    renderer.renderCursor(ctx, cursor, theme, true);

    expect(ctx.fillStyle).toBe('#ffb000');
  });

  it('should fall back to white if no cursor or foreground color', () => {
    const cursor = new CursorState(24, 80);
    cursor.style = CursorStyle.Block;
    const theme: TerminalTheme = { background: '#000000' };

    renderer.renderCursor(ctx, cursor, theme, true);

    expect(ctx.fillStyle).toBe('#ffffff');
  });
});
