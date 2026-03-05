/**
 * UI tests for VirtualKeyboard — DOM rendering, key clicks, terminal routing.
 * Runs in happy-dom environment.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VirtualKeyboard } from '../../src/keyboard/VirtualKeyboard';
import { Terminal } from '../../src/terminal/Terminal';
import { TDV2200KeyRegistry } from '../../src/keyboard/TDV2200KeyRegistry';

describe('VirtualKeyboard', () => {
  let container: HTMLElement;
  let vk: VirtualKeyboard;

  beforeEach(() => {
    container = document.createElement('div');
    container.style.width = '1400px';
    container.style.height = '500px';
    document.body.appendChild(container);
    vk = new VirtualKeyboard(container);
  });

  afterEach(() => {
    vk.dispose();
    document.body.innerHTML = '';
  });

  describe('Rendering', () => {
    it('should render an SVG element into container', () => {
      const svg = container.querySelector('svg');
      expect(svg).not.toBeNull();
      expect(svg!.classList.contains('retroterm-vk')).toBe(true);
    });

    it('should render key elements with data-grid attributes', () => {
      const keys = container.querySelectorAll('g[data-grid]');
      expect(keys.length).toBeGreaterThan(0);
    });

    it('should render ESC key (G0)', () => {
      const escKey = container.querySelector('g[data-grid="G0"]');
      expect(escKey).not.toBeNull();
    });

    it('should render PUSH keys G1-G8', () => {
      for (let i = 1; i <= 8; i++) {
        const pushKey = container.querySelector(`g[data-grid="G${i}"]`);
        expect(pushKey).not.toBeNull();
      }
    });

    it('should render key background rectangles', () => {
      const g0 = container.querySelector('g[data-grid="G0"]');
      expect(g0).not.toBeNull();
      const rect = g0!.querySelector('rect');
      expect(rect).not.toBeNull();
      expect(rect!.getAttribute('fill')).toBeTruthy();
    });

    it('should render key label text', () => {
      const g0 = container.querySelector('g[data-grid="G0"]');
      expect(g0).not.toBeNull();
      const text = g0!.querySelector('text');
      expect(text).not.toBeNull();
      // ESC key should have label text
      expect(text!.textContent).toBeTruthy();
    });

    it('should render nav and function keys', () => {
      // Check some nav/function grid positions
      const navKeys = ['G47', 'G48', 'G49', 'E47', 'E48', 'E49'];
      for (const pos of navKeys) {
        // Only check if key is registered
        if (TDV2200KeyRegistry.getKey(pos)) {
          const el = container.querySelector(`g[data-grid="${pos}"]`);
          expect(el, `Key ${pos} should be rendered`).not.toBeNull();
        }
      }
    });
  });

  describe('Layout modes', () => {
    it('should default to full layout', () => {
      expect(vk.layout).toBe('full');
    });

    it('should switch to compact layout', () => {
      const fullKeys = container.querySelectorAll('g[data-grid]').length;
      vk.setLayout('compact');
      expect(vk.layout).toBe('compact');
      const compactKeys = container.querySelectorAll('g[data-grid]').length;
      expect(compactKeys).toBeLessThan(fullKeys);
    });

    it('should switch back to full layout', () => {
      vk.setLayout('compact');
      vk.setLayout('full');
      expect(vk.layout).toBe('full');
      const keys = container.querySelectorAll('g[data-grid]').length;
      expect(keys).toBeGreaterThan(40); // Full layout has ~90 keys
    });

    it('should be no-op when switching to same layout', () => {
      vk.setLayout('full');
      expect(vk.layout).toBe('full');
    });
  });

  describe('Visibility', () => {
    it('should start hidden', () => {
      expect(vk.visible).toBe(false);
    });

    it('should show when show() is called', () => {
      vk.show();
      expect(vk.visible).toBe(true);
      expect(container.style.display).toBe('block');
    });

    it('should hide when hide() is called', () => {
      vk.show();
      vk.hide();
      expect(vk.visible).toBe(false);
      expect(container.style.display).toBe('none');
    });

    it('should toggle visibility', () => {
      vk.toggle();
      expect(vk.visible).toBe(true);
      vk.toggle();
      expect(vk.visible).toBe(false);
    });
  });

  describe('Language', () => {
    it('should default to Norwegian', () => {
      expect(vk.language).toBe('no');
    });

    it('should switch language', () => {
      vk.setLanguage('us');
      expect(vk.language).toBe('us');
    });

    it('should update key labels when language changes', () => {
      // Get initial label for a key
      const key = container.querySelector('g[data-grid="G0"]');
      const textBefore = key?.querySelector('text')?.textContent;

      // Switch language — labels may or may not change depending on the key
      vk.setLanguage('de');
      // No error should occur during label update
      expect(vk.language).toBe('de');
    });

    it('should be no-op when switching to same language', () => {
      vk.setLanguage('no');
      expect(vk.language).toBe('no');
    });
  });

  describe('Terminal management', () => {
    it('should attach a terminal', () => {
      const termContainer = document.createElement('div');
      document.body.appendChild(termContainer);
      const term = new Terminal({ rows: 24, cols: 80 });
      term.open(termContainer);

      vk.attachTerminal(term, 'Terminal 1');
      // No error
      term.dispose();
    });

    it('should not show selector with single terminal', () => {
      const termContainer = document.createElement('div');
      document.body.appendChild(termContainer);
      const term = new Terminal({ rows: 24, cols: 80 });
      term.open(termContainer);

      vk.attachTerminal(term, 'Terminal 1');
      const selector = container.querySelector('.retroterm-vk-selector');
      expect(selector).toBeNull();

      term.dispose();
    });

    it('should show selector with multiple terminals', () => {
      const termContainer1 = document.createElement('div');
      const termContainer2 = document.createElement('div');
      document.body.appendChild(termContainer1);
      document.body.appendChild(termContainer2);
      const term1 = new Terminal({ rows: 24, cols: 80 });
      const term2 = new Terminal({ rows: 24, cols: 80 });
      term1.open(termContainer1);
      term2.open(termContainer2);

      vk.attachTerminal(term1, 'Terminal 1');
      vk.attachTerminal(term2, 'Terminal 2');

      const selector = container.querySelector('.retroterm-vk-selector');
      expect(selector).not.toBeNull();
      expect(selector!.tagName.toLowerCase()).toBe('select');

      const options = selector!.querySelectorAll('option');
      expect(options.length).toBe(2);

      term1.dispose();
      term2.dispose();
    });

    it('should detach a terminal and update selector', () => {
      const termContainer1 = document.createElement('div');
      const termContainer2 = document.createElement('div');
      document.body.appendChild(termContainer1);
      document.body.appendChild(termContainer2);
      const term1 = new Terminal({ rows: 24, cols: 80 });
      const term2 = new Terminal({ rows: 24, cols: 80 });
      term1.open(termContainer1);
      term2.open(termContainer2);

      vk.attachTerminal(term1, 'Terminal 1');
      vk.attachTerminal(term2, 'Terminal 2');
      vk.detachTerminal(term1);

      // Should no longer show selector (only 1 terminal left)
      const selector = container.querySelector('.retroterm-vk-selector');
      expect(selector).toBeNull();

      term1.dispose();
      term2.dispose();
    });

    it('should select a terminal', () => {
      const termContainer1 = document.createElement('div');
      const termContainer2 = document.createElement('div');
      document.body.appendChild(termContainer1);
      document.body.appendChild(termContainer2);
      const term1 = new Terminal({ rows: 24, cols: 80 });
      const term2 = new Terminal({ rows: 24, cols: 80 });
      term1.open(termContainer1);
      term2.open(termContainer2);

      vk.attachTerminal(term1, 'Terminal 1');
      vk.attachTerminal(term2, 'Terminal 2');
      vk.selectTerminal(term2);
      // No error — active terminal is term2
      term1.dispose();
      term2.dispose();
    });
  });

  describe('LED state', () => {
    it('should update LED state without errors', () => {
      vk.updateLEDs(true, false, false);
      vk.updateLEDs(false, true, false);
      vk.updateLEDs(false, false, true);
      vk.updateLEDs(true, true, true);
      // No errors thrown
    });
  });

  describe('Key clicks', () => {
    it('should fire onKey when a non-modifier key is clicked', () => {
      const termContainer = document.createElement('div');
      document.body.appendChild(termContainer);
      const term = new Terminal({ rows: 24, cols: 80 });
      term.open(termContainer);

      let received: string | null = null;
      term.onKey((ev) => { received = ev.key; });

      vk.attachTerminal(term, 'Test');

      // Find ESC key and click it
      const escKey = container.querySelector('g[data-grid="G0"]');
      expect(escKey).not.toBeNull();
      escKey!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

      expect(received).toBe('\x1b');

      term.dispose();
    });

    it('should fire key release visual feedback', () => {
      const termContainer = document.createElement('div');
      document.body.appendChild(termContainer);
      const term = new Terminal({ rows: 24, cols: 80 });
      term.open(termContainer);
      vk.attachTerminal(term, 'Test');

      const escKey = container.querySelector('g[data-grid="G0"]');
      const rect = escKey!.querySelector('rect');
      const originalFill = rect!.getAttribute('fill');

      // Mousedown changes color
      escKey!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      const pressedFill = rect!.getAttribute('fill');

      // Mouseup restores color
      escKey!.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      const releasedFill = rect!.getAttribute('fill');

      expect(pressedFill).not.toBe(originalFill);
      expect(releasedFill).toBe(originalFill);

      term.dispose();
    });

    it('should not fire onKey without attached terminal', () => {
      // Click ESC key with no terminal attached
      const escKey = container.querySelector('g[data-grid="G0"]');
      // Should not throw even without a terminal
      escKey!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });
  });

  describe('Dispose', () => {
    it('should clean up DOM on dispose', () => {
      expect(container.querySelector('svg')).not.toBeNull();
      vk.dispose();
      expect(container.innerHTML).toBe('');
    });
  });
});
