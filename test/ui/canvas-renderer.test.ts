/**
 * UI tests for CanvasRenderer — DOM structure and rendering pipeline.
 * Uses happy-dom which provides a mock Canvas2D context.
 * Runs in happy-dom environment.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CanvasRenderer } from '../../src/renderer/CanvasRenderer';
import { TerminalBuffer } from '../../src/buffer/TerminalBuffer';
import { CursorState } from '../../src/emulators/CursorState';
import { Themes } from '../../src/terminal/TerminalOptions';

describe('CanvasRenderer', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '400px';
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should create canvas element in container', () => {
    const renderer = new CanvasRenderer(container, 80, 24, Themes.green);
    expect(container.querySelector('canvas')).not.toBeNull();
    renderer.dispose();
  });

  it('should set canvas CSS to fill container', () => {
    const renderer = new CanvasRenderer(container, 80, 24, Themes.green);
    const canvas = renderer.canvas;
    expect(canvas.style.width).toBe('100%');
    expect(canvas.style.height).toBe('100%');
    renderer.dispose();
  });

  it('should set canvas class name', () => {
    const renderer = new CanvasRenderer(container, 80, 24, Themes.green);
    expect(renderer.canvas.className).toContain('retroterm-canvas');
    renderer.dispose();
  });

  it('should make canvas focusable (tabIndex=0)', () => {
    const renderer = new CanvasRenderer(container, 80, 24, Themes.green);
    expect(renderer.canvas.tabIndex).toBe(0);
    renderer.dispose();
  });

  it('should set canvas native dimensions based on font metrics', () => {
    const renderer = new CanvasRenderer(container, 80, 24, Themes.green);
    // Canvas width should be charWidth * cols, height = charHeight * rows
    expect(renderer.canvas.width).toBe(renderer.charWidth * 80);
    expect(renderer.canvas.height).toBe(renderer.charHeight * 24);
    renderer.dispose();
  });

  it('should render without errors', () => {
    const renderer = new CanvasRenderer(container, 80, 24, Themes.green);
    const buffer = new TerminalBuffer(80, 24);
    const cursor = new CursorState(80, 24);

    // Write some text to the buffer
    const text = 'Hello';
    for (let i = 0; i < text.length; i++) {
      const cell = buffer.getCellRef(0, i);
      cell.codepoint = text.charCodeAt(i);
    }

    renderer.invalidate();
    renderer.render(buffer, cursor);
    // Should not throw
    renderer.dispose();
  });

  it('should resize canvas on resize()', () => {
    const renderer = new CanvasRenderer(container, 80, 24, Themes.green);
    const origWidth = renderer.canvas.width;

    renderer.resize(40, 12);
    expect(renderer.canvas.width).toBeLessThan(origWidth);

    renderer.dispose();
  });

  it('should update theme', () => {
    const renderer = new CanvasRenderer(container, 80, 24, Themes.green);
    // Should not throw
    renderer.setTheme(Themes.amber);
    renderer.dispose();
  });

  it('should remove canvas from DOM on dispose', () => {
    const renderer = new CanvasRenderer(container, 80, 24, Themes.green);
    expect(container.querySelector('canvas')).not.toBeNull();
    renderer.dispose();
    expect(container.querySelector('canvas')).toBeNull();
  });

  it('should render dirty rows only', () => {
    const renderer = new CanvasRenderer(container, 80, 24, Themes.green);
    const buffer = new TerminalBuffer(80, 24);
    const cursor = new CursorState(80, 24);

    // Full render first
    renderer.invalidate();
    renderer.render(buffer, cursor);

    // Then dirty render — should not throw
    renderer.renderDirty(buffer, cursor);

    renderer.dispose();
  });
});
