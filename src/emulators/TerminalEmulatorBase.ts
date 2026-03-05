/**
 * Base terminal emulator implementing VT100/ECMA-48 terminal emulation.
 * Port of the C# TerminalEmulatorBase class.
 *
 * Handles:
 * - Character output with attributes and colors
 * - Cursor movement and positioning
 * - Scroll regions (DECSTBM)
 * - SGR (Select Graphic Rendition) for colors and attributes
 * - DEC private modes (DECCKM, DECOM, DECAWM, DECTCEM, etc.)
 * - Erase operations (ED, EL, ECH, DCH)
 * - Insert/delete lines
 * - Character set designation (G0-G3)
 * - Tab stops
 * - Save/restore cursor (DECSC/DECRC)
 * - Alternate screen buffer
 * - Device status reports (DSR)
 */

import { TerminalBuffer } from '../buffer/TerminalBuffer';
import { TerminalCell } from '../buffer/TerminalCell';
import { CharacterAttributes, hasAttribute, setAttribute, clearAttribute } from '../buffer/CharacterAttributes';
import { TerminalColor } from '../buffer/TerminalColor';
import { EscapeSequenceParser } from '../parser/EscapeSequenceParser';
import { CursorState, CursorStyle } from './CursorState';
import { EventEmitter } from '../terminal/Disposable';

/** DEC Special Graphics character map (line drawing characters) */
const DEC_SPECIAL_GRAPHICS: Map<number, number> = new Map([
  [0x6A, 0x2518], // j -> ┘ (bottom-right corner)
  [0x6B, 0x2510], // k -> ┐ (top-right corner)
  [0x6C, 0x250C], // l -> ┌ (top-left corner)
  [0x6D, 0x2514], // m -> └ (bottom-left corner)
  [0x6E, 0x253C], // n -> ┼ (cross)
  [0x71, 0x2500], // q -> ─ (horizontal line)
  [0x74, 0x251C], // t -> ├ (left tee)
  [0x75, 0x2524], // u -> ┤ (right tee)
  [0x76, 0x2534], // v -> ┴ (bottom tee)
  [0x77, 0x252C], // w -> ┬ (top tee)
  [0x78, 0x2502], // x -> │ (vertical line)
  [0x61, 0x2592], // a -> ▒ (checkerboard)
  [0x66, 0x00B0], // f -> ° (degree symbol)
  [0x67, 0x00B1], // g -> ± (plus/minus)
  [0x79, 0x2264], // y -> ≤
  [0x7A, 0x2265], // z -> ≥
  [0x7B, 0x03C0], // { -> π
  [0x7C, 0x2260], // | -> ≠
  [0x7D, 0x00A3], // } -> £
  [0x7E, 0x00B7], // ~ -> · (middle dot)
  [0x60, 0x25C6], // ` -> ◆ (diamond)
  [0x6F, 0x23BA], // o -> ⎺ (horizontal scanline 1)
  [0x70, 0x23BB], // p -> ⎻ (horizontal scanline 3)
  [0x72, 0x23BC], // r -> ⎼ (horizontal scanline 7)
  [0x73, 0x23BD], // s -> ⎽ (horizontal scanline 9)
]);

export class TerminalEmulatorBase {
  readonly buffer: TerminalBuffer;
  cursor: CursorState;
  protected readonly parser: EscapeSequenceParser;

  // Current character attributes for new characters
  currentAttributes: CharacterAttributes = CharacterAttributes.None;
  currentForeground: TerminalColor = TerminalColor.Default;
  currentBackground: TerminalColor = TerminalColor.Default;
  currentCharacterSet: number = 0;

  // Scroll region
  scrollTop: number = 0;
  scrollBottom: number;

  // Terminal modes
  applicationCursorKeys: boolean = false;
  applicationKeypad: boolean = false;
  autoWrapMode: boolean = true;
  insertMode: boolean = false;
  newLineMode: boolean = false;
  reverseVideoMode: boolean = false;
  originMode: boolean = false;

  // Character set designation (G0-G3)
  characterSets: number[] = [0, 0, 0, 0];
  activeCharacterSet: number = 0;

  /** ISO 646 character set variant (0=International, overridden by TDV emulators) */
  get characterSetVariant(): number { return 0; }
  set characterSetVariant(_value: number) { /* override in derived */ }

  // Tab stops
  private _tabStops: boolean[];

  // Title
  private _title: string = 'RetroTerm';

  // Events
  readonly onInvalidated = new EventEmitter<void>();
  readonly onTitleChanged = new EventEmitter<string>();
  readonly onBell = new EventEmitter<void>();
  readonly onDataToSend = new EventEmitter<Uint8Array>();

  constructor(width: number, height: number, maxScrollback: number = 10000) {
    this.buffer = new TerminalBuffer(width, height, maxScrollback);
    this.cursor = new CursorState(height, width);
    this.scrollBottom = height - 1;
    this._tabStops = new Array(width).fill(false);
    this._initDefaultTabStops();

    this.parser = new EscapeSequenceParser();
    this.parser.onCharacter = (cp) => this.handleCharacter(cp);
    this.parser.onExecute = (ctrl) => this.handleExecute(ctrl);
    this.parser.onEscapeDispatch = (p) => this.handleEscapeSequence(p);
    this.parser.onCsiDispatch = (p) => this.handleCsiSequence(p);
    this.parser.onOscDispatch = (data) => this.handleOscSequence(data);

    this.resetToInitialState();
  }

  get width(): number { return this.buffer.width; }
  get height(): number { return this.buffer.height; }
  get title(): string { return this._title; }

  /** Maximum scrollback lines (virtual, can be overridden) */
  get maxScrollback(): number { return this.buffer.maxScrollbackLines; }

  /**
   * Process output data from the host.
   * This is the main entry point for terminal output.
   */
  processData(data: Uint8Array): void {
    this.parser.processBytes(data);
    this.onInvalidated.fire();
  }

  /** Reset terminal to initial state */
  reset(): void {
    if (this.buffer.isUsingAlternateBuffer) {
      this.buffer.switchToPrimaryBuffer();
    }
    this.buffer.clear();
    this.buffer.clearScrollback();
    this.cursor.reset();
    this.parser.reset();
    this.resetToInitialState();
    this.onInvalidated.fire();
  }

  /** Reset all modes and attributes to defaults */
  protected resetToInitialState(): void {
    this.currentAttributes = CharacterAttributes.None;
    this.currentForeground = TerminalColor.Default;
    this.currentBackground = TerminalColor.Default;
    this.currentCharacterSet = 0;
    this.scrollTop = 0;
    this.scrollBottom = this.height - 1;
    this.applicationCursorKeys = false;
    this.applicationKeypad = false;
    this.autoWrapMode = true;
    this.insertMode = false;
    this.newLineMode = false;
    this.reverseVideoMode = false;
    this.originMode = false;
    this.characterSets = [0, 0, 0, 0];
    this.activeCharacterSet = 0;
    this._initDefaultTabStops();
  }

  /** Resize the terminal */
  resize(newWidth: number, newHeight: number): void {
    this.buffer.resize(newWidth, newHeight);
    this.cursor = this.cursor.withNewDimensions(newHeight, newWidth);
    this.scrollTop = 0;
    this.scrollBottom = newHeight - 1;
    this.onInvalidated.fire();
  }

  /** Get the terminal type identifier */
  getTerminalType(): string { return 'Terminal'; }

  /** Get the terminal capabilities string */
  getTerminalCapabilities(): string { return 'Basic'; }

  // --- Control Character Handling ---

  protected handleExecute(control: number): void {
    switch (control) {
      case 0x07: // BEL
        this.onBell.fire();
        break;
      case 0x08: // BS (Backspace)
        this.cursor.moveBackward();
        break;
      case 0x09: // HT (Horizontal Tab)
        this.handleTab();
        break;
      case 0x0A: // LF (Line Feed)
      case 0x0B: // VT (Vertical Tab)
      case 0x0C: // FF (Form Feed)
        this.handleLineFeed();
        break;
      case 0x0D: // CR (Carriage Return)
        this.cursor.carriageReturn();
        if (this.newLineMode) {
          this.handleLineFeed();
        }
        break;
      case 0x0E: // SO (Shift Out — invoke G1)
        this.activeCharacterSet = 1;
        break;
      case 0x0F: // SI (Shift In — invoke G0)
        this.activeCharacterSet = 0;
        break;
    }
  }

  // --- ESC Sequence Handling ---

  protected handleEscapeSequence(parser: EscapeSequenceParser): void {
    const intermediates = parser.getIntermediates();
    const finalByte = parser.finalByte;

    if (intermediates.length > 0) {
      this.handleEscapeWithIntermediates(finalByte, intermediates);
      return;
    }

    switch (finalByte) {
      case 0x44: // ESC D — IND (Index)
        this.handleLineFeed();
        break;
      case 0x45: // ESC E — NEL (Next Line)
        this.cursor.carriageReturn();
        this.handleLineFeed();
        break;
      case 0x4D: // ESC M — RI (Reverse Index)
        this.handleReverseLineFeed();
        break;
      case 0x48: // ESC H — HTS (Set Tab Stop)
        if (this.cursor.column < this.width) {
          this._tabStops[this.cursor.column] = true;
        }
        break;
      case 0x37: // ESC 7 — DECSC (Save Cursor)
        this.cursor.save();
        break;
      case 0x38: // ESC 8 — DECRC (Restore Cursor)
        this.cursor.restore();
        break;
      case 0x63: // ESC c — RIS (Full Reset)
        this.reset();
        this.cursor.home();
        break;
      case 0x3D: // ESC = — DECKPAM (Application Keypad)
        this.applicationKeypad = true;
        break;
      case 0x3E: // ESC > — DECKPNM (Normal Keypad)
        this.applicationKeypad = false;
        break;
    }
  }

  /** Handle ESC sequences with intermediate bytes (character set designation) */
  protected handleEscapeWithIntermediates(finalByte: number, intermediates: number[]): void {
    if (intermediates.length === 0) return;

    const intermediate = intermediates[0];
    let gxIndex = -1;

    // Map intermediate byte to G0-G3
    switch (intermediate) {
      case 0x28: gxIndex = 0; break; // ( -> G0
      case 0x29: gxIndex = 1; break; // ) -> G1
      case 0x2A: gxIndex = 2; break; // * -> G2
      case 0x2B: gxIndex = 3; break; // + -> G3
    }

    if (gxIndex >= 0) {
      // Map final byte to character set
      switch (finalByte) {
        case 0x42: // B -> US ASCII
          this.characterSets[gxIndex] = 0;
          break;
        case 0x41: // A -> UK
          this.characterSets[gxIndex] = 1;
          break;
        case 0x30: // 0 -> DEC Special Graphics
          this.characterSets[gxIndex] = 2;
          break;
      }
    }
  }

  // --- CSI Sequence Handling ---

  protected handleCsiSequence(parser: EscapeSequenceParser): void {
    const privateMarker = parser.privateMarker;
    const finalByte = parser.finalByte;

    // DEC private modes
    if (privateMarker === 0x3F) { // '?'
      this.handleDecPrivateMode(finalByte, parser);
      return;
    }

    switch (finalByte) {
      case 0x41: // A — CUU (Cursor Up)
        this.cursor.moveUp(parser.getParam(0, 1));
        break;
      case 0x42: // B — CUD (Cursor Down)
        this.cursor.moveDown(parser.getParam(0, 1));
        break;
      case 0x43: // C — CUF (Cursor Forward)
        this.cursor.moveForward(parser.getParam(0, 1));
        break;
      case 0x44: // D — CUB (Cursor Backward)
        this.cursor.moveBackward(parser.getParam(0, 1));
        break;
      case 0x45: // E — CNL (Cursor Next Line)
        this.cursor.moveDown(parser.getParam(0, 1));
        this.cursor.carriageReturn();
        break;
      case 0x46: // F — CPL (Cursor Previous Line)
        this.cursor.moveUp(parser.getParam(0, 1));
        this.cursor.carriageReturn();
        break;
      case 0x47: // G — CHA (Cursor Horizontal Absolute)
        this.cursor.column = parser.getParam(0, 1) - 1;
        break;
      case 0x48: // H — CUP (Cursor Position)
      case 0x66: // f — HVP (Horizontal Vertical Position)
        {
          let row = parser.getParam(0, 1) - 1;
          const col = parser.getParam(1, 1) - 1;
          if (this.originMode) {
            row += this.scrollTop;
          }
          this.cursor.moveTo(row, col);
        }
        break;
      case 0x4A: // J — ED (Erase in Display)
        this.handleEraseInDisplay(parser.getParam(0, 0));
        break;
      case 0x4B: // K — EL (Erase in Line)
        this.handleEraseInLine(parser.getParam(0, 0));
        break;
      case 0x4C: // L — IL (Insert Lines)
        this.buffer.insertLines(this.cursor.row, parser.getParam(0, 1));
        break;
      case 0x4D: // M — DL (Delete Lines)
        this.buffer.deleteLines(this.cursor.row, parser.getParam(0, 1));
        break;
      case 0x50: // P — DCH (Delete Characters)
        this.deleteCharacters(this.cursor.row, this.cursor.column, parser.getParam(0, 1));
        break;
      case 0x58: // X — ECH (Erase Characters)
        this.eraseCharacters(this.cursor.row, this.cursor.column, parser.getParam(0, 1));
        break;
      case 0x64: // d — VPA (Vertical Position Absolute)
        this.cursor.row = parser.getParam(0, 1) - 1;
        break;
      case 0x6D: // m — SGR (Select Graphic Rendition)
        this.handleSgr(parser);
        break;
      case 0x6E: // n — DSR (Device Status Report)
        this.handleDeviceStatusReport(parser.getParam(0, 0));
        break;
      case 0x72: // r — DECSTBM (Set Top/Bottom Margins)
        {
          const top = parser.getParam(0, 0);
          const bottom = parser.getParam(1, 0);
          if (top === 0 && bottom === 0) {
            this.clearScrollingRegion();
          } else {
            this.setScrollRegion(top, bottom);
          }
        }
        break;
      case 0x73: // s — SCOSC (Save Cursor)
        this.cursor.save();
        break;
      case 0x75: // u — SCORC (Restore Cursor)
        this.cursor.restore();
        break;
      case 0x40: // @ — ICH (Insert Characters)
        this.insertCharacters(this.cursor.row, this.cursor.column, parser.getParam(0, 1));
        break;
      case 0x53: // S — SU (Scroll Up)
        {
          const count = parser.getParam(0, 1);
          for (let i = 0; i < count; i++) {
            this.scrollUp();
          }
        }
        break;
      case 0x54: // T — SD (Scroll Down)
        {
          const count = parser.getParam(0, 1);
          for (let i = 0; i < count; i++) {
            this.scrollDown();
          }
        }
        break;
      case 0x67: // g — TBC (Tab Clear)
        this.handleTabClear(parser.getParam(0, 0));
        break;
      case 0x68: // h — SM (Set Mode) — standard modes
        this.handleStandardMode(parser, true);
        break;
      case 0x6C: // l — RM (Reset Mode) — standard modes
        this.handleStandardMode(parser, false);
        break;
      case 0x71: // q — DECSCUSR (with SP intermediate)
        {
          const intermediates = parser.getIntermediates();
          if (intermediates.length > 0 && intermediates[0] === 0x20) { // SP
            this.handleCursorStyle(parser.getParam(0, 0));
          }
        }
        break;
    }
  }

  // --- DEC Private Mode Handling ---

  protected handleDecPrivateMode(finalByte: number, parser: EscapeSequenceParser): void {
    const enable = finalByte === 0x68; // 'h' = set, 'l' = reset
    if (finalByte !== 0x68 && finalByte !== 0x6C) return;

    const paramCount = parser.paramCount;
    for (let i = 0; i < paramCount; i++) {
      const mode = parser.getRawParam(i);
      switch (mode) {
        case 1: // DECCKM — Cursor Keys Mode
          this.applicationCursorKeys = enable;
          break;
        case 5: // DECSCNM — Screen Mode (Reverse Video)
          this.reverseVideoMode = enable;
          break;
        case 6: // DECOM — Origin Mode
          this.originMode = enable;
          this.cursor.home();
          break;
        case 7: // DECAWM — Auto Wrap Mode
          this.autoWrapMode = enable;
          this.cursor.autoWrap = enable;
          break;
        case 12: // Cursor blink
          // TODO
          break;
        case 25: // DECTCEM — Text Cursor Enable Mode
          this.cursor.visible = enable;
          break;
        case 47: // Alternate screen buffer
        case 1047:
          if (enable) {
            this.buffer.switchToAlternateBuffer();
          } else {
            this.buffer.switchToPrimaryBuffer();
          }
          break;
        case 1048: // Save/Restore cursor
          if (enable) {
            this.cursor.save();
          } else {
            this.cursor.restore();
          }
          break;
        case 1049: // Alternate screen buffer + save cursor
          if (enable) {
            this.cursor.save();
            this.buffer.switchToAlternateBuffer();
          } else {
            this.buffer.switchToPrimaryBuffer();
            this.cursor.restore();
          }
          break;
      }
    }
  }

  // --- SGR Handling ---

  protected handleSgr(parser: EscapeSequenceParser): void {
    const paramCount = parser.paramCount;

    // No parameters = reset
    if (paramCount === 0) {
      this.currentAttributes = CharacterAttributes.None;
      this.currentForeground = TerminalColor.Default;
      this.currentBackground = TerminalColor.Default;
      return;
    }

    for (let i = 0; i < paramCount; i++) {
      const param = parser.getRawParam(i);

      switch (param) {
        case 0: // Reset
          this.currentAttributes = CharacterAttributes.None;
          this.currentForeground = TerminalColor.Default;
          this.currentBackground = TerminalColor.Default;
          break;
        case 1: this.currentAttributes = setAttribute(this.currentAttributes, CharacterAttributes.Bold); break;
        case 2: this.currentAttributes = setAttribute(this.currentAttributes, CharacterAttributes.Dim); break;
        case 3: this.currentAttributes = setAttribute(this.currentAttributes, CharacterAttributes.Italic); break;
        case 4: this.currentAttributes = setAttribute(this.currentAttributes, CharacterAttributes.Underline); break;
        case 5: this.currentAttributes = setAttribute(this.currentAttributes, CharacterAttributes.Blink); break;
        case 7: this.currentAttributes = setAttribute(this.currentAttributes, CharacterAttributes.Reverse); break;
        case 8: this.currentAttributes = setAttribute(this.currentAttributes, CharacterAttributes.Hidden); break;
        case 9: this.currentAttributes = setAttribute(this.currentAttributes, CharacterAttributes.Strikethrough); break;

        case 22: // Normal intensity (clear bold + dim)
          this.currentAttributes = clearAttribute(this.currentAttributes, CharacterAttributes.Bold);
          this.currentAttributes = clearAttribute(this.currentAttributes, CharacterAttributes.Dim);
          break;
        case 23: this.currentAttributes = clearAttribute(this.currentAttributes, CharacterAttributes.Italic); break;
        case 24: this.currentAttributes = clearAttribute(this.currentAttributes, CharacterAttributes.Underline); break;
        case 25: this.currentAttributes = clearAttribute(this.currentAttributes, CharacterAttributes.Blink); break;
        case 27: this.currentAttributes = clearAttribute(this.currentAttributes, CharacterAttributes.Reverse); break;
        case 28: this.currentAttributes = clearAttribute(this.currentAttributes, CharacterAttributes.Hidden); break;
        case 29: this.currentAttributes = clearAttribute(this.currentAttributes, CharacterAttributes.Strikethrough); break;

        // Standard foreground colors (30-37)
        case 30: case 31: case 32: case 33:
        case 34: case 35: case 36: case 37:
          this.currentForeground = TerminalColor.fromIndex(param - 30);
          break;

        case 38: // Extended foreground
          i = this.handleExtendedColor(parser, i, true);
          break;

        case 39: // Default foreground
          this.currentForeground = TerminalColor.Default;
          break;

        // Standard background colors (40-47)
        case 40: case 41: case 42: case 43:
        case 44: case 45: case 46: case 47:
          this.currentBackground = TerminalColor.fromIndex(param - 40);
          break;

        case 48: // Extended background
          i = this.handleExtendedColor(parser, i, false);
          break;

        case 49: // Default background
          this.currentBackground = TerminalColor.Default;
          break;

        // Bright foreground colors (90-97)
        case 90: case 91: case 92: case 93:
        case 94: case 95: case 96: case 97:
          this.currentForeground = TerminalColor.fromIndex(param - 90 + 8);
          break;

        // Bright background colors (100-107)
        case 100: case 101: case 102: case 103:
        case 104: case 105: case 106: case 107:
          this.currentBackground = TerminalColor.fromIndex(param - 100 + 8);
          break;
      }
    }
  }

  /** Handle extended color (256-color or RGB) */
  private handleExtendedColor(parser: EscapeSequenceParser, index: number, isForeground: boolean): number {
    if (index + 1 >= parser.paramCount) return index;

    const mode = parser.getRawParam(index + 1);

    if (mode === 5 && index + 2 < parser.paramCount) {
      // 256-color: 38;5;N or 48;5;N
      const colorIndex = parser.getRawParam(index + 2);
      const color = TerminalColor.fromIndex(colorIndex);
      if (isForeground) {
        this.currentForeground = color;
      } else {
        this.currentBackground = color;
      }
      return index + 2;
    }

    if (mode === 2 && index + 4 < parser.paramCount) {
      // RGB: 38;2;R;G;B or 48;2;R;G;B
      const r = parser.getRawParam(index + 2);
      const g = parser.getRawParam(index + 3);
      const b = parser.getRawParam(index + 4);
      const color = TerminalColor.fromRgb(r, g, b);
      if (isForeground) {
        this.currentForeground = color;
      } else {
        this.currentBackground = color;
      }
      return index + 4;
    }

    return index;
  }

  // --- Erase Operations ---

  protected handleEraseInDisplay(mode: number): void {
    switch (mode) {
      case 0: // Clear from cursor to end of screen
        this.buffer.clearToEndOfLine(this.cursor.row, this.cursor.column);
        for (let row = this.cursor.row + 1; row < this.height; row++) {
          this.buffer.clearLine(row);
        }
        break;
      case 1: // Clear from start of screen to cursor
        for (let row = 0; row < this.cursor.row; row++) {
          this.buffer.clearLine(row);
        }
        this.buffer.clearFromStartOfLine(this.cursor.row, this.cursor.column);
        break;
      case 2: // Clear entire screen
        this.buffer.clear();
        break;
      case 3: // Clear entire screen + scrollback
        this.buffer.clear();
        this.buffer.clearScrollback();
        break;
    }
  }

  protected handleEraseInLine(mode: number): void {
    switch (mode) {
      case 0: // Erase from cursor to end of line
        this.buffer.clearToEndOfLine(this.cursor.row, this.cursor.column);
        break;
      case 1: // Erase from start of line to cursor
        this.buffer.clearFromStartOfLine(this.cursor.row, this.cursor.column);
        break;
      case 2: // Erase entire line
        this.buffer.clearLine(this.cursor.row);
        break;
    }
  }

  // --- Device Status Report ---

  protected handleDeviceStatusReport(mode: number): void {
    switch (mode) {
      case 5: // Status report — respond "OK"
        this.sendResponse(encodeResponse('\x1b[0n'));
        break;
      case 6: // Cursor position report
        this.sendResponse(encodeResponse(`\x1b[${this.cursor.row + 1};${this.cursor.column + 1}R`));
        break;
    }
  }

  // --- OSC Handling ---

  protected handleOscSequence(data: Uint8Array): void {
    // Parse Ps;Pt format
    let semicolonIndex = -1;
    for (let i = 0; i < data.length; i++) {
      if (data[i] === 0x3B) { // ';'
        semicolonIndex = i;
        break;
      }
    }

    if (semicolonIndex < 0) return;

    // Parse Ps (command number)
    let ps = 0;
    for (let i = 0; i < semicolonIndex; i++) {
      if (data[i] >= 0x30 && data[i] <= 0x39) {
        ps = ps * 10 + (data[i] - 0x30);
      }
    }

    // Extract Pt (text)
    const textBytes = data.subarray(semicolonIndex + 1);
    const text = new TextDecoder().decode(textBytes);

    switch (ps) {
      case 0: // Set icon name + window title
      case 2: // Set window title
        this._title = text;
        this.onTitleChanged.fire(text);
        break;
      case 1: // Set icon name (ignored)
        break;
    }
  }

  // --- Tab Handling ---

  /** Initialize default tab stops every 8 columns */
  private _initDefaultTabStops(): void {
    if (!this._tabStops) {
      this._tabStops = new Array(this.width).fill(false);
    }
    for (let i = 0; i < this.width; i++) {
      this._tabStops[i] = (i > 0 && i % 8 === 0);
    }
  }

  protected handleTab(): void {
    for (let col = this.cursor.column + 1; col < this.width; col++) {
      if (this._tabStops[col]) {
        this.cursor.column = col;
        return;
      }
    }
    this.cursor.column = this.width - 1;
  }

  /** TBC — Tab Clear */
  protected handleTabClear(mode: number): void {
    switch (mode) {
      case 0: // Clear tab stop at cursor position
        if (this.cursor.column < this.width) {
          this._tabStops[this.cursor.column] = false;
        }
        break;
      case 3: // Clear all tab stops
        for (let i = 0; i < this._tabStops.length; i++) {
          this._tabStops[i] = false;
        }
        break;
    }
  }

  /** SM/RM — Set/Reset standard (non-DEC-private) modes */
  protected handleStandardMode(parser: EscapeSequenceParser, enable: boolean): void {
    const paramCount = parser.paramCount;
    for (let i = 0; i < paramCount; i++) {
      const mode = parser.getRawParam(i);
      switch (mode) {
        case 4: // IRM — Insert/Replace Mode
          this.insertMode = enable;
          break;
        case 20: // LNM — Line Feed / New Line Mode
          this.newLineMode = enable;
          break;
      }
    }
  }

  /** DECSCUSR — Set Cursor Style */
  protected handleCursorStyle(ps: number): void {
    switch (ps) {
      case 0: // Default (blinking block)
      case 1: // Blinking block
        this.cursor.style = CursorStyle.BlinkingBlock;
        break;
      case 2: // Steady block
        this.cursor.style = CursorStyle.Block;
        break;
      case 3: // Blinking underline
        this.cursor.style = CursorStyle.BlinkingUnderline;
        break;
      case 4: // Steady underline
        this.cursor.style = CursorStyle.Underline;
        break;
      case 5: // Blinking bar
        this.cursor.style = CursorStyle.BlinkingBar;
        break;
      case 6: // Steady bar
        this.cursor.style = CursorStyle.Bar;
        break;
    }
  }

  // --- Line Feed / Scroll ---

  protected handleLineFeed(): void {
    if (this.cursor.row < this.scrollBottom) {
      this.cursor.moveDown(1);
    } else if (this.cursor.row === this.scrollBottom) {
      this.scrollUp();
    }
  }

  protected handleReverseLineFeed(): void {
    if (this.cursor.row <= this.scrollTop) {
      this.scrollDown();
    } else {
      this.cursor.moveUp(1);
    }
  }

  /** Scroll the viewport up by one line */
  protected scrollUp(): void {
    if (this.scrollTop === 0 && this.scrollBottom === this.height - 1) {
      this.buffer.scrollUp();
    } else {
      this.buffer.scrollUpRegion(this.scrollTop, this.scrollBottom);
    }
  }

  /** Scroll the viewport down by one line */
  protected scrollDown(): void {
    if (this.scrollTop === 0 && this.scrollBottom === this.height - 1) {
      this.buffer.scrollDownRegion(0, this.height - 1);
    } else {
      this.buffer.scrollDownRegion(this.scrollTop, this.scrollBottom);
    }
  }

  // --- Scroll Region ---

  protected setScrollRegion(top: number, bottom: number): void {
    // Convert from 1-indexed to 0-indexed
    const t = top - 1;
    const b = bottom - 1;
    if (t >= 0 && b < this.height && t < b) {
      this.scrollTop = t;
      this.scrollBottom = b;
      // Move cursor home (adjusted for origin mode)
      if (this.originMode) {
        this.cursor.moveTo(this.scrollTop, 0);
      } else {
        this.cursor.home();
      }
    }
  }

  protected clearScrollingRegion(): void {
    this.scrollTop = 0;
    this.scrollBottom = this.height - 1;
    this.cursor.home();
  }

  // --- Character Handling ---

  protected handleCharacter(codepoint: number): void {
    // Handle wrap pending
    if (this.cursor.wrapPending && this.autoWrapMode) {
      this.cursor.wrapPending = false;
      this.cursor.carriageReturn();
      if (this.cursor.row >= this.scrollBottom) {
        this.scrollUp();
      } else {
        this.cursor.moveDown(1);
      }
    }

    // Insert mode: shift existing characters right
    if (this.insertMode && this.cursor.column < this.width - 1) {
      this.shiftCharactersRight(this.cursor.row, this.cursor.column, 1);
    }

    // Apply character set mapping
    const mapped = this.applyCharacterSetMapping(codepoint, this.characterSets[this.activeCharacterSet]);

    // Write to buffer
    const cell = this.buffer.getCellRef(this.cursor.row, this.cursor.column);
    cell.codepoint = mapped;
    cell.attributes = this.currentAttributes;
    cell.foreground = this.currentForeground;
    cell.background = this.currentBackground;
    cell.characterSet = this.currentCharacterSet;

    // Advance cursor
    if (this.cursor.column < this.width - 1) {
      this.cursor.column = this.cursor.column + 1;
    } else if (this.autoWrapMode) {
      this.cursor.wrapPending = true;
    }
  }

  /** Apply character set mapping to a codepoint */
  protected applyCharacterSetMapping(codepoint: number, charSet: number): number {
    if (codepoint < 0x20 || codepoint > 0x7E) return codepoint;

    switch (charSet) {
      case 0: // US ASCII — no mapping
      case 1: // UK — no mapping (could map # to £)
        return codepoint;
      case 2: // DEC Special Graphics
        return DEC_SPECIAL_GRAPHICS.get(codepoint) ?? codepoint;
      default:
        return codepoint;
    }
  }

  // --- Character Operations ---

  /** Shift characters right to make room for insertions */
  protected shiftCharactersRight(row: number, col: number, count: number): void {
    for (let c = this.width - 1; c >= col + count; c--) {
      const src = this.buffer.getCell(row, c - count);
      this.buffer.setCell(row, c, src);
    }
    // Clear the inserted positions
    for (let c = col; c < col + count && c < this.width; c++) {
      this.buffer.setCell(row, c, TerminalCell.space());
    }
  }

  /** Insert blank characters at cursor position */
  protected insertCharacters(row: number, col: number, count: number): void {
    this.shiftCharactersRight(row, col, count);
  }

  /** Delete characters at position (shift remaining left) */
  protected deleteCharacters(row: number, col: number, count: number): void {
    for (let c = col; c < this.width; c++) {
      if (c + count < this.width) {
        const src = this.buffer.getCell(row, c + count);
        this.buffer.setCell(row, c, src);
      } else {
        this.buffer.setCell(row, c, TerminalCell.space());
      }
    }
  }

  /** Erase characters at position (replace with spaces) */
  protected eraseCharacters(row: number, col: number, count: number): void {
    for (let c = col; c < col + count && c < this.width; c++) {
      this.buffer.setCell(row, c, TerminalCell.space());
    }
  }

  // --- Response Sending ---

  protected sendResponse(data: Uint8Array): void {
    this.onDataToSend.fire(data);
  }

  // --- DCS Handling (virtual, for TDV override) ---

  protected handleDCSSequence(_parser: EscapeSequenceParser): void {
    // No-op in base — overridden by TDV emulators
  }
}

/** Encode a string as UTF-8 bytes for response */
function encodeResponse(str: string): Uint8Array {
  const arr = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    arr[i] = str.charCodeAt(i);
  }
  return arr;
}
