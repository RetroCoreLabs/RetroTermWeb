/**
 * UI tests for Terminal resize behavior.
 * Runs in happy-dom environment.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Terminal, FitAddon } from '../../src/terminal/Terminal';

describe('Terminal resize', () => {
  let container: HTMLElement;
  let term: Terminal;

  beforeEach(() => {
    container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '400px';
    document.body.appendChild(container);
    term = new Terminal({ rows: 24, cols: 80 });
    term.open(container);
  });

  afterEach(() => {
    term.dispose();
    document.body.innerHTML = '';
  });

  it('should update cols and rows on resize', () => {
    term.resize(132, 43);
    expect(term.cols).toBe(132);
    expect(term.rows).toBe(43);
  });

  it('should resize the canvas dimensions', () => {
    const canvas = container.querySelector('canvas')!;
    const origWidth = canvas.width;
    const origHeight = canvas.height;

    term.resize(40, 12);

    // Canvas should be smaller after resize to fewer cols/rows
    expect(canvas.width).toBeLessThan(origWidth);
    expect(canvas.height).toBeLessThan(origHeight);
  });

  it('should preserve buffer content after resize', () => {
    term.write('Hello');
    term.resize(132, 43);

    const emu = term.getEmulator();
    expect(emu.buffer.getCell(0, 0).codepoint).toBe('H'.charCodeAt(0));
  });

  it('should resize emulator buffer', () => {
    term.resize(40, 12);

    const emu = term.getEmulator();
    expect(emu.buffer.width).toBe(40);
    expect(emu.buffer.height).toBe(12);
  });
});

describe('FitAddon', () => {
  it('should create FitAddon instance', () => {
    const addon = new FitAddon();
    expect(addon).toBeDefined();
    addon.dispose();
  });

  it('should return undefined dimensions without terminal', () => {
    const addon = new FitAddon();
    expect(addon.proposeDimensions()).toBeUndefined();
    addon.dispose();
  });
});
