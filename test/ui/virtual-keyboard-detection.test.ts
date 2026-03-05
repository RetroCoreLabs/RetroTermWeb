/**
 * UI tests for virtual keyboard key detection and terminal routing.
 * Tests that correct escape sequences are sent for various key types.
 * Runs in happy-dom environment.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VirtualKeyboard } from '../../src/keyboard/VirtualKeyboard';
import { Terminal } from '../../src/terminal/Terminal';
import { TDV2200KeyRegistry } from '../../src/keyboard/TDV2200KeyRegistry';

describe('VirtualKeyboard key detection', () => {
  let vkContainer: HTMLElement;
  let termContainer: HTMLElement;
  let vk: VirtualKeyboard;
  let term: Terminal;
  let receivedKeys: string[];

  beforeEach(() => {
    vkContainer = document.createElement('div');
    termContainer = document.createElement('div');
    termContainer.style.width = '800px';
    termContainer.style.height = '400px';
    document.body.appendChild(vkContainer);
    document.body.appendChild(termContainer);

    term = new Terminal({ rows: 24, cols: 80 });
    term.open(termContainer);

    vk = new VirtualKeyboard(vkContainer);
    vk.attachTerminal(term, 'Test');

    receivedKeys = [];
    term.onKey((ev) => { receivedKeys.push(ev.key); });
  });

  afterEach(() => {
    vk.dispose();
    term.dispose();
    document.body.innerHTML = '';
  });

  function clickKey(gridPos: string): void {
    const keyEl = vkContainer.querySelector(`g[data-grid="${gridPos}"]`);
    if (!keyEl) throw new Error(`Key ${gridPos} not found in DOM`);
    keyEl.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  }

  it('should send ESC sequence for ESC key (G0)', () => {
    clickKey('G0');
    expect(receivedKeys).toEqual(['\x1b']);
  });

  it('should identify PUSH keys as programmable (no fixed sequence)', () => {
    // PUSH keys G1-G8 have no fixed sequence
    for (let i = 1; i <= 8; i++) {
      const key = TDV2200KeyRegistry.getKey(`G${i}`);
      expect(key, `G${i} should be registered`).not.toBeNull();
      expect(key!.isProgrammable).toBe(true);
    }
  });

  it('should not send sequence for programmable keys (PUSH)', () => {
    clickKey('G1');
    // No sequence should be sent for programmable keys
    expect(receivedKeys.length).toBe(0);
  });

  it('should route keys to the active terminal', () => {
    const termContainer2 = document.createElement('div');
    document.body.appendChild(termContainer2);
    const term2 = new Terminal({ rows: 24, cols: 80 });
    term2.open(termContainer2);

    const received2: string[] = [];
    term2.onKey((ev) => { received2.push(ev.key); });

    vk.attachTerminal(term2, 'Terminal 2');
    vk.selectTerminal(term2);

    clickKey('G0');
    expect(receivedKeys.length).toBe(0); // term1 should NOT receive
    expect(received2).toEqual(['\x1b']); // term2 should receive

    term2.dispose();
  });

  it('should identify key types correctly', () => {
    // ESC is AlwaysSameCode
    const esc = TDV2200KeyRegistry.getKey('G0');
    expect(esc).not.toBeNull();
    expect(esc!.alwaysSameCode).toBe(true);
    expect(esc!.name).toBe('ESC');
  });

  it('should provide labels for Norwegian language', () => {
    const label = TDV2200KeyRegistry.getLabel('G0', 'no');
    expect(label).not.toBeNull();
    expect(label!.primary).toBeTruthy();
  });

  it('should provide labels for US English', () => {
    const label = TDV2200KeyRegistry.getLabel('G0', 'us');
    expect(label).not.toBeNull();
    expect(label!.primary).toBeTruthy();
  });

  it('should provide labels for German', () => {
    const label = TDV2200KeyRegistry.getLabel('G0', 'de');
    expect(label).not.toBeNull();
    expect(label!.primary).toBeTruthy();
  });

  it('should look up keys by name', () => {
    const grid = TDV2200KeyRegistry.getGridForName('ESC');
    expect(grid).toBe('G0');
  });

  it('should handle mouseleave for visual feedback', () => {
    const escKey = vkContainer.querySelector('g[data-grid="G0"]');
    const rect = escKey!.querySelector('rect');
    const originalFill = rect!.getAttribute('fill');

    escKey!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    escKey!.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));

    expect(rect!.getAttribute('fill')).toBe(originalFill);
  });

  it('should handle key colors correctly', () => {
    // ESC is orange
    const escRect = vkContainer.querySelector('g[data-grid="G0"] rect');
    const escFill = escRect!.getAttribute('fill')!;

    // PUSH key is brown
    const pushRect = vkContainer.querySelector('g[data-grid="G1"] rect');
    const pushFill = pushRect!.getAttribute('fill')!;

    // Colors should be different
    expect(escFill).not.toBe(pushFill);
  });

  it('should render key with correct position attributes', () => {
    const escRect = vkContainer.querySelector('g[data-grid="G0"] rect');
    expect(escRect).not.toBeNull();
    expect(escRect!.getAttribute('x')).toBeTruthy();
    expect(escRect!.getAttribute('y')).toBeTruthy();
    expect(escRect!.getAttribute('width')).toBeTruthy();
    expect(escRect!.getAttribute('height')).toBeTruthy();
  });
});
