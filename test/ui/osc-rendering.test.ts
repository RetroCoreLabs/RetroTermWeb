/**
 * UI tests for OSC (Operating System Command) sequences.
 * Covers window title setting via OSC 0 and OSC 2.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Terminal } from '../../src/terminal/Terminal';

describe('OSC Rendering', () => {
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

  function emu(): any { return term.getEmulator(); }

  describe('Window title (OSC 2)', () => {
    it('OSC 2 with BEL terminator should set title', () => {
      term.write('\x1b]2;My Terminal\x07');
      expect(emu().title).toBe('My Terminal');
    });

    it('OSC 2 with ST terminator should set title', () => {
      term.write('\x1b]2;My Terminal\x1b\\');
      expect(emu().title).toBe('My Terminal');
    });

    it('should update title on subsequent OSC 2', () => {
      term.write('\x1b]2;First\x07');
      expect(emu().title).toBe('First');
      term.write('\x1b]2;Second\x07');
      expect(emu().title).toBe('Second');
    });

    it('should fire onTitleChanged event', () => {
      const titles: string[] = [];
      emu().onTitleChanged.on((t: string) => titles.push(t));
      term.write('\x1b]2;EventTitle\x07');
      expect(titles).toContain('EventTitle');
    });

    it('should handle empty title', () => {
      term.write('\x1b]2;Title\x07');
      term.write('\x1b]2;\x07');
      expect(emu().title).toBe('');
    });
  });

  describe('Window + icon title (OSC 0)', () => {
    it('OSC 0 should set title', () => {
      term.write('\x1b]0;Both Title\x07');
      expect(emu().title).toBe('Both Title');
    });
  });

  describe('OSC should not affect buffer content', () => {
    it('text before OSC should be in buffer', () => {
      term.write('Hello\x1b]2;Title\x07 World');
      const buf = emu().buffer;
      let text = '';
      for (let col = 0; col < 80; col++) text += buf.getCell(0, col).getString();
      expect(text.trimEnd()).toBe('Hello World');
    });
  });
});
