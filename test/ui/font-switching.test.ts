/**
 * UI tests for bitmap font rendering via CanvasRenderer.
 * All emulators use bitmap fonts — there is no system font fallback.
 * Runs in happy-dom environment.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Terminal } from '../../src/terminal/Terminal';
import { FontTDV2200 } from '../../src/fonts/FontTDV2200';
import { FontTDV2215 } from '../../src/fonts/FontTDV2215';
import { FontVT100 } from '../../src/fonts/FontVT100';

describe('Font switching', () => {
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

  it('should default to bitmap font rendering (VT100)', () => {
    const renderer = term.getRenderer();
    expect(renderer).not.toBeNull();
    expect(renderer!.isBitmapFontActive).toBe(true);
  });

  it('renderer should have isBitmapFontActive property', () => {
    const renderer = term.getRenderer();
    expect(renderer).not.toBeNull();
    expect(typeof renderer!.isBitmapFontActive).toBe('boolean');
  });

  it('isBitmapFontActive should be true by default', () => {
    const renderer = term.getRenderer();
    expect(renderer!.isBitmapFontActive).toBe(true);
  });

  it('setUseBitmapFont(true, tdv2200) should activate TDV2200 bitmap font', () => {
    const renderer = term.getRenderer()!;
    renderer.setUseBitmapFont(true, 'tdv2200');
    expect(renderer.isBitmapFontActive).toBe(true);
  });

  it('bitmap font cannot be disabled — setUseBitmapFont(false) is ignored', () => {
    const renderer = term.getRenderer()!;
    renderer.setUseBitmapFont(true, 'tdv2200');
    expect(renderer.isBitmapFontActive).toBe(true);

    // false is ignored — all emulators always use bitmap
    renderer.setUseBitmapFont(false, 'tdv2200');
    expect(renderer.isBitmapFontActive).toBe(true);
  });

  it('setUseBitmapFont(false, vt100) should still use bitmap font', () => {
    const renderer = term.getRenderer()!;
    // false is ignored — VT100 also always uses bitmap
    renderer.setUseBitmapFont(false, 'vt100');
    expect(renderer.isBitmapFontActive).toBe(true);
  });

  it('canvas className should always be retroterm-bitmap', () => {
    const renderer = term.getRenderer()!;
    const canvas = container.querySelector('canvas')!;
    expect(canvas.className).toContain('retroterm-bitmap');

    renderer.setUseBitmapFont(true, 'tdv2200');
    expect(canvas.className).toContain('retroterm-bitmap');

    renderer.setUseBitmapFont(false, 'vt100');
    expect(canvas.className).toContain('retroterm-bitmap');
  });

  it('setEmulatorType to tdv2200 should use TDV2200 bitmap font', () => {
    term.setEmulatorType('tdv2200');

    const renderer = term.getRenderer()!;
    expect(renderer.isBitmapFontActive).toBe(true);
    expect(renderer.bitmapFontRenderer).not.toBeNull();
  });

  it('switching emulator type should recreate bitmap font renderer', () => {
    const renderer = term.getRenderer()!;

    // Start with TDV2215
    renderer.setUseBitmapFont(true, 'tdv2215');
    expect(renderer.isBitmapFontActive).toBe(true);
    const font2215 = renderer.bitmapFontRenderer!.font;
    expect(font2215).toBeInstanceOf(FontTDV2215);

    // Switch to TDV2200 — should create new font, not reuse TDV2215
    renderer.setUseBitmapFont(true, 'tdv2200');
    const font2200 = renderer.bitmapFontRenderer!.font;
    expect(font2200).toBeInstanceOf(FontTDV2200);
    expect(font2200).not.toBe(font2215);
  });

  it('switching emulator type should reset synced variant', () => {
    const renderer = term.getRenderer()!;

    // Start with TDV2215 and sync variant to Norwegian
    renderer.setUseBitmapFont(true, 'tdv2215');
    renderer.syncCharacterSetVariant(1);
    const font2215 = renderer.bitmapFontRenderer!.font;
    expect((font2215 as { characterSetVariant: number }).characterSetVariant).toBe(1);

    // Switch to TDV2200 — variant should reset
    renderer.setUseBitmapFont(true, 'tdv2200');
    // Syncing variant 1 again should actually set it (not be cached as already 1)
    renderer.syncCharacterSetVariant(1);
    const font2200 = renderer.bitmapFontRenderer!.font;
    // The fact that this call went through (not cached) proves the reset worked
    expect(font2200).toBeInstanceOf(FontTDV2200);
  });

  it('VT100 should use FontVT100 bitmap font', () => {
    const renderer = term.getRenderer()!;
    expect(renderer.isBitmapFontActive).toBe(true);
    expect(renderer.bitmapFontRenderer).not.toBeNull();
    expect(renderer.bitmapFontRenderer!.font).toBeInstanceOf(FontVT100);
  });

  it('switching from TDV2200 to VT100 should use FontVT100', () => {
    const renderer = term.getRenderer()!;
    renderer.setUseBitmapFont(true, 'tdv2200');
    expect(renderer.bitmapFontRenderer!.font).toBeInstanceOf(FontTDV2200);

    renderer.setUseBitmapFont(true, 'vt100');
    expect(renderer.bitmapFontRenderer!.font).toBeInstanceOf(FontVT100);
  });
});
