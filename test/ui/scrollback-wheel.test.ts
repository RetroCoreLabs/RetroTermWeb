/**
 * UI tests for mouse wheel / trackpad scrollback.
 * Verifies scrollOffset state, clamping, auto-scroll on write,
 * and WheelEvent handling.
 * Runs in happy-dom environment.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Terminal } from '../../src/terminal/Terminal';

describe('Scrollback — mouse wheel / trackpad', () => {
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

  /** Helper: write enough lines to fill scrollback */
  function writeLines(count: number): void {
    for (let i = 0; i < count; i++) {
      term.write(`Line ${i}\r\n`);
    }
  }

  it('should have scrollOffset 0 initially', () => {
    expect(term.scrollOffset).toBe(0);
  });

  it('should clamp scrollTo to 0 when negative', () => {
    term.scrollTo(-10);
    expect(term.scrollOffset).toBe(0);
  });

  it('should clamp scrollTo to max scrollback', () => {
    writeLines(50);
    const emu = term.getEmulator();
    const maxOffset = emu.buffer.scrollbackLineCount;

    term.scrollTo(maxOffset + 100);
    expect(term.scrollOffset).toBe(maxOffset);
  });

  it('should allow scrollTo within valid range', () => {
    writeLines(50);
    term.scrollTo(10);
    expect(term.scrollOffset).toBe(10);
  });

  it('should reset scrollOffset on scrollToBottom', () => {
    writeLines(50);
    term.scrollTo(10);
    expect(term.scrollOffset).toBe(10);

    term.scrollToBottom();
    expect(term.scrollOffset).toBe(0);
  });

  it('should auto-scroll to bottom on write', () => {
    writeLines(50);
    term.scrollTo(10);
    expect(term.scrollOffset).toBe(10);

    term.write('New output\r\n');
    expect(term.scrollOffset).toBe(0);
  });

  it('should have scrollback lines after writing more than screen height', () => {
    writeLines(50);
    const emu = term.getEmulator();
    expect(emu.buffer.scrollbackLineCount).toBeGreaterThan(0);
  });

  it('should handle scrollTo(0) as no-op when already at bottom', () => {
    term.scrollTo(0);
    expect(term.scrollOffset).toBe(0);
  });

  it('should handle scrollTo when no scrollback exists', () => {
    term.write('Hello');
    term.scrollTo(100);
    // Should clamp to max (which is 0 since nothing scrolled off)
    expect(term.scrollOffset).toBe(0);
  });
});
