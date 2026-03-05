/**
 * UI tests for bell wiring in Terminal.
 * Tests BellHandler integration, BEL character processing, and cleanup.
 * Runs in happy-dom environment.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Terminal } from '../../src/terminal/Terminal';
import { BellHandler } from '../../src/features/BellHandler';

describe('Bell handler', () => {
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

  it('should have bellHandler property', () => {
    expect(term.bellHandler).toBeDefined();
  });

  it('bellHandler should be a BellHandler instance', () => {
    expect(term.bellHandler).toBeInstanceOf(BellHandler);
  });

  it('onBell event should fire when emulator triggers bell', () => {
    let bellFired = false;
    term.onBell(() => { bellFired = true; });

    // Write BEL character (0x07)
    term.write('\x07');
    expect(bellFired).toBe(true);
  });

  it('bellHandler.ring() should be called when BEL received', () => {
    const ringSpy = vi.spyOn(term.bellHandler, 'ring');

    term.write('\x07');
    expect(ringSpy).toHaveBeenCalledTimes(1);

    ringSpy.mockRestore();
  });

  it('should accept bell options in constructor', () => {
    const customTerm = new Terminal({
      rows: 24,
      cols: 80,
      bellVolume: 0.5,
      bellFrequency: 1000,
      bellDuration: 200,
    });
    customTerm.open(container);

    expect(customTerm.bellHandler.options.volume).toBe(0.5);
    expect(customTerm.bellHandler.options.frequency).toBe(1000);
    expect(customTerm.bellHandler.options.duration).toBe(200);

    customTerm.dispose();
  });

  it('dispose should clean up bellHandler', () => {
    const disposeSpy = vi.spyOn(term.bellHandler, 'dispose');

    term.dispose();
    expect(disposeSpy).toHaveBeenCalledTimes(1);

    disposeSpy.mockRestore();
  });
});
