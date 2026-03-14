/**
 * Main Terminal class — xterm.js-compatible API surface.
 *
 * Usage:
 *   const term = new Terminal({ rows: 24, cols: 80 });
 *   term.open(document.getElementById('container'));
 *   term.write('Hello, World!');
 *   term.onKey(ev => ws.send(ev.key));
 *
 * Supports runtime emulator switching:
 *   term.setEmulatorType('tdv2200');
 */

import { TerminalEmulatorBase } from '../emulators/TerminalEmulatorBase';
import { TDV2215Emulator } from '../emulators/tdv/TDV2215Emulator';
import { TDV2200Emulator } from '../emulators/tdv/TDV2200Emulator';
import { CanvasRenderer } from '../renderer/CanvasRenderer';
import type { TerminalOptions, TerminalTheme } from './TerminalOptions';
import { Themes } from './TerminalOptions';
import type { IDisposable } from './Disposable';
import { EventEmitter, toDisposable } from './Disposable';
import { BellHandler } from '../features/BellHandler';
import { SelectionManager } from '../features/SelectionManager';
import { ClipboardManager } from '../features/ClipboardManager';
import { ScrollbackSearch } from '../features/ScrollbackSearch';
import { TDVKeyboardMapper } from '../keyboard/TDVKeyboardMapper';
import { domKeyToVK, domModifiersToFlags, TerminalModes } from '../keyboard/KeyboardMapper';

export type EmulatorType = 'vt100' | 'tdv2215' | 'tdv2200';

export class Terminal {
  private _options: TerminalOptions;
  private _emulator: TerminalEmulatorBase;
  private _renderer: CanvasRenderer | null = null;
  private _container: HTMLElement | null = null;
  private _cols: number;
  private _rows: number;
  private _emulatorType: EmulatorType;
  private _disposed: boolean = false;

  // Scrollback
  private _scrollOffset: number = 0;
  private _pixelScrollAccumulator: number = 0;

  // Features
  private _bellHandler: BellHandler;
  private _selectionManager: SelectionManager;
  private _clipboardManager: ClipboardManager;
  private _scrollbackSearch: ScrollbackSearch;
  private _tdvKeyboardMapper: TDVKeyboardMapper;

  // Events
  private readonly _onKey = new EventEmitter<{ key: string; domEvent: KeyboardEvent }>();
  private readonly _onData = new EventEmitter<Uint8Array>();
  private readonly _onBell = new EventEmitter<void>();
  private readonly _onTitleChange = new EventEmitter<string>();
  private _renderFrameId: number = 0;

  constructor(opts?: Partial<TerminalOptions>) {
    this._options = {
      cols: opts?.cols ?? 80,
      rows: opts?.rows ?? 24,
      scrollback: opts?.scrollback ?? 10000,
      fontFamily: opts?.fontFamily ?? 'monospace',
      fontSize: opts?.fontSize ?? 16,
      theme: opts?.theme ?? Themes.green,
      cursorStyle: opts?.cursorStyle ?? 'block',
      cursorBlink: opts?.cursorBlink ?? true,
      emulatorType: opts?.emulatorType ?? 'vt100',
      useBitmapFont: opts?.useBitmapFont,
      bellVolume: opts?.bellVolume,
      bellFrequency: opts?.bellFrequency,
      bellDuration: opts?.bellDuration,
    };

    this._cols = this._options.cols!;
    this._rows = this._options.rows!;
    this._emulatorType = this._options.emulatorType as EmulatorType ?? 'vt100';

    // Initialize features
    this._bellHandler = new BellHandler({
      volume: this._options.bellVolume ?? 0.3,
      frequency: this._options.bellFrequency ?? 800,
      duration: this._options.bellDuration ?? 100,
    });
    this._selectionManager = new SelectionManager();
    this._clipboardManager = new ClipboardManager();
    this._scrollbackSearch = new ScrollbackSearch();
    this._tdvKeyboardMapper = new TDVKeyboardMapper();

    // Wire selection change to re-render
    this._selectionManager.onChange = () => {
      this.scheduleRender();
    };

    // Wire search results to re-render
    this._scrollbackSearch.onResults = () => {
      this.scheduleRender();
    };

    // Create emulator
    this._emulator = this.createEmulator(this._emulatorType);
    this.wireEmulatorEvents();
  }

  // --- xterm.js-compatible properties ---

  get element(): HTMLElement | null { return this._container; }
  get rows(): number { return this._rows; }
  get cols(): number { return this._cols; }
  get options(): TerminalOptions {
    // Return a Proxy so that property-level assignment (e.g. term.options.fontSize = 20)
    // triggers the same update logic as the bulk setter, matching xterm.js behaviour.
    const self = this;
    return new Proxy(this._options, {
      set(target, prop: string, value: unknown): boolean {
        (target as any)[prop] = value;
        switch (prop) {
          case 'theme':
            if (self._renderer && value) {
              self._renderer.setTheme(value as TerminalTheme);
              self.scheduleRender();
            }
            break;
          case 'fontFamily':
          case 'fontSize':
            // Bitmap fonts are fixed per emulator — store value silently (no-op render)
            break;
          case 'bellVolume':
            self._bellHandler.setOptions({ volume: value as number });
            break;
          case 'bellFrequency':
            self._bellHandler.setOptions({ frequency: value as number });
            break;
          case 'bellDuration':
            self._bellHandler.setOptions({ duration: value as number });
            break;
        }
        return true;
      }
    });
  }
  set options(opts: TerminalOptions) {
    // Bulk setter for backward compatibility
    if (opts.theme && this._renderer) {
      this._renderer.setTheme(opts.theme);
      this._options.theme = opts.theme;
      this.scheduleRender();
    }
    if (opts.fontFamily !== undefined) {
      this._options.fontFamily = opts.fontFamily;
    }
    if (opts.fontSize !== undefined) {
      this._options.fontSize = opts.fontSize;
    }
    if (opts.bellVolume !== undefined) {
      this._options.bellVolume = opts.bellVolume;
      this._bellHandler.setOptions({ volume: opts.bellVolume });
    }
    if (opts.bellFrequency !== undefined) {
      this._options.bellFrequency = opts.bellFrequency;
      this._bellHandler.setOptions({ frequency: opts.bellFrequency });
    }
    if (opts.bellDuration !== undefined) {
      this._options.bellDuration = opts.bellDuration;
      this._bellHandler.setOptions({ duration: opts.bellDuration });
    }
  }

  // --- Feature accessors ---

  /** Get the selection manager (for external selection queries) */
  get selectionManager(): SelectionManager { return this._selectionManager; }

  /** Get the scrollback search (for external search control) */
  get searchManager(): ScrollbackSearch { return this._scrollbackSearch; }

  /** Get the bell handler */
  get bellHandler(): BellHandler { return this._bellHandler; }

  // --- Lifecycle ---

  /** Mount the terminal into a DOM container */
  open(container: HTMLElement): void {
    if (this._disposed) throw new Error('Terminal is disposed');
    this._container = container;

    // Create renderer
    this._renderer = new CanvasRenderer(
      container,
      this._cols,
      this._rows,
      this._options.theme ?? Themes.green,
      this._options.fontFamily,
      this._options.fontSize,
    );

    // All emulators use bitmap fonts
    this._renderer.setUseBitmapFont(true, this._emulatorType);

    // If CSS fit couldn't be applied yet (container has zero dimensions),
    // the first render will be skipped. Re-trigger when fit is ready.
    this._renderer.onFitReady = () => this.scheduleRender();

    // Set up keyboard handler
    this._renderer.canvas.addEventListener('keydown', this.handleKeyDown);
    this._renderer.canvas.addEventListener('keypress', this.handleKeyPress);

    // Set up mouse handlers for selection
    this._renderer.canvas.addEventListener('mousedown', this.handleMouseDown);
    this._renderer.canvas.addEventListener('mousemove', this.handleMouseMove);
    this._renderer.canvas.addEventListener('mouseup', this.handleMouseUp);
    this._renderer.canvas.addEventListener('contextmenu', this.handleContextMenu);

    // Set up wheel handler for scrollback
    this._renderer.canvas.addEventListener('wheel', this.handleWheel, { passive: false });

    // Initial render
    this.scheduleRender();
  }

  /** Write data followed by CRLF (xterm.js compatible) */
  writeln(data: string): void {
    this.write(data + '\r\n');
  }

  /** Write data to the terminal (output from host) */
  write(data: string | Uint8Array): void {
    if (this._disposed) return;
    this._scrollOffset = 0;
    if (typeof data === 'string') {
      const bytes = new Uint8Array(data.length);
      for (let i = 0; i < data.length; i++) {
        bytes[i] = data.charCodeAt(i);
      }
      this._emulator.processData(bytes);
    } else {
      this._emulator.processData(data);
    }
    this.scheduleRender();
  }

  /** Register a key handler (xterm.js compatible) */
  onKey(handler: (ev: { key: string; domEvent: KeyboardEvent }) => void): IDisposable {
    return this._onKey.on(handler);
  }

  /** Register a binary data handler (for DA/DSR responses) */
  onData(handler: (data: Uint8Array) => void): IDisposable {
    return this._onData.on(handler);
  }

  /** Register a bell handler */
  onBell(handler: () => void): IDisposable {
    return this._onBell.on(handler);
  }

  /** Register a title change handler */
  onTitleChange(handler: (title: string) => void): IDisposable {
    return this._onTitleChange.on(handler);
  }

  /** Refresh a range of rows (triggers re-render) */
  refresh(_start: number, _end: number): void {
    this.scheduleRender();
  }

  /** Resize the terminal */
  resize(cols: number, rows: number): void {
    this._cols = cols;
    this._rows = rows;
    this._emulator.resize(cols, rows);
    if (this._renderer) {
      this._renderer.resize(cols, rows);
    }
    this.scheduleRender();
  }

  /** Focus the terminal */
  focus(): void {
    if (this._renderer) {
      this._renderer.canvas.focus();
    }
  }

  /** Clean up the terminal */
  dispose(): void {
    if (this._disposed) return;
    this._disposed = true;

    if (this._renderFrameId) {
      cancelAnimationFrame(this._renderFrameId);
    }
    if (this._renderer) {
      this._renderer.canvas.removeEventListener('keydown', this.handleKeyDown);
      this._renderer.canvas.removeEventListener('keypress', this.handleKeyPress);
      this._renderer.canvas.removeEventListener('mousedown', this.handleMouseDown);
      this._renderer.canvas.removeEventListener('mousemove', this.handleMouseMove);
      this._renderer.canvas.removeEventListener('mouseup', this.handleMouseUp);
      this._renderer.canvas.removeEventListener('contextmenu', this.handleContextMenu);
      this._renderer.canvas.removeEventListener('wheel', this.handleWheel);
      this._renderer.dispose();
      this._renderer = null;
    }
    this._bellHandler.dispose();
    this._onKey.clear();
    this._onData.clear();
    this._onBell.clear();
    this._onTitleChange.clear();
    this._container = null;
  }

  /** xterm.js-compatible addon loading — calls activate() if present */
  loadAddon(addon: any): void {
    if (addon && typeof addon.activate === 'function') {
      addon.activate(this);
    }
  }

  /** No-op compatibility with xterm.js WebGL */
  clearTextureAtlas(): void {
    // No-op
  }

  // --- RetroTerm extensions ---

  /** Switch emulator type at runtime */
  setEmulatorType(type: EmulatorType): void {
    if (type === this._emulatorType) return;
    this._emulatorType = type;
    this._emulator = this.createEmulator(type);
    this.wireEmulatorEvents();
    if (this._renderer) {
      this._renderer.setUseBitmapFont(true, type);
    }
    this.scheduleRender();
  }

  /** Get the current emulator instance */
  getEmulator(): TerminalEmulatorBase {
    return this._emulator;
  }

  /** Get the current emulator type */
  getEmulatorType(): EmulatorType {
    return this._emulatorType;
  }

  /** Set the keyboard language for ISO 646 character remapping */
  setKeyboardLanguage(language: string): void {
    this._tdvKeyboardMapper.language = language as any;
  }

  /** Get the renderer (for FitAddon and external use) */
  getRenderer(): CanvasRenderer | null {
    return this._renderer;
  }

  /** Get selected text, if any */
  getSelectedText(): string {
    return this._selectionManager.getSelectedText(this._emulator.buffer, this._cols, this._scrollOffset);
  }

  /** Check if a selection exists */
  hasSelection(): boolean {
    return this._selectionManager.hasSelection;
  }

  /** Clear any active selection */
  clearSelection(): void {
    this._selectionManager.clearSelection();
  }

  /** Search the terminal buffer for a term */
  search(term: string, options?: { caseSensitive?: boolean; regex?: boolean; wrapAround?: boolean }): number {
    this._scrollbackSearch.search(this._emulator.buffer, this._cols, this._rows, term, options);
    return this._scrollbackSearch.matchCount;
  }

  /** Find next search match */
  findNext(): void {
    this._scrollbackSearch.findNext();
  }

  /** Find previous search match */
  findPrevious(): void {
    this._scrollbackSearch.findPrevious();
  }

  /** Clear search results */
  clearSearch(): void {
    this._scrollbackSearch.clear();
  }

  // --- Scrollback ---

  /** Current scroll offset (0 = bottom/live, positive = scrolled up) */
  get scrollOffset(): number { return this._scrollOffset; }

  /** Scroll to a specific offset (0 = bottom) */
  scrollTo(offset: number): void {
    const maxOffset = this._emulator.buffer.scrollbackLineCount;
    this._scrollOffset = Math.max(0, Math.min(maxOffset, offset));
    this.scheduleRender();
  }

  /** Scroll to the bottom (live view) */
  scrollToBottom(): void {
    this._scrollOffset = 0;
    this.scheduleRender();
  }

  // --- Internal ---

  private createEmulator(type: EmulatorType): TerminalEmulatorBase {
    switch (type) {
      case 'tdv2215':
        return new TDV2215Emulator(this._cols, this._rows);
      case 'tdv2200':
        return new TDV2200Emulator(this._cols, this._rows);
      case 'vt100':
      default:
        return new TerminalEmulatorBase(this._cols, this._rows, this._options.scrollback);
    }
  }

  private wireEmulatorEvents(): void {
    this._emulator.onDataToSend.on((data) => {
      this._onData.fire(data);
    });
    this._emulator.onBell.on(() => {
      this._bellHandler.ring();
      this._onBell.fire();
    });
    this._emulator.onTitleChanged.on((title) => {
      this._onTitleChange.fire(title);
    });
    this._emulator.onInvalidated.on(() => {
      this.scheduleRender();
    });
  }

  private scheduleRender(): void {
    if (this._renderFrameId || !this._renderer) return;
    this._renderFrameId = requestAnimationFrame(() => {
      this._renderFrameId = 0;
      if (this._renderer) {
        this._renderer.syncCharacterSetVariant(this._emulator.characterSetVariant);
        this._renderer.invalidate();
        this._renderer.render(
          this._emulator.buffer,
          this._emulator.cursor,
          this._selectionManager,
          this._scrollbackSearch,
          this._scrollOffset,
        );
      }
    });
  }

  private handleKeyDown = (ev: KeyboardEvent): void => {
    // Ctrl+Shift+C — copy selection
    if (ev.ctrlKey && ev.shiftKey && ev.key === 'C') {
      if (this._selectionManager.hasSelection) {
        const text = this.getSelectedText();
        if (text) {
          this._clipboardManager.copyText(text);
        }
        ev.preventDefault();
        return;
      }
    }

    // Ctrl+Shift+V — paste
    if (ev.ctrlKey && ev.shiftKey && ev.key === 'V') {
      this._clipboardManager.readText().then((text) => {
        if (text) {
          this._onKey.fire({ key: text, domEvent: ev });
        }
      });
      ev.preventDefault();
      return;
    }

    // Ctrl+Shift+F — search (toggle)
    if (ev.ctrlKey && ev.shiftKey && ev.key === 'F') {
      ev.preventDefault();
      return;
    }

    // Build escape sequence from key event
    const key = this.mapKeyToSequence(ev);
    if (key) {
      ev.preventDefault();
      // Clear selection on typing
      if (this._selectionManager.hasSelection) {
        this._selectionManager.clearSelection();
      }
      this._onKey.fire({ key, domEvent: ev });
    }
  };

  private handleKeyPress = (ev: KeyboardEvent): void => {
    // For regular character input (not handled by keydown)
    if (ev.key.length === 1 && !ev.ctrlKey && !ev.altKey && !ev.metaKey) {
      ev.preventDefault();
      // Apply ISO 646 national character remapping for TDV modes
      let key = ev.key;
      if (this._emulatorType === 'tdv2200' || this._emulatorType === 'tdv2215') {
        key = this._tdvKeyboardMapper.remapCharacter(key);
      }
      this._onKey.fire({ key, domEvent: ev });
    }
  };

  // --- Mouse handlers for selection ---

  private pixelToCell(ev: MouseEvent): { row: number; col: number } {
    if (!this._renderer) return { row: 0, col: 0 };
    const canvas = this._renderer.canvas;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (ev.clientX - rect.left) * scaleX;
    const y = (ev.clientY - rect.top) * scaleY;
    const col = Math.min(Math.max(0, Math.floor(x / this._renderer.renderCellWidth)), this._cols - 1);
    const row = Math.min(Math.max(0, Math.floor(y / this._renderer.renderCellHeight)), this._rows - 1);
    return { row, col };
  }

  private handleMouseDown = (ev: MouseEvent): void => {
    if (ev.button !== 0) return;
    const { row, col } = this.pixelToCell(ev);
    this._selectionManager.startSelection(row, col, ev.altKey);
  };

  private handleMouseMove = (ev: MouseEvent): void => {
    if (!(ev.buttons & 1)) return;
    const { row, col } = this.pixelToCell(ev);
    this._selectionManager.updateSelection(row, col);
  };

  private handleMouseUp = (_ev: MouseEvent): void => {
    this._selectionManager.endSelection();
  };

  /** Right-click: copy selection if any, otherwise paste from clipboard */
  private handleContextMenu = (ev: MouseEvent): void => {
    ev.preventDefault();
    if (this._selectionManager.hasSelection) {
      const text = this.getSelectedText();
      if (text) {
        this._clipboardManager.copyText(text);
      }
      this._selectionManager.clearSelection();
      this.scheduleRender();
    } else {
      this._clipboardManager.readText().then((text) => {
        if (text) {
          this._onKey.fire({ key: text, domEvent: ev as unknown as KeyboardEvent });
        }
      });
    }
  };

  // --- Wheel handler for scrollback ---

  private handleWheel = (ev: WheelEvent): void => {
    ev.preventDefault();

    let lines = 0;
    switch (ev.deltaMode) {
      case WheelEvent.DOM_DELTA_PIXEL:
        // Trackpad: accumulate pixels, convert to lines
        this._pixelScrollAccumulator += ev.deltaY;
        const charHeight = this._renderer ? this._renderer.charHeight : 16;
        lines = Math.trunc(this._pixelScrollAccumulator / charHeight);
        this._pixelScrollAccumulator -= lines * charHeight;
        break;
      case WheelEvent.DOM_DELTA_LINE:
        lines = Math.round(ev.deltaY);
        break;
      case WheelEvent.DOM_DELTA_PAGE:
        lines = Math.round(ev.deltaY) * this._rows;
        break;
    }

    if (lines === 0) return;

    const maxOffset = this._emulator.buffer.scrollbackLineCount;
    const newOffset = Math.max(0, Math.min(maxOffset, this._scrollOffset - lines));
    if (newOffset !== this._scrollOffset) {
      this._scrollOffset = newOffset;
      this.scheduleRender();
    }
  };

  /** Map a keyboard event to an escape sequence string */
  private mapKeyToSequence(ev: KeyboardEvent): string | null {
    // TDV mode: delegate to TDV keyboard mapper
    if (this._emulatorType === 'tdv2200' || this._emulatorType === 'tdv2215') {
      const vk = domKeyToVK(ev.key);
      if (vk !== 0) {
        const modifiers = domModifiersToFlags(ev);
        const modes = this._emulatorType === 'tdv2200'
          ? TerminalModes.TDV2200Mode
          : TerminalModes.TDV2215Mode;
        const seq = this._tdvKeyboardMapper.mapKey(vk, modifiers, modes);
        if (seq !== null) return seq;
      }
      // Fall through to VT100 mapping for unmapped keys
    }

    const appCursor = this._emulator.applicationCursorKeys;

    // Ctrl+key combinations
    if (ev.ctrlKey && !ev.altKey && !ev.metaKey) {
      if (ev.key.length === 1) {
        const code = ev.key.toUpperCase().charCodeAt(0);
        if (code >= 0x40 && code <= 0x5F) {
          return String.fromCharCode(code - 0x40);
        }
      }
    }

    // Special keys
    switch (ev.key) {
      case 'Enter': return '\r';
      case 'Backspace': return '\x7F';
      case 'Tab': return '\t';
      case 'Escape': return '\x1b';
      case 'ArrowUp': return appCursor ? '\x1bOA' : '\x1b[A';
      case 'ArrowDown': return appCursor ? '\x1bOB' : '\x1b[B';
      case 'ArrowRight': return appCursor ? '\x1bOC' : '\x1b[C';
      case 'ArrowLeft': return appCursor ? '\x1bOD' : '\x1b[D';
      case 'Home': return '\x1b[H';
      case 'End': return '\x1b[F';
      case 'PageUp': return '\x1b[5~';
      case 'PageDown': return '\x1b[6~';
      case 'Insert': return '\x1b[2~';
      case 'Delete': return '\x1b[3~';
      case 'F1': return '\x1bOP';
      case 'F2': return '\x1bOQ';
      case 'F3': return '\x1bOR';
      case 'F4': return '\x1bOS';
      case 'F5': return '\x1b[15~';
      case 'F6': return '\x1b[17~';
      case 'F7': return '\x1b[18~';
      case 'F8': return '\x1b[19~';
      case 'F9': return '\x1b[20~';
      case 'F10': return '\x1b[21~';
      case 'F11': return '\x1b[23~';
      case 'F12': return '\x1b[24~';
    }

    // Regular character
    if (ev.key.length === 1 && !ev.ctrlKey && !ev.altKey && !ev.metaKey) {
      return ev.key;
    }

    return null;
  }
}

/** FitAddon-compatible class (built-in) */
export class FitAddon {
  private _terminal: Terminal | null = null;

  activate(terminal: Terminal): void {
    this._terminal = terminal;
  }

  /** Calculate optimal dimensions for the terminal container */
  proposeDimensions(): { cols: number; rows: number } | undefined {
    if (!this._terminal || !this._terminal.element) return undefined;
    const container = this._terminal.element;
    const rect = container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return undefined;

    // Use actual font metrics from renderer when available
    const renderer = this._terminal.getRenderer();
    const charWidth = renderer ? renderer.charWidth : 8;
    const charHeight = renderer ? renderer.charHeight : 16;
    const cols = Math.max(1, Math.floor(rect.width / charWidth));
    const rows = Math.max(1, Math.floor(rect.height / charHeight));
    return { cols, rows };
  }

  /** Resize the terminal to fit its container */
  fit(): void {
    const dims = this.proposeDimensions();
    if (dims && this._terminal) {
      this._terminal.resize(dims.cols, dims.rows);
    }
  }

  dispose(): void {
    this._terminal = null;
  }
}
