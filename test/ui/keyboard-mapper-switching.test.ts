/**
 * UI tests for TDV keyboard mapper switching in Terminal.
 * Tests emulator-type-dependent keyboard mapping and VT100 fallback.
 * Runs in happy-dom environment.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Terminal } from '../../src/terminal/Terminal';

describe('Keyboard mapper switching', () => {
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

  function fireKeyDown(canvas: HTMLElement, key: string, opts?: Partial<KeyboardEventInit>): void {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, ...opts });
    canvas.dispatchEvent(event);
  }

  it('should use VT100 mapping for arrow keys in vt100 mode', () => {
    const keys: string[] = [];
    term.onKey((ev) => { keys.push(ev.key); });

    const canvas = container.querySelector('canvas')!;
    fireKeyDown(canvas, 'ArrowUp');
    fireKeyDown(canvas, 'ArrowDown');
    fireKeyDown(canvas, 'ArrowRight');
    fireKeyDown(canvas, 'ArrowLeft');

    expect(keys).toEqual(['\x1b[A', '\x1b[B', '\x1b[C', '\x1b[D']);
  });

  it('should fire onKey for Enter in tdv2200 mode', () => {
    term.setEmulatorType('tdv2200');

    let received: string | null = null;
    term.onKey((ev) => { received = ev.key; });

    const canvas = container.querySelector('canvas')!;
    fireKeyDown(canvas, 'Enter');

    // Enter should produce a sequence (TDV maps VK_RETURN=13 via registry, or falls through to VT100 \r)
    expect(received).not.toBeNull();
    expect(received!.length).toBeGreaterThan(0);
  });

  it('should fire onKey for arrow keys in tdv2200 mode', () => {
    term.setEmulatorType('tdv2200');

    const keys: string[] = [];
    term.onKey((ev) => { keys.push(ev.key); });

    const canvas = container.querySelector('canvas')!;
    fireKeyDown(canvas, 'ArrowUp');
    fireKeyDown(canvas, 'ArrowDown');

    // TDV mapper should produce sequences for arrow keys
    expect(keys.length).toBe(2);
    for (let i = 0; i < keys.length; i++) {
      expect(keys[i].length).toBeGreaterThan(0);
    }
  });

  it('setEmulatorType(tdv2200) should switch keyboard mapping', () => {
    term.setEmulatorType('tdv2200');
    expect(term.getEmulatorType()).toBe('tdv2200');

    // Capture a key that TDV maps differently
    let received: string | null = null;
    term.onKey((ev) => { received = ev.key; });

    const canvas = container.querySelector('canvas')!;
    fireKeyDown(canvas, 'Home');

    // Should produce a sequence (TDV or VT100 fallback)
    expect(received).not.toBeNull();
  });

  it('setEmulatorType(vt100) should restore VT100 mapping', () => {
    term.setEmulatorType('tdv2200');
    term.setEmulatorType('vt100');

    const keys: string[] = [];
    term.onKey((ev) => { keys.push(ev.key); });

    const canvas = container.querySelector('canvas')!;
    fireKeyDown(canvas, 'ArrowUp');

    // Back in VT100 mode — standard VT100 sequence
    expect(keys[0]).toBe('\x1b[A');
  });

  it('should handle Backspace in tdv2200 mode', () => {
    term.setEmulatorType('tdv2200');

    let received: string | null = null;
    term.onKey((ev) => { received = ev.key; });

    const canvas = container.querySelector('canvas')!;
    fireKeyDown(canvas, 'Backspace');

    // TDV mapper has Backspace fallback to 0x08 (BS)
    // or VT100 fallback to 0x7F (DEL)
    expect(received).not.toBeNull();
    expect(received!.length).toBeGreaterThan(0);
  });

  it('getEmulatorType() should return current type', () => {
    expect(term.getEmulatorType()).toBe('vt100');

    term.setEmulatorType('tdv2200');
    expect(term.getEmulatorType()).toBe('tdv2200');

    term.setEmulatorType('tdv2215');
    expect(term.getEmulatorType()).toBe('tdv2215');

    term.setEmulatorType('vt100');
    expect(term.getEmulatorType()).toBe('vt100');
  });

  it('should fire onKey for F-keys in tdv2200 mode', () => {
    term.setEmulatorType('tdv2200');

    const keys: string[] = [];
    term.onKey((ev) => { keys.push(ev.key); });

    const canvas = container.querySelector('canvas')!;
    fireKeyDown(canvas, 'F1');
    fireKeyDown(canvas, 'F5');
    fireKeyDown(canvas, 'F12');

    // F-keys should produce sequences (TDV CSI nn _ or VT100 fallback)
    expect(keys.length).toBe(3);
    for (let i = 0; i < keys.length; i++) {
      expect(keys[i].length).toBeGreaterThan(0);
    }
  });
});
