/**
 * VT100 system font rendering validation tests.
 * Verifies that the CanvasRenderer + SystemFontRenderer actually produce
 * visible canvas output — fillText, fillRect, stroke calls — not just buffer state.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Terminal } from '../../src/terminal/Terminal';
import { SystemFontRenderer } from '../../src/renderer/SystemFontRenderer';
import { TerminalCell } from '../../src/buffer/TerminalCell';
import { CharacterAttributes } from '../../src/buffer/CharacterAttributes';
import { TerminalColor } from '../../src/buffer/TerminalColor';
import { CursorState, CursorStyle } from '../../src/emulators/CursorState';
import type { TerminalTheme } from '../../src/terminal/TerminalOptions';

function createMockCtx() {
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

const theme: TerminalTheme = {
  foreground: '#ffffff',
  background: '#000000',
  cursor: '#00ff00',
};

describe('VT100 Rendering Validation', () => {
  describe('SystemFontRenderer — ASCII rendering', () => {
    it('should call fillText for printable ASCII characters', () => {
      const renderer = new SystemFontRenderer();
      const ctx = createMockCtx();
      renderer.measureFont(ctx, 'monospace', 16);

      // Write A-Z
      for (let i = 0; i < 26; i++) {
        const cell = new TerminalCell(0x41 + i);
        renderer.renderCell(ctx, cell, i, 0, theme, false);
      }

      const fillText = ctx.fillText as ReturnType<typeof vi.fn>;
      expect(fillText).toHaveBeenCalledTimes(26);
      expect(fillText.mock.calls[0][0]).toBe('A');
      expect(fillText.mock.calls[25][0]).toBe('Z');
    });

    it('should not call fillText for space characters', () => {
      const renderer = new SystemFontRenderer();
      const ctx = createMockCtx();
      renderer.measureFont(ctx, 'monospace', 16);

      const cell = new TerminalCell(0x20); // space
      renderer.renderCell(ctx, cell, 0, 0, theme, false);

      const fillText = ctx.fillText as ReturnType<typeof vi.fn>;
      expect(fillText).not.toHaveBeenCalled();
    });

    it('should call fillRect for background of every cell', () => {
      const renderer = new SystemFontRenderer();
      const ctx = createMockCtx();
      renderer.measureFont(ctx, 'monospace', 16);

      const cell = new TerminalCell(0x41); // 'A'
      renderer.renderCell(ctx, cell, 0, 0, theme, false);

      const fillRect = ctx.fillRect as ReturnType<typeof vi.fn>;
      expect(fillRect).toHaveBeenCalled();
    });
  });

  describe('SystemFontRenderer — Character attributes', () => {
    it('bold should appear in font string', () => {
      const renderer = new SystemFontRenderer();
      const ctx = createMockCtx();
      renderer.measureFont(ctx, 'monospace', 16);

      const cell = new TerminalCell(0x41);
      cell.attributes = CharacterAttributes.Bold;
      renderer.renderCell(ctx, cell, 0, 0, theme, false);

      expect(ctx.font).toContain('bold');
    });

    it('italic should appear in font string', () => {
      const renderer = new SystemFontRenderer();
      const ctx = createMockCtx();
      renderer.measureFont(ctx, 'monospace', 16);

      const cell = new TerminalCell(0x41);
      cell.attributes = CharacterAttributes.Italic;
      renderer.renderCell(ctx, cell, 0, 0, theme, false);

      expect(ctx.font).toContain('italic');
    });

    it('underline should produce stroke calls', () => {
      const renderer = new SystemFontRenderer();
      const ctx = createMockCtx();
      renderer.measureFont(ctx, 'monospace', 16);

      const cell = new TerminalCell(0x41);
      cell.attributes = CharacterAttributes.Underline;
      renderer.renderCell(ctx, cell, 0, 0, theme, false);

      const stroke = ctx.stroke as ReturnType<typeof vi.fn>;
      expect(stroke).toHaveBeenCalled();
    });

    it('strikethrough should produce stroke calls at midpoint', () => {
      const renderer = new SystemFontRenderer();
      const ctx = createMockCtx();
      renderer.measureFont(ctx, 'monospace', 16);

      const cell = new TerminalCell(0x41);
      cell.attributes = CharacterAttributes.Strikethrough;
      renderer.renderCell(ctx, cell, 0, 0, theme, false);

      const stroke = ctx.stroke as ReturnType<typeof vi.fn>;
      expect(stroke).toHaveBeenCalled();
    });

    it('dim should set globalAlpha to 0.5', () => {
      const renderer = new SystemFontRenderer();
      const ctx = createMockCtx();
      renderer.measureFont(ctx, 'monospace', 16);

      const cell = new TerminalCell(0x41);
      cell.attributes = CharacterAttributes.Dim;

      // Track globalAlpha during fillText
      let alphaAtFillText = 1.0;
      (ctx.fillText as ReturnType<typeof vi.fn>).mockImplementation(() => {
        alphaAtFillText = ctx.globalAlpha;
      });

      renderer.renderCell(ctx, cell, 0, 0, theme, false);
      expect(alphaAtFillText).toBe(0.5);
      // Should be restored after
      expect(ctx.globalAlpha).toBe(1.0);
    });

    it('hidden should set globalAlpha to 0', () => {
      const renderer = new SystemFontRenderer();
      const ctx = createMockCtx();
      renderer.measureFont(ctx, 'monospace', 16);

      const cell = new TerminalCell(0x41);
      cell.attributes = CharacterAttributes.Hidden;

      let alphaAtFillText = 1.0;
      (ctx.fillText as ReturnType<typeof vi.fn>).mockImplementation(() => {
        alphaAtFillText = ctx.globalAlpha;
      });

      renderer.renderCell(ctx, cell, 0, 0, theme, false);
      expect(alphaAtFillText).toBe(0);
    });

    it('reverse video should swap foreground and background', () => {
      const renderer = new SystemFontRenderer();
      const ctx = createMockCtx();
      renderer.measureFont(ctx, 'monospace', 16);

      const cell = new TerminalCell(0x41);
      cell.attributes = CharacterAttributes.Reverse;

      let bgColor = '';
      let fgColor = '';
      const fillRect = ctx.fillRect as ReturnType<typeof vi.fn>;
      fillRect.mockImplementation(() => {
        bgColor = ctx.fillStyle;
      });
      (ctx.fillText as ReturnType<typeof vi.fn>).mockImplementation(() => {
        fgColor = ctx.fillStyle;
      });

      renderer.renderCell(ctx, cell, 0, 0, theme, false);
      // In reverse: background gets foreground color, text gets background color
      expect(bgColor).toBe('#ffffff'); // foreground used as bg
      expect(fgColor).toBe('#000000'); // background used as fg
    });
  });

  describe('SystemFontRenderer — Cursor styles', () => {
    it('block cursor should use fillRect at full cell size', () => {
      const renderer = new SystemFontRenderer();
      const ctx = createMockCtx();
      renderer.measureFont(ctx, 'monospace', 16);

      const cursor = new CursorState();
      cursor.row = 0;
      cursor.column = 0;
      cursor.visible = true;
      cursor.style = CursorStyle.Block;

      renderer.renderCursor(ctx, cursor, theme, true);

      const fillRect = ctx.fillRect as ReturnType<typeof vi.fn>;
      expect(fillRect).toHaveBeenCalled();
      const call = fillRect.mock.calls[0];
      expect(call[2]).toBe(renderer.charWidth); // full width
      expect(call[3]).toBe(renderer.charHeight); // full height
    });

    it('underline cursor should produce thin fillRect at bottom', () => {
      const renderer = new SystemFontRenderer();
      const ctx = createMockCtx();
      renderer.measureFont(ctx, 'monospace', 16);

      const cursor = new CursorState();
      cursor.row = 0;
      cursor.column = 0;
      cursor.visible = true;
      cursor.style = CursorStyle.Underline;

      renderer.renderCursor(ctx, cursor, theme, true);

      const fillRect = ctx.fillRect as ReturnType<typeof vi.fn>;
      expect(fillRect).toHaveBeenCalled();
      const call = fillRect.mock.calls[0];
      expect(call[2]).toBe(renderer.charWidth); // full width
      expect(call[3]).toBe(2); // thin height
    });

    it('bar cursor should produce thin fillRect at left', () => {
      const renderer = new SystemFontRenderer();
      const ctx = createMockCtx();
      renderer.measureFont(ctx, 'monospace', 16);

      const cursor = new CursorState();
      cursor.row = 0;
      cursor.column = 0;
      cursor.visible = true;
      cursor.style = CursorStyle.Bar;

      renderer.renderCursor(ctx, cursor, theme, true);

      const fillRect = ctx.fillRect as ReturnType<typeof vi.fn>;
      expect(fillRect).toHaveBeenCalled();
      const call = fillRect.mock.calls[0];
      expect(call[2]).toBe(2); // thin width
      expect(call[3]).toBe(renderer.charHeight); // full height
    });

    it('should not render cursor when blink is off', () => {
      const renderer = new SystemFontRenderer();
      const ctx = createMockCtx();
      renderer.measureFont(ctx, 'monospace', 16);

      const cursor = new CursorState();
      cursor.visible = true;
      cursor.style = CursorStyle.Block;

      renderer.renderCursor(ctx, cursor, theme, false); // blink off

      const fillRect = ctx.fillRect as ReturnType<typeof vi.fn>;
      expect(fillRect).not.toHaveBeenCalled();
    });

    it('should not render hidden cursor', () => {
      const renderer = new SystemFontRenderer();
      const ctx = createMockCtx();
      renderer.measureFont(ctx, 'monospace', 16);

      const cursor = new CursorState();
      cursor.visible = false;
      cursor.style = CursorStyle.Block;

      renderer.renderCursor(ctx, cursor, theme, true);

      const fillRect = ctx.fillRect as ReturnType<typeof vi.fn>;
      expect(fillRect).not.toHaveBeenCalled();
    });
  });

  describe('VT100 — DEC Special Graphics rendering', () => {
    let container: HTMLElement;
    let term: Terminal;

    beforeEach(() => {
      container = document.createElement('div');
      container.style.width = '800px';
      container.style.height = '400px';
      document.body.appendChild(container);
      term = new Terminal({ rows: 24, cols: 80, emulatorType: 'vt100' });
      term.open(container);
    });

    afterEach(() => {
      term.dispose();
      document.body.innerHTML = '';
    });

    it('ESC(0 should activate DEC Special Graphics', () => {
      term.write('\x1b(0');
      // Write 'a' (0x61) which should map to ▒ (0x2592)
      term.write('a');
      const emu = term.getEmulator() as any;
      const cell = emu.buffer.getCellRef(0, 0);
      expect(cell.codepoint).toBe(0x2592);
    });

    it('ESC(B should reset to US ASCII', () => {
      term.write('\x1b(0');
      term.write('\x1b(B');
      term.write('a');
      const emu = term.getEmulator() as any;
      const cell = emu.buffer.getCellRef(0, 0);
      expect(cell.codepoint).toBe(0x61); // 'a' unchanged
    });
  });

  describe('Theme colors', () => {
    it('should use theme foreground and background colors', () => {
      const renderer = new SystemFontRenderer();
      const ctx = createMockCtx();
      renderer.measureFont(ctx, 'monospace', 16);

      const customTheme: TerminalTheme = {
        foreground: '#00ff00',
        background: '#0000ff',
      };

      const cell = new TerminalCell(0x41);
      const fillRect = ctx.fillRect as ReturnType<typeof vi.fn>;
      let bgUsed = '';
      fillRect.mockImplementation(() => { bgUsed = ctx.fillStyle; });
      let fgUsed = '';
      (ctx.fillText as ReturnType<typeof vi.fn>).mockImplementation(() => { fgUsed = ctx.fillStyle; });

      renderer.renderCell(ctx, cell, 0, 0, customTheme, false);

      expect(bgUsed).toBe('#0000ff');
      expect(fgUsed).toBe('#00ff00');
    });
  });

  describe('Display codepoint override', () => {
    it('should use displayCodepoint when provided', () => {
      const renderer = new SystemFontRenderer();
      const ctx = createMockCtx();
      renderer.measureFont(ctx, 'monospace', 16);

      const cell = new TerminalCell(0x60); // backtick
      // Override display to diamond
      renderer.renderCell(ctx, cell, 0, 0, theme, false, 0x25C6);

      const fillText = ctx.fillText as ReturnType<typeof vi.fn>;
      expect(fillText).toHaveBeenCalledTimes(1);
      expect(fillText.mock.calls[0][0]).toBe(String.fromCodePoint(0x25C6));
    });
  });
});
