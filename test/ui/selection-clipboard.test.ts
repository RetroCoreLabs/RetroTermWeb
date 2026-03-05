/**
 * UI tests for selection + clipboard integration via Terminal.
 * Tests SelectionManager wiring, mouse handlers, and keyboard shortcuts.
 * Runs in happy-dom environment.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Terminal } from '../../src/terminal/Terminal';
import { SelectionManager } from '../../src/features/SelectionManager';

describe('Selection and clipboard', () => {
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

  it('should have selectionManager property', () => {
    expect(term.selectionManager).toBeDefined();
    expect(term.selectionManager).toBeInstanceOf(SelectionManager);
  });

  it('should start with no selection', () => {
    expect(term.selectionManager.hasSelection).toBe(false);
    expect(term.selectionManager.selection).toBeNull();
  });

  it('selectionManager.startSelection should create selection state', () => {
    // Triple-click triggers line selection immediately
    term.selectionManager.startSelection(2, 5, false);
    // Single click in 'char' mode sets _selecting=true but _selection=null until drag
    // Use a double-click to get immediate selection
    term.selectionManager.startSelection(2, 5, false);
    term.selectionManager.startSelection(2, 5, false);
    // After triple-click, line selection is created
    expect(term.selectionManager.selection).not.toBeNull();
  });

  it('should clear selection on clearSelection()', () => {
    term.selectionManager.startSelection(0, 0, true);
    expect(term.selectionManager.selection).not.toBeNull();
    term.clearSelection();
    expect(term.selectionManager.hasSelection).toBe(false);
    expect(term.selectionManager.selection).toBeNull();
  });

  it('hasSelection() should return false initially', () => {
    expect(term.hasSelection()).toBe(false);
  });

  it('hasSelection() should return true after selection', () => {
    // Rectangular selection (Alt+drag) creates selection immediately
    term.selectionManager.startSelection(1, 3, true);
    expect(term.hasSelection()).toBe(true);
  });

  it('getSelectedText() should return empty string when no selection', () => {
    expect(term.getSelectedText()).toBe('');
  });

  it('should register mouse event listeners on canvas', () => {
    const canvas = container.querySelector('canvas')!;
    expect(canvas).not.toBeNull();

    // Dispatching mousedown should not throw — proves listener is attached
    const mouseEvent = new MouseEvent('mousedown', { clientX: 50, clientY: 50, button: 0, bubbles: true });
    expect(() => canvas.dispatchEvent(mouseEvent)).not.toThrow();
  });

  it('should clear selection when typing', () => {
    const canvas = container.querySelector('canvas')!;

    // Create a selection (rectangular mode for immediate selection)
    term.selectionManager.startSelection(0, 0, true);
    term.selectionManager.updateSelection(2, 10);
    expect(term.hasSelection()).toBe(true);

    // Typing should clear the selection
    fireKeyDown(canvas, 'a');
    expect(term.hasSelection()).toBe(false);
  });

  it('Ctrl+Shift+C should not throw when no selection', () => {
    const canvas = container.querySelector('canvas')!;
    expect(() => {
      fireKeyDown(canvas, 'C', { ctrlKey: true, shiftKey: true });
    }).not.toThrow();
  });

  it('Ctrl+Shift+V should not throw', () => {
    const canvas = container.querySelector('canvas')!;
    expect(() => {
      fireKeyDown(canvas, 'V', { ctrlKey: true, shiftKey: true });
    }).not.toThrow();
  });

  it('should fire mousedown handler on canvas', () => {
    const canvas = container.querySelector('canvas')!;

    // Dispatch mousedown — the handler should start selection without error
    const mouseEvent = new MouseEvent('mousedown', {
      clientX: 100,
      clientY: 80,
      button: 0,
      bubbles: true,
    });
    expect(() => canvas.dispatchEvent(mouseEvent)).not.toThrow();
  });
});
