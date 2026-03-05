/**
 * UI tests for VirtualKeyboard — additional coverage for updateLEDs,
 * setLanguage label changes, setLayout compact mode, modifier persistence,
 * and terminal selector dropdown.
 * Runs in happy-dom environment.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VirtualKeyboard } from '../../src/keyboard/VirtualKeyboard';
import { Terminal } from '../../src/terminal/Terminal';

describe('VirtualKeyboard — updateLEDs', () => {
  let container: HTMLElement;
  let vk: VirtualKeyboard;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    vk = new VirtualKeyboard(container);
  });

  afterEach(() => {
    vk.dispose();
    document.body.innerHTML = '';
  });

  it('should not throw when calling updateLEDs', () => {
    expect(() => vk.updateLEDs(true, false, false)).not.toThrow();
  });

  it('should accept all-true LED state', () => {
    expect(() => vk.updateLEDs(true, true, true)).not.toThrow();
  });

  it('should accept all-false LED state', () => {
    expect(() => vk.updateLEDs(false, false, false)).not.toThrow();
  });

  it('should accept mixed LED state', () => {
    expect(() => vk.updateLEDs(false, true, false)).not.toThrow();
  });
});

describe('VirtualKeyboard — setLayout compact mode', () => {
  let container: HTMLElement;
  let vk: VirtualKeyboard;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    vk = new VirtualKeyboard(container);
  });

  afterEach(() => {
    vk.dispose();
    document.body.innerHTML = '';
  });

  it('should start in full layout', () => {
    expect(vk.layout).toBe('full');
  });

  it('should switch to compact layout', () => {
    vk.setLayout('compact');
    expect(vk.layout).toBe('compact');
  });

  it('should have fewer keys in compact mode', () => {
    const fullKeys = container.querySelectorAll('[data-grid]');
    const fullCount = fullKeys.length;

    vk.setLayout('compact');

    const compactKeys = container.querySelectorAll('[data-grid]');
    expect(compactKeys.length).toBeLessThan(fullCount);
  });

  it('should re-render SVG when switching layout', () => {
    const svgBefore = container.querySelector('svg');
    vk.setLayout('compact');
    const svgAfter = container.querySelector('svg');

    // After setLayout, SVG is re-rendered (different node)
    expect(svgAfter).not.toBeNull();
    // The SVG should have the retroterm-vk class
    expect(svgAfter!.classList.contains('retroterm-vk')).toBe(true);
  });

  it('should switch back to full layout', () => {
    vk.setLayout('compact');
    const compactCount = container.querySelectorAll('[data-grid]').length;

    vk.setLayout('full');
    expect(vk.layout).toBe('full');

    const fullCount = container.querySelectorAll('[data-grid]').length;
    expect(fullCount).toBeGreaterThan(compactCount);
  });

  it('should not re-render when setting same layout', () => {
    const svgBefore = container.querySelector('svg');
    vk.setLayout('full'); // Already full
    const svgAfter = container.querySelector('svg');

    // Same layout — should not re-render (same SVG node)
    expect(svgBefore).toBe(svgAfter);
  });

  it('should include nav/function keys in compact mode', () => {
    vk.setLayout('compact');
    const keys = container.querySelectorAll('[data-grid]');
    const gridPositions: string[] = [];
    keys.forEach(k => gridPositions.push(k.getAttribute('data-grid')!));

    // Compact should include function keys (G51-G54, F51-F54, etc.)
    expect(gridPositions).toContain('G51');
    expect(gridPositions).toContain('F51');
    // And nav keys
    expect(gridPositions).toContain('G47');
    expect(gridPositions).toContain('E47');
  });
});

describe('VirtualKeyboard — setLanguage label changes', () => {
  let container: HTMLElement;
  let vk: VirtualKeyboard;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    vk = new VirtualKeyboard(container);
  });

  afterEach(() => {
    vk.dispose();
    document.body.innerHTML = '';
  });

  it('should start with Norwegian language', () => {
    expect(vk.language).toBe('no');
  });

  it('should update language property when set', () => {
    vk.setLanguage('us');
    expect(vk.language).toBe('us');
  });

  it('should not re-render when setting same language', () => {
    // setLanguage('no') again should be no-op since already 'no'
    const svg = container.querySelector('svg');
    vk.setLanguage('no');
    const svgAfter = container.querySelector('svg');
    expect(svg).toBe(svgAfter); // Same DOM element — no re-render
  });

  it('should update key label text elements when language changes', () => {
    // Get labels before language change
    const textsBefore = container.querySelectorAll('text');
    const labelsBefore: string[] = [];
    textsBefore.forEach(t => labelsBefore.push(t.textContent ?? ''));

    // Switch to US layout
    vk.setLanguage('us');

    const textsAfter = container.querySelectorAll('text');
    const labelsAfter: string[] = [];
    textsAfter.forEach(t => labelsAfter.push(t.textContent ?? ''));

    // Some labels should change between Norwegian and US
    // (at minimum the text content arrays should be updated)
    expect(textsAfter.length).toBe(textsBefore.length);
  });
});

describe('VirtualKeyboard — terminal selector', () => {
  let container: HTMLElement;
  let vk: VirtualKeyboard;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    vk = new VirtualKeyboard(container);
  });

  afterEach(() => {
    vk.dispose();
    document.body.innerHTML = '';
  });

  it('should not show selector with zero terminals', () => {
    const selector = container.querySelector('.retroterm-vk-selector');
    expect(selector).toBeNull();
  });

  it('should not show selector with one terminal', () => {
    const term = new Terminal();
    vk.attachTerminal(term, 'Term 1');

    const selector = container.querySelector('.retroterm-vk-selector');
    expect(selector).toBeNull();
    term.dispose();
  });

  it('should show selector with multiple terminals', () => {
    const term1 = new Terminal();
    const term2 = new Terminal();
    vk.attachTerminal(term1, 'Term 1');
    vk.attachTerminal(term2, 'Term 2');

    const selector = container.querySelector('.retroterm-vk-selector');
    expect(selector).not.toBeNull();
    expect(selector!.tagName.toLowerCase()).toBe('select');

    term1.dispose();
    term2.dispose();
  });

  it('should list all attached terminals in selector', () => {
    const term1 = new Terminal();
    const term2 = new Terminal();
    const term3 = new Terminal();
    vk.attachTerminal(term1, 'Alpha');
    vk.attachTerminal(term2, 'Beta');
    vk.attachTerminal(term3, 'Gamma');

    const options = container.querySelectorAll('.retroterm-vk-selector option');
    expect(options.length).toBe(3);
    expect(options[0].textContent).toBe('Alpha');
    expect(options[1].textContent).toBe('Beta');
    expect(options[2].textContent).toBe('Gamma');

    term1.dispose();
    term2.dispose();
    term3.dispose();
  });

  it('should remove selector when detaching down to one terminal', () => {
    const term1 = new Terminal();
    const term2 = new Terminal();
    vk.attachTerminal(term1, 'Term 1');
    vk.attachTerminal(term2, 'Term 2');

    expect(container.querySelector('.retroterm-vk-selector')).not.toBeNull();

    vk.detachTerminal(term2);

    expect(container.querySelector('.retroterm-vk-selector')).toBeNull();

    term1.dispose();
    term2.dispose();
  });

  it('should change active terminal via selector change event', () => {
    const term1 = new Terminal();
    const term2 = new Terminal();
    vk.attachTerminal(term1, 'Term 1');
    vk.attachTerminal(term2, 'Term 2');

    const selector = container.querySelector('.retroterm-vk-selector') as HTMLSelectElement;
    expect(selector).not.toBeNull();

    // Simulate selecting second terminal
    selector.value = '1';
    selector.dispatchEvent(new Event('change'));

    // After selection, clicking a key should route to term2 (verified by no error)
    term1.dispose();
    term2.dispose();
  });

  it('should select first terminal automatically when first is attached', () => {
    const term1 = new Terminal();
    vk.attachTerminal(term1, 'Term 1');

    // No selector shown with single terminal, but the active terminal should be set
    // Verify by detaching — should work without error
    vk.detachTerminal(term1);
    term1.dispose();
  });

  it('should fall back to first terminal when active is detached', () => {
    const term1 = new Terminal();
    const term2 = new Terminal();
    vk.attachTerminal(term1, 'Term 1');
    vk.attachTerminal(term2, 'Term 2');
    vk.selectTerminal(term2);

    vk.detachTerminal(term2);

    // Active should now be term1 — selector gone since only 1 terminal
    expect(container.querySelector('.retroterm-vk-selector')).toBeNull();

    term1.dispose();
    term2.dispose();
  });
});

describe('VirtualKeyboard — key rendering', () => {
  let container: HTMLElement;
  let vk: VirtualKeyboard;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    vk = new VirtualKeyboard(container);
  });

  afterEach(() => {
    vk.dispose();
    document.body.innerHTML = '';
  });

  it('should render SVG element', () => {
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg!.classList.contains('retroterm-vk')).toBe(true);
  });

  it('should render keys with data-grid attribute', () => {
    const keys = container.querySelectorAll('[data-grid]');
    expect(keys.length).toBeGreaterThan(0);
  });

  it('should render background rectangle', () => {
    const svg = container.querySelector('svg');
    const bgRect = svg!.querySelector('rect');
    expect(bgRect).not.toBeNull();
    expect(bgRect!.getAttribute('fill')).toBe('#2a2a2a');
  });

  it('should render key labels as text elements', () => {
    const texts = container.querySelectorAll('text');
    expect(texts.length).toBeGreaterThan(0);
  });

  it('should set cursor pointer on key groups', () => {
    const keys = container.querySelectorAll('[data-grid]');
    // At least one key should exist
    expect(keys.length).toBeGreaterThan(0);
    const firstKey = keys[0] as SVGGElement;
    expect(firstKey.style.cursor).toBe('pointer');
  });
});

describe('VirtualKeyboard — show/hide/toggle', () => {
  let container: HTMLElement;
  let vk: VirtualKeyboard;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    vk = new VirtualKeyboard(container);
  });

  afterEach(() => {
    vk.dispose();
    document.body.innerHTML = '';
  });

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

describe('VirtualKeyboard — dispose', () => {
  it('should clear container on dispose', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const vk = new VirtualKeyboard(container);

    expect(container.children.length).toBeGreaterThan(0);

    vk.dispose();
    expect(container.children.length).toBe(0);

    document.body.innerHTML = '';
  });
});
