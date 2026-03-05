/**
 * UI tests for Terminal keyboard input handling.
 * Verifies key events fire correct callbacks with correct sequences.
 * Runs in happy-dom environment.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Terminal } from '../../src/terminal/Terminal';

describe('Terminal input', () => {
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

  function fireKeyDown(key: string, opts?: Partial<KeyboardEventInit>): void {
    const canvas = container.querySelector('canvas')!;
    const event = new KeyboardEvent('keydown', { key, bubbles: true, ...opts });
    canvas.dispatchEvent(event);
  }

  function fireKeyPress(key: string): void {
    const canvas = container.querySelector('canvas')!;
    const event = new KeyboardEvent('keypress', { key, bubbles: true });
    canvas.dispatchEvent(event);
  }

  it('should fire onKey for Enter', () => {
    let received: string | null = null;
    term.onKey((ev) => { received = ev.key; });

    fireKeyDown('Enter');
    expect(received).toBe('\r');
  });

  it('should fire onKey for Escape', () => {
    let received: string | null = null;
    term.onKey((ev) => { received = ev.key; });

    fireKeyDown('Escape');
    expect(received).toBe('\x1b');
  });

  it('should fire onKey for arrow keys', () => {
    const keys: string[] = [];
    term.onKey((ev) => { keys.push(ev.key); });

    fireKeyDown('ArrowUp');
    fireKeyDown('ArrowDown');
    fireKeyDown('ArrowRight');
    fireKeyDown('ArrowLeft');

    expect(keys).toEqual(['\x1b[A', '\x1b[B', '\x1b[C', '\x1b[D']);
  });

  it('should fire onKey for function keys', () => {
    const keys: string[] = [];
    term.onKey((ev) => { keys.push(ev.key); });

    fireKeyDown('F1');
    fireKeyDown('F5');
    fireKeyDown('F12');

    expect(keys[0]).toBe('\x1bOP');
    expect(keys[1]).toBe('\x1b[15~');
    expect(keys[2]).toBe('\x1b[24~');
  });

  it('should fire onKey for Ctrl+C', () => {
    let received: string | null = null;
    term.onKey((ev) => { received = ev.key; });

    fireKeyDown('c', { ctrlKey: true });
    expect(received).toBe('\x03');
  });

  it('should fire onKey for Backspace', () => {
    let received: string | null = null;
    term.onKey((ev) => { received = ev.key; });

    fireKeyDown('Backspace');
    expect(received).toBe('\x7F');
  });

  it('should fire onKey for Tab', () => {
    let received: string | null = null;
    term.onKey((ev) => { received = ev.key; });

    fireKeyDown('Tab');
    expect(received).toBe('\t');
  });

  it('should fire onKey for regular character via keypress', () => {
    let received: string | null = null;
    term.onKey((ev) => { received = ev.key; });

    fireKeyPress('a');
    expect(received).toBe('a');
  });

  it('should provide domEvent in onKey callback', () => {
    let domEvent: KeyboardEvent | null = null;
    term.onKey((ev) => { domEvent = ev.domEvent; });

    fireKeyDown('Enter');
    expect(domEvent).not.toBeNull();
    expect(domEvent!.key).toBe('Enter');
  });

  it('should allow disposing onKey subscription', () => {
    let count = 0;
    const disposable = term.onKey(() => { count++; });

    fireKeyDown('Enter');
    expect(count).toBe(1);

    disposable.dispose();
    fireKeyDown('Enter');
    expect(count).toBe(1);
  });

  it('should fire onKey for navigation keys', () => {
    const keys: string[] = [];
    term.onKey((ev) => { keys.push(ev.key); });

    fireKeyDown('Home');
    fireKeyDown('End');
    fireKeyDown('PageUp');
    fireKeyDown('PageDown');
    fireKeyDown('Insert');
    fireKeyDown('Delete');

    expect(keys).toEqual([
      '\x1b[H', '\x1b[F',
      '\x1b[5~', '\x1b[6~',
      '\x1b[2~', '\x1b[3~',
    ]);
  });
});
