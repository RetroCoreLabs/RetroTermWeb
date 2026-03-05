/**
 * Virtual TDV2200 keyboard — shared DOM component.
 *
 * Renders the ND-246 keyboard layout with clickable keys.
 * A single instance can target any connected Terminal via dropdown.
 * Supports full layout (all ~90 keys) and compact layout (special keys only).
 */

import type { Terminal } from '../terminal/Terminal';
import { TDV2200KeyRegistry, TDVKeyColor, TDVKeyFlags } from './TDV2200KeyRegistry';
import type { TDVKeyDefinition, TDVKeyLabel, LanguageCode } from './TDV2200KeyRegistry';

export type VirtualKeyboardLayout = 'full' | 'compact';

interface AttachedTerminal {
  terminal: Terminal;
  label: string;
}

/** Key rendering metadata for layout positioning */
interface KeyLayout {
  gridPos: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

// Layout constants (matching C# TDV2200KeyVisualRegistry)
const STD_SIZE = 60;
const SPACING = 5;
const MAIN_X = 20;
const NAV_X = 1074;
const FUNC_X = 1314;

// Row Y positions (A=bottom to G=top)
const ROW_Y: Record<string, number> = {
  'A': 385, 'B': 320, 'C': 255, 'D': 190, 'E': 125, 'F': 60, 'G': 0,
};

// Special key dimensions
const CAPS_WIDTH = 105;
const SHIFT_WIDTH = 128;
const SPACE_WIDTH = 300;
const RETURN_HEIGHT = 125;  // Double height
const KP0_WIDTH = 125;     // Double width

function navX(col: number): number { return NAV_X + col * (STD_SIZE + SPACING); }
function funcX(col: number): number { return FUNC_X + col * (STD_SIZE + SPACING); }
function mainX(col: number): number { return MAIN_X + col * (STD_SIZE + SPACING); }

/** Build the layout positions for all keys */
function buildKeyLayouts(): KeyLayout[] {
  const layouts: KeyLayout[] = [];
  const add = (gridPos: string, x: number, y: number, w: number = STD_SIZE, h: number = STD_SIZE) => {
    layouts.push({ gridPos, x, y, width: w, height: h });
  };

  // G-row (top)
  add('G0', mainX(0), ROW_Y['G']);
  for (let i = 1; i <= 8; i++) add(`G${i}`, mainX(i + 1), ROW_Y['G']); // Gap after ESC
  add('G9', mainX(10), ROW_Y['G']);
  add('G10', mainX(11), ROW_Y['G']);
  add('G11', mainX(12), ROW_Y['G']);
  add('G12', mainX(13), ROW_Y['G']);
  add('G13', mainX(14), ROW_Y['G']);
  add('G14', mainX(15), ROW_Y['G']);
  add('G47', navX(0), ROW_Y['G']);
  add('G48', navX(1), ROW_Y['G']);
  add('G49', navX(2), ROW_Y['G']);
  add('G51', funcX(0), ROW_Y['G']);
  add('G52', funcX(1), ROW_Y['G']);
  add('G53', funcX(2), ROW_Y['G']);
  add('G54', funcX(3), ROW_Y['G']);

  // F-row
  add('F47', navX(0), ROW_Y['F']);
  add('F48', navX(1), ROW_Y['F']);
  add('F49', navX(2), ROW_Y['F']);
  add('F51', funcX(0), ROW_Y['F']);
  add('F52', funcX(1), ROW_Y['F']);
  add('F53', funcX(2), ROW_Y['F']);
  add('F54', funcX(3), ROW_Y['F']);

  // E-row (number row)
  add('E0', mainX(0), ROW_Y['E'], CAPS_WIDTH);
  for (let i = 1; i <= 12; i++) add(`E${i}`, MAIN_X + CAPS_WIDTH + SPACING + (i - 1) * (STD_SIZE + SPACING), ROW_Y['E']);
  add('E13', MAIN_X + CAPS_WIDTH + SPACING + 12 * (STD_SIZE + SPACING), ROW_Y['E']);
  add('E14', MAIN_X + CAPS_WIDTH + SPACING + 13 * (STD_SIZE + SPACING), ROW_Y['E']);
  add('E47', navX(0), ROW_Y['E']);
  add('E48', navX(1), ROW_Y['E']);
  add('E49', navX(2), ROW_Y['E']);
  add('E51', funcX(0), ROW_Y['E']);
  add('E52', funcX(1), ROW_Y['E']);
  add('E53', funcX(2), ROW_Y['E']);
  add('E54', funcX(3), ROW_Y['E']);

  // D-row (QWERTY)
  add('D99', mainX(0), ROW_Y['D']);
  add('D0', mainX(1), ROW_Y['D']);
  for (let i = 1; i <= 12; i++) add(`D${i}`, mainX(i + 1), ROW_Y['D']);
  add('D13', mainX(14), ROW_Y['D']);
  add('D47', navX(0), ROW_Y['D']);
  add('D48', navX(1), ROW_Y['D']);
  add('D49', navX(2), ROW_Y['D']);
  add('D51', funcX(0), ROW_Y['D']);
  add('D52', funcX(1), ROW_Y['D']);
  add('D53', funcX(2), ROW_Y['D']);
  add('D54', funcX(3), ROW_Y['D']);

  // C-row (ASDF)
  add('C99', mainX(0), ROW_Y['C']);
  add('C0', mainX(1), ROW_Y['C'], CAPS_WIDTH);
  for (let i = 1; i <= 12; i++) add(`C${i}`, mainX(1) + CAPS_WIDTH + SPACING + (i - 1) * (STD_SIZE + SPACING), ROW_Y['C']);
  add('C13', mainX(1) + CAPS_WIDTH + SPACING + 12 * (STD_SIZE + SPACING), ROW_Y['C'], STD_SIZE, RETURN_HEIGHT);
  add('C47', navX(0), ROW_Y['C']);
  add('C48', navX(1), ROW_Y['C']);
  add('C49', navX(2), ROW_Y['C']);
  add('C51', funcX(0), ROW_Y['C']);
  add('C52', funcX(1), ROW_Y['C']);
  add('C53', funcX(2), ROW_Y['C']);
  add('C54', funcX(3), ROW_Y['C']);

  // B-row (ZXCV)
  add('B99', mainX(0), ROW_Y['B'], SHIFT_WIDTH);
  for (let i = 0; i <= 10; i++) add(`B${i}`, MAIN_X + SHIFT_WIDTH + SPACING + i * (STD_SIZE + SPACING), ROW_Y['B']);
  add('B11', MAIN_X + SHIFT_WIDTH + SPACING + 11 * (STD_SIZE + SPACING), ROW_Y['B'], SHIFT_WIDTH);
  add('B47', navX(0), ROW_Y['B']);
  add('B48', navX(1), ROW_Y['B']);
  add('B49', navX(2), ROW_Y['B']);
  add('B51', funcX(0), ROW_Y['B']);
  add('B52', funcX(1), ROW_Y['B']);
  add('B53', funcX(2), ROW_Y['B']);
  add('B54', funcX(3), ROW_Y['B'], STD_SIZE, RETURN_HEIGHT);

  // A-row (bottom)
  add('A5', mainX(3), ROW_Y['A'], SPACE_WIDTH);
  add('A47', navX(0), ROW_Y['A']);
  add('A48', navX(1), ROW_Y['A']);
  add('A49', navX(2), ROW_Y['A']);
  add('A51', funcX(0), ROW_Y['A'], KP0_WIDTH);
  add('A53', funcX(2), ROW_Y['A']);

  return layouts;
}

const ALL_LAYOUTS = buildKeyLayouts();

// Compact mode: only show special/function keys (orange/brown), not alphanumeric
const COMPACT_GRID_POSITIONS = new Set([
  // G-row: all special keys
  'G0', 'G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8',
  'G9', 'G10', 'G11', 'G12', 'G13', 'G14',
  'G47', 'G48', 'G49', 'G51', 'G52', 'G53', 'G54',
  // F-row: function keys
  'F47', 'F48', 'F49', 'F51', 'F52', 'F53', 'F54',
  // Nav and function keys from other rows
  'E47', 'E48', 'E49', 'E51', 'E52', 'E53', 'E54',
  'D47', 'D48', 'D49', 'D99',
  'C47', 'C48', 'C49', 'C99',
  'B47', 'B48', 'B49',
  'A47', 'A48', 'A49',
  // Important keys
  'E13', 'E14', 'D13', 'C13',
]);

export class VirtualKeyboard {
  private _container: HTMLElement;
  private _svgRoot: SVGSVGElement | null = null;
  private _terminals: AttachedTerminal[] = [];
  private _activeTerminal: Terminal | null = null;
  private _layout: VirtualKeyboardLayout = 'full';
  private _language: LanguageCode = 'no';
  private _visible: boolean = false;
  private _keyElements: Map<string, SVGGElement> = new Map();

  // LED state
  private _ledClear: boolean = false;
  private _ledSet: boolean = false;
  private _ledBlink: boolean = false;

  // Modifier state for virtual clicks
  private _shiftActive: boolean = false;
  private _ctrlActive: boolean = false;

  constructor(container: HTMLElement) {
    this._container = container;
    this.render();
  }

  // --- Terminal management ---

  attachTerminal(terminal: Terminal, label: string): void {
    this._terminals.push({ terminal, label });
    if (this._terminals.length === 1) {
      this._activeTerminal = terminal;
    }
    this.updateSelector();
  }

  detachTerminal(terminal: Terminal): void {
    const idx = this._terminals.findIndex(t => t.terminal === terminal);
    if (idx >= 0) {
      this._terminals.splice(idx, 1);
      if (this._activeTerminal === terminal) {
        this._activeTerminal = this._terminals.length > 0 ? this._terminals[0].terminal : null;
      }
      this.updateSelector();
    }
  }

  selectTerminal(terminal: Terminal): void {
    this._activeTerminal = terminal;
    this.updateSelector();
  }

  // --- Layout and visibility ---

  setLayout(mode: VirtualKeyboardLayout): void {
    if (this._layout === mode) return;
    this._layout = mode;
    this.render();
  }

  setLanguage(lang: LanguageCode): void {
    if (this._language === lang) return;
    this._language = lang;
    this.updateLabels();
  }

  show(): void { this._visible = true; this._container.style.display = 'block'; }
  hide(): void { this._visible = false; this._container.style.display = 'none'; }
  toggle(): void { this._visible ? this.hide() : this.show(); }

  get visible(): boolean { return this._visible; }
  get layout(): VirtualKeyboardLayout { return this._layout; }
  get language(): LanguageCode { return this._language; }

  // --- LED state ---
  updateLEDs(clear: boolean, set: boolean, blink: boolean): void {
    this._ledClear = clear;
    this._ledSet = set;
    this._ledBlink = blink;
  }

  // --- Rendering ---

  private render(): void {
    this._container.innerHTML = '';
    this._keyElements.clear();

    const layouts = this._layout === 'compact'
      ? ALL_LAYOUTS.filter(l => COMPACT_GRID_POSITIONS.has(l.gridPos))
      : ALL_LAYOUTS;

    // Compute bounding box for viewBox
    let maxX = 0, maxY = 0;
    for (let i = 0; i < layouts.length; i++) {
      const l = layouts[i];
      const r = l.x + l.width;
      const b = l.y + l.height;
      if (r > maxX) maxX = r;
      if (b > maxY) maxY = b;
    }

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${maxX + 10} ${maxY + 10}`);
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.userSelect = 'none';
    svg.classList.add('retroterm-vk');
    this._svgRoot = svg;

    // Background
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('width', String(maxX + 10));
    bg.setAttribute('height', String(maxY + 10));
    bg.setAttribute('fill', '#2a2a2a');
    bg.setAttribute('rx', '8');
    svg.appendChild(bg);

    // Render keys
    for (let i = 0; i < layouts.length; i++) {
      const layout = layouts[i];
      const keyDef = TDV2200KeyRegistry.getKey(layout.gridPos);
      if (!keyDef) continue;

      const g = this.createKeyElement(layout, keyDef);
      svg.appendChild(g);
      this._keyElements.set(layout.gridPos, g);
    }

    this._container.appendChild(svg);

    // Terminal selector (if multiple terminals)
    this.updateSelector();
  }

  private createKeyElement(layout: KeyLayout, keyDef: TDVKeyDefinition): SVGGElement {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('data-grid', layout.gridPos);
    g.style.cursor = 'pointer';

    // Key background
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', String(layout.x));
    rect.setAttribute('y', String(layout.y));
    rect.setAttribute('width', String(layout.width));
    rect.setAttribute('height', String(layout.height));
    rect.setAttribute('rx', '4');
    rect.setAttribute('fill', this.getKeyColor(keyDef.color));
    rect.setAttribute('stroke', '#555');
    rect.setAttribute('stroke-width', '1');
    g.appendChild(rect);

    // Key label
    const label = TDV2200KeyRegistry.getLabel(layout.gridPos, this._language);
    if (label && label.primary) {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', String(layout.x + layout.width / 2));
      text.setAttribute('y', String(layout.y + layout.height / 2 + 4));
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('fill', this.getTextColor(keyDef.color));
      text.setAttribute('font-size', label.primary.length > 4 ? '9' : '11');
      text.setAttribute('font-family', 'sans-serif');
      text.setAttribute('font-weight', 'bold');
      text.textContent = label.primary;
      g.appendChild(text);

      // Shifted label (smaller, top-right)
      if (label.shifted) {
        const shiftText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        shiftText.setAttribute('x', String(layout.x + layout.width - 4));
        shiftText.setAttribute('y', String(layout.y + 12));
        shiftText.setAttribute('text-anchor', 'end');
        shiftText.setAttribute('fill', this.getTextColor(keyDef.color));
        shiftText.setAttribute('font-size', '8');
        shiftText.setAttribute('font-family', 'sans-serif');
        shiftText.setAttribute('opacity', '0.7');
        shiftText.textContent = label.shifted;
        g.appendChild(shiftText);
      }
    }

    // Click handler
    g.addEventListener('mousedown', (ev) => {
      ev.preventDefault();
      this.handleKeyClick(layout.gridPos, keyDef);
      rect.setAttribute('fill', this.getPressedColor(keyDef.color));
    });
    g.addEventListener('mouseup', () => {
      rect.setAttribute('fill', this.getKeyColor(keyDef.color));
    });
    g.addEventListener('mouseleave', () => {
      rect.setAttribute('fill', this.getKeyColor(keyDef.color));
    });

    return g;
  }

  private handleKeyClick(gridPos: string, keyDef: TDVKeyDefinition): void {
    if (!this._activeTerminal) return;

    // Handle modifier keys
    if (keyDef.flags & TDVKeyFlags.IsModifier) {
      if (keyDef.name === 'LSHIFT' || keyDef.name === 'RSHIFT') {
        this._shiftActive = !this._shiftActive;
      } else if (keyDef.name === 'CTRL') {
        this._ctrlActive = !this._ctrlActive;
      }
      return;
    }

    // Handle toggle keys (CAPS, LOCK)
    if (keyDef.flags & TDVKeyFlags.IsToggle) {
      return; // Toggle state handled by emulator
    }

    // Get sequence from registry
    const seq = TDV2200KeyRegistry.getSequence(
      gridPos, true, false,
      this._shiftActive, this._ctrlActive,
    );

    if (seq !== null) {
      // Send via onKey event with a synthetic KeyboardEvent
      const syntheticEvent = new KeyboardEvent('keydown', {
        key: seq,
        bubbles: false,
        cancelable: true,
      });
      // Fire through Terminal's onKey
      this._activeTerminal.write(''); // Trigger focus
      // Encode sequence as bytes and send via onData path
      const bytes = new Uint8Array(seq.length);
      for (let i = 0; i < seq.length; i++) {
        bytes[i] = seq.charCodeAt(i);
      }
      // Emit through the terminal's data pipeline
      (this._activeTerminal as any)._onKey?.fire({ key: seq, domEvent: syntheticEvent });
    }

    // Reset modifiers after key press (sticky behavior)
    this._shiftActive = false;
    this._ctrlActive = false;
  }

  private getKeyColor(color: TDVKeyColor): string {
    switch (color) {
      case TDVKeyColor.Orange: return '#c87828';
      case TDVKeyColor.Brown: return '#8b6914';
      case TDVKeyColor.White:
      default: return '#d4d4d4';
    }
  }

  private getPressedColor(color: TDVKeyColor): string {
    switch (color) {
      case TDVKeyColor.Orange: return '#a06020';
      case TDVKeyColor.Brown: return '#705510';
      case TDVKeyColor.White:
      default: return '#aaaaaa';
    }
  }

  private getTextColor(color: TDVKeyColor): string {
    switch (color) {
      case TDVKeyColor.Orange:
      case TDVKeyColor.Brown: return '#ffffff';
      case TDVKeyColor.White:
      default: return '#222222';
    }
  }

  private updateLabels(): void {
    for (const [gridPos, g] of this._keyElements) {
      const label = TDV2200KeyRegistry.getLabel(gridPos, this._language);
      const texts = g.querySelectorAll('text');
      if (texts.length > 0 && label && label.primary) {
        texts[0].textContent = label.primary;
      }
      if (texts.length > 1 && label && label.shifted) {
        texts[1].textContent = label.shifted;
      }
    }
  }

  private updateSelector(): void {
    // Remove existing selector
    const existing = this._container.querySelector('.retroterm-vk-selector');
    if (existing) existing.remove();

    if (this._terminals.length <= 1) return;

    const select = document.createElement('select');
    select.className = 'retroterm-vk-selector';
    select.style.cssText = 'position:absolute;top:4px;right:4px;font-size:12px;';

    for (let i = 0; i < this._terminals.length; i++) {
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = this._terminals[i].label;
      if (this._terminals[i].terminal === this._activeTerminal) {
        opt.selected = true;
      }
      select.appendChild(opt);
    }

    select.addEventListener('change', () => {
      const idx = parseInt(select.value, 10);
      if (idx >= 0 && idx < this._terminals.length) {
        this._activeTerminal = this._terminals[idx].terminal;
      }
    });

    this._container.style.position = 'relative';
    this._container.appendChild(select);
  }

  /** Clean up DOM elements */
  dispose(): void {
    this._container.innerHTML = '';
    this._keyElements.clear();
    this._terminals.length = 0;
    this._activeTerminal = null;
    this._svgRoot = null;
  }
}
