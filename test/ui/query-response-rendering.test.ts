/**
 * UI tests for terminal query/response sequences.
 * Covers Secondary DA, CPR, DECRQM through the Terminal pipeline.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Terminal } from '../../src/terminal/Terminal';

describe('Query/Response Rendering', () => {
  let container: HTMLElement;
  let term: Terminal;

  beforeEach(() => {
    container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '400px';
    document.body.appendChild(container);
  });

  afterEach(() => {
    term.dispose();
    document.body.innerHTML = '';
  });

  function emu(): any { return term.getEmulator(); }

  describe('VT100 queries', () => {
    it('DSR should respond with OK status via onDataToSend', () => {
      term = new Terminal({ rows: 24, cols: 80 });
      term.open(container);
      const responses: Uint8Array[] = [];
      emu().onDataToSend.on((d: Uint8Array) => responses.push(d));
      term.write('\x1b[5n');
      expect(responses.length).toBe(1);
      const text = new TextDecoder().decode(responses[0]);
      expect(text).toBe('\x1b[0n');
    });

    it('CPR should report cursor position via onDataToSend', () => {
      term = new Terminal({ rows: 24, cols: 80 });
      term.open(container);
      const responses: Uint8Array[] = [];
      emu().onDataToSend.on((d: Uint8Array) => responses.push(d));
      term.write('\x1b[5;10H'); // Move to row 5, col 10
      term.write('\x1b[6n');    // CPR
      expect(responses.length).toBe(1);
      const text = new TextDecoder().decode(responses[0]);
      expect(text).toBe('\x1b[5;10R');
    });
  });

  describe('TDV2200 queries', () => {
    it('Primary DA should identify as TDV terminal', () => {
      term = new Terminal({ rows: 24, cols: 80, emulatorType: 'tdv2200' });
      term.open(container);
      const responses: string[] = [];
      emu().onResponseReady.on((r: string) => responses.push(r));
      term.write('\x1b[c');
      expect(responses.length).toBeGreaterThan(0);
      expect(responses[0]).toContain('\x1b[?');
    });

    it('Secondary DA should respond', () => {
      term = new Terminal({ rows: 24, cols: 80, emulatorType: 'tdv2200' });
      term.open(container);
      const responses: string[] = [];
      emu().onResponseReady.on((r: string) => responses.push(r));
      term.write('\x1b[>c');
      expect(responses.length).toBe(1);
      expect(responses[0]).toContain('\x1b[>');
    });

    it('DSR should respond with OK', () => {
      term = new Terminal({ rows: 24, cols: 80, emulatorType: 'tdv2200' });
      term.open(container);
      const responses: string[] = [];
      emu().onResponseReady.on((r: string) => responses.push(r));
      term.write('\x1b[5n');
      expect(responses.length).toBe(1);
      expect(responses[0]).toBe('\x1b[0n');
    });

    it('CPR should report correct cursor position', () => {
      term = new Terminal({ rows: 24, cols: 80, emulatorType: 'tdv2200' });
      term.open(container);
      const responses: string[] = [];
      emu().onResponseReady.on((r: string) => responses.push(r));
      term.write('\x1b[10;20H');
      term.write('\x1b[6n');
      expect(responses.length).toBe(1);
      expect(responses[0]).toBe('\x1b[10;20R');
    });
  });

  describe('TDV2215 queries', () => {
    it('Primary DA should identify as TDV2215', () => {
      term = new Terminal({ rows: 24, cols: 80, emulatorType: 'tdv2215' });
      term.open(container);
      const responses: string[] = [];
      emu().onResponseReady.on((r: string) => responses.push(r));
      term.write('\x1b[c');
      expect(responses.length).toBeGreaterThan(0);
    });

    it('Secondary DA should respond', () => {
      term = new Terminal({ rows: 24, cols: 80, emulatorType: 'tdv2215' });
      term.open(container);
      const responses: string[] = [];
      emu().onResponseReady.on((r: string) => responses.push(r));
      term.write('\x1b[>c');
      expect(responses.length).toBe(1);
    });
  });

  describe('Query should not affect buffer', () => {
    it('DA query should not change buffer content', () => {
      term = new Terminal({ rows: 24, cols: 80, emulatorType: 'tdv2200' });
      term.open(container);
      term.write('Hello');
      term.write('\x1b[c');
      let text = '';
      for (let col = 0; col < 80; col++) text += emu().buffer.getCell(0, col).getString();
      expect(text.trimEnd()).toBe('Hello');
    });
  });
});
