/**
 * UI tests for Terminal — options setter, events, getEmulator/getEmulatorType,
 * focus, loadAddon, clearTextureAtlas, refresh, and theme variations.
 * Runs in happy-dom environment.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Terminal } from '../../src/terminal/Terminal';
import { Themes } from '../../src/terminal/TerminalOptions';

describe('Terminal — options setter', () => {
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

  it('should update theme via options setter', () => {
    const term = new Terminal({ theme: Themes.green });
    term.open(container);

    term.options = { theme: Themes.amber };
    expect(term.options.theme).toBe(Themes.amber);
    term.dispose();
  });

  it('should update font settings via options setter', () => {
    const term = new Terminal({ fontFamily: 'monospace', fontSize: 16 });
    term.open(container);

    term.options = { fontFamily: 'Courier New', fontSize: 14 };
    expect(term.options.fontFamily).toBe('Courier New');
    expect(term.options.fontSize).toBe(14);
    term.dispose();
  });

  it('useBitmapFont option is ignored — all emulators always use bitmap', () => {
    const term = new Terminal();
    term.open(container);

    // Setting useBitmapFont is ignored — bitmap is always active
    term.options = { useBitmapFont: false };
    const renderer = term.getRenderer()!;
    expect(renderer.isBitmapFontActive).toBe(true);
    term.dispose();
  });

  it('should update bell settings via options setter', () => {
    const term = new Terminal();
    term.open(container);

    term.options = { bellVolume: 0.8 };
    expect(term.options.bellVolume).toBe(0.8);

    term.options = { bellFrequency: 1000 };
    expect(term.options.bellFrequency).toBe(1000);

    term.options = { bellDuration: 200 };
    expect(term.options.bellDuration).toBe(200);
    term.dispose();
  });
});

describe('Terminal — events', () => {
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

  it('should fire onData when emulator sends DSR response', () => {
    const term = new Terminal();
    term.open(container);

    const responses: Uint8Array[] = [];
    term.onData((data) => responses.push(data));

    // Trigger DSR status query (CSI 5 n) — base emulator responds with CSI 0 n
    term.write('\x1b[5n');
    // Response should be forwarded via onData
    expect(responses.length).toBeGreaterThan(0);
    term.dispose();
  });

  it('should fire onBell when BEL character received', () => {
    const term = new Terminal();
    term.open(container);

    let bellFired = false;
    term.onBell(() => { bellFired = true; });

    term.write('\x07');
    expect(bellFired).toBe(true);
    term.dispose();
  });

  it('should fire onTitleChange on OSC 0 sequence', () => {
    const term = new Terminal();
    term.open(container);

    let title = '';
    term.onTitleChange((t) => { title = t; });

    // OSC 0 ; title ST
    term.write('\x1b]0;My Terminal\x1b\\');
    expect(title).toBe('My Terminal');
    term.dispose();
  });

  it('should unsubscribe via dispose', () => {
    const term = new Terminal();
    term.open(container);

    let bellCount = 0;
    const sub = term.onBell(() => { bellCount++; });

    term.write('\x07');
    expect(bellCount).toBe(1);

    sub.dispose();
    term.write('\x07');
    expect(bellCount).toBe(1); // Should not increase
    term.dispose();
  });
});

describe('Terminal — getEmulator and getEmulatorType', () => {
  it('should return the current emulator instance', () => {
    const term = new Terminal();
    const emu = term.getEmulator();
    expect(emu).toBeDefined();
    expect(emu.getTerminalType()).toBe('Terminal');
    term.dispose();
  });

  it('should return the current emulator type', () => {
    const term = new Terminal();
    expect(term.getEmulatorType()).toBe('vt100');
    term.dispose();
  });

  it('should update after setEmulatorType', () => {
    const term = new Terminal();
    term.setEmulatorType('tdv2200');
    expect(term.getEmulatorType()).toBe('tdv2200');
    expect(term.getEmulator().getTerminalType()).toBe('TDV2200');
    term.dispose();
  });
});

describe('Terminal — focus, loadAddon, clearTextureAtlas, refresh', () => {
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

  it('should not throw on focus()', () => {
    const term = new Terminal();
    term.open(container);
    expect(() => term.focus()).not.toThrow();
    term.dispose();
  });

  it('should not throw on focus() before open', () => {
    const term = new Terminal();
    expect(() => term.focus()).not.toThrow();
    term.dispose();
  });

  it('should not throw on loadAddon()', () => {
    const term = new Terminal();
    expect(() => term.loadAddon({})).not.toThrow();
    term.dispose();
  });

  it('should not throw on clearTextureAtlas()', () => {
    const term = new Terminal();
    expect(() => term.clearTextureAtlas()).not.toThrow();
    term.dispose();
  });

  it('should not throw on refresh()', () => {
    const term = new Terminal();
    term.open(container);
    expect(() => term.refresh(0, 23)).not.toThrow();
    term.dispose();
  });
});

describe('Terminal — all Themes', () => {
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

  it('should create with amber theme', () => {
    const term = new Terminal({ theme: Themes.amber });
    term.open(container);
    expect(term.options.theme!.foreground).toBe('#ffb000');
    term.dispose();
  });

  it('should create with white theme', () => {
    const term = new Terminal({ theme: Themes.white });
    term.open(container);
    expect(term.options.theme!.foreground).toBe('#ffffff');
    term.dispose();
  });

  it('should create with blue theme', () => {
    const term = new Terminal({ theme: Themes.blue });
    term.open(container);
    expect(term.options.theme!.foreground).toBe('#00aaff');
    term.dispose();
  });

  it('should create with paperwhite theme', () => {
    const term = new Terminal({ theme: Themes.paperwhite });
    term.open(container);
    expect(term.options.theme!.foreground).toBe('#000000');
    expect(term.options.theme!.background).toBe('#f5f5dc');
    term.dispose();
  });
});

describe('Terminal — getRenderer', () => {
  it('should return null before open', () => {
    const term = new Terminal();
    expect(term.getRenderer()).toBeNull();
    term.dispose();
  });

  it('should return renderer after open', () => {
    const container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '400px';
    document.body.appendChild(container);

    const term = new Terminal();
    term.open(container);
    expect(term.getRenderer()).not.toBeNull();
    term.dispose();
    document.body.innerHTML = '';
  });
});
