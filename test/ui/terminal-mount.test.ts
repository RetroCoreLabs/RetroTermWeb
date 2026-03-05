/**
 * UI tests for Terminal lifecycle — mounting, opening, and disposing.
 * Runs in happy-dom environment.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Terminal } from '../../src/terminal/Terminal';
import { Themes } from '../../src/terminal/TerminalOptions';

describe('Terminal mounting', () => {
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

  it('should create terminal with default options', () => {
    const term = new Terminal();
    expect(term.cols).toBe(80);
    expect(term.rows).toBe(24);
    term.dispose();
  });

  it('should create terminal with custom dimensions', () => {
    const term = new Terminal({ cols: 132, rows: 43 });
    expect(term.cols).toBe(132);
    expect(term.rows).toBe(43);
    term.dispose();
  });

  it('should mount canvas into container on open()', () => {
    const term = new Terminal({ rows: 24, cols: 80 });
    term.open(container);

    const canvas = container.querySelector('canvas');
    expect(canvas).not.toBeNull();
    expect(canvas!.className).toContain('retroterm-canvas');
    expect(canvas!.tabIndex).toBe(0);

    term.dispose();
  });

  it('should set element property after open()', () => {
    const term = new Terminal();
    expect(term.element).toBeNull();

    term.open(container);
    expect(term.element).toBe(container);

    term.dispose();
  });

  it('should remove canvas on dispose()', () => {
    const term = new Terminal();
    term.open(container);

    const canvas = container.querySelector('canvas');
    expect(canvas).not.toBeNull();

    term.dispose();
    expect(container.querySelector('canvas')).toBeNull();
  });

  it('should set element to null on dispose()', () => {
    const term = new Terminal();
    term.open(container);
    term.dispose();
    expect(term.element).toBeNull();
  });

  it('should throw if open() called after dispose()', () => {
    const term = new Terminal();
    term.dispose();
    expect(() => term.open(container)).toThrow('disposed');
  });

  it('should accept custom theme', () => {
    const term = new Terminal({ theme: Themes.amber });
    term.open(container);
    // No error, theme applied
    term.dispose();
  });

  it('should accept custom font settings', () => {
    const term = new Terminal({
      fontFamily: "'Courier New', monospace",
      fontSize: 14,
    });
    term.open(container);
    term.dispose();
  });
});
