/**
 * Base class for TDV (Tandberg Data Video) terminal emulators.
 * Extends TerminalEmulatorBase with TDV-specific features via composition.
 * Port of C# TDVEmulatorBase.
 */

import { TerminalEmulatorBase } from '../TerminalEmulatorBase';
import { EscapeSequenceParser } from '../../parser/EscapeSequenceParser';
import { EventEmitter } from '../../terminal/Disposable';
import { CharacterAttributes, setAttribute, clearAttribute } from '../../buffer/CharacterAttributes';
import { TDVProtectedAreas } from './components/TDVProtectedAreas';
import { TDVWorkAreas } from './components/TDVWorkAreas';
import { TDVMessageLEDs, TDVMessageLEDType } from './components/TDVMessageLEDs';
import { TDVRectangleOperations } from './components/TDVRectangleOperations';
import { TDVPushKeys } from './components/TDVPushKeys';
import { TDVCharacterSetType } from './components/TDVCharacterSets';
import type { ICharacterSetEmulator } from './components/TDVCharacterSetManager';

export abstract class TDVEmulatorBase extends TerminalEmulatorBase implements ICharacterSetEmulator {
  // TDV modes
  smoothScrollMode: boolean = false;
  blinkMode: boolean = false;
  enhancedBlinkMode: boolean = false;

  // Character set designations
  protected _g0CharacterSet: TDVCharacterSetType = TDVCharacterSetType.USASCII;
  protected _g1CharacterSet: TDVCharacterSetType = TDVCharacterSetType.USASCII;
  protected _g2CharacterSet: TDVCharacterSetType = TDVCharacterSetType.GraphicsI;
  protected _g3CharacterSet: TDVCharacterSetType = TDVCharacterSetType.GraphicsII;
  protected _invokedCharacterSet: number = 0; // 0=G0, 1=G1, 2=G2, 3=G3

  // Composition components
  readonly protectedAreas: TDVProtectedAreas;
  readonly workAreas: TDVWorkAreas;
  readonly messageLEDs: TDVMessageLEDs;
  readonly rectangleOperations: TDVRectangleOperations;
  readonly pushKeys: TDVPushKeys;

  // TDV query/response event
  readonly onResponseReady = new EventEmitter<string>();

  constructor(width: number, height: number, maxScrollback: number = 2000) {
    super(width, height, maxScrollback);
    this.protectedAreas = new TDVProtectedAreas(width, height);
    this.workAreas = new TDVWorkAreas(width, height);
    this.messageLEDs = new TDVMessageLEDs();
    this.rectangleOperations = new TDVRectangleOperations();
    this.pushKeys = new TDVPushKeys();
  }

  override get maxScrollback(): number { return 2000; }

  /** Get the current work area bounds */
  get currentWorkArea(): { left: number; top: number; right: number; bottom: number } {
    return this.workAreas.getCurrentWorkArea();
  }

  /** Check if cursor is in a protected area */
  get isProtectedArea(): boolean {
    return this.protectedAreas.isProtected(this.cursor.row, this.cursor.column);
  }

  /** Get message LED states */
  get messageLEDState(): { clear: boolean; set: boolean; blink: boolean } {
    return this.messageLEDs.getLEDStates();
  }

  /** Character set variant (virtual, overridden by derived classes) */
  override get characterSetVariant(): number { return 0; }
  override set characterSetVariant(_value: number) { /* override in derived */ }

  // ICharacterSetEmulator interface
  getG0CharacterSet(): TDVCharacterSetType { return this._g0CharacterSet; }
  getG1CharacterSet(): TDVCharacterSetType { return this._g1CharacterSet; }
  getG2CharacterSet(): TDVCharacterSetType { return this._g2CharacterSet; }
  getG3CharacterSet(): TDVCharacterSetType { return this._g3CharacterSet; }

  /** Get the currently invoked character set index (0-3) */
  getCurrentCharacterSet(): number { return this._invokedCharacterSet; }

  /** Designate a character set to a G slot */
  setCharacterSet(setIndex: number, type: TDVCharacterSetType): void {
    switch (setIndex) {
      case 0: this._g0CharacterSet = type; break;
      case 1: this._g1CharacterSet = type; break;
      case 2: this._g2CharacterSet = type; break;
      case 3: this._g3CharacterSet = type; break;
    }
  }

  /** Locking shift — invoke a G slot */
  invokeCharacterSet(setIndex: number): void {
    if (setIndex >= 0 && setIndex <= 3) {
      this._invokedCharacterSet = setIndex;
    }
  }

  /** Get the TDVCharacterSetType of the currently invoked G slot */
  getActiveCharacterSetType(): TDVCharacterSetType {
    switch (this._invokedCharacterSet) {
      case 0: return this._g0CharacterSet;
      case 1: return this._g1CharacterSet;
      case 2: return this._g2CharacterSet;
      case 3: return this._g3CharacterSet;
      default: return TDVCharacterSetType.USASCII;
    }
  }

  // --- CSI Sequence Handling ---

  protected override handleCsiSequence(parser: EscapeSequenceParser): void {
    const privateMarker = parser.privateMarker;
    const finalByte = parser.finalByte;

    // Step 1: Check for query/response sequences
    if (this.handleQuerySequence(finalByte, parser)) {
      return;
    }

    // Step 2: Check for ND-specific sequences
    if (this.handleNDSpecificSequence(finalByte, parser)) {
      return;
    }

    // Step 3: Fall through to base handler
    super.handleCsiSequence(parser);
  }

  /** Handle query/response sequences (DA, DSR, CPR, etc.) */
  protected handleQuerySequence(finalByte: number, parser: EscapeSequenceParser): boolean {
    const privateMarker = parser.privateMarker;
    const intermediates = parser.getIntermediates();

    if (finalByte === 0x63) { // 'c' — Device Attributes
      if (privateMarker === 0) {
        // Primary DA
        const response = this.handleDeviceAttributesQuery();
        this.onResponseReady.fire(response);
        this.sendResponse(encodeStr(response));
        return true;
      }
      if (privateMarker === 0x3E) { // '>'
        // Secondary DA
        const response = this.handleSecondaryDeviceAttributesQuery();
        this.onResponseReady.fire(response);
        this.sendResponse(encodeStr(response));
        return true;
      }
    }

    if (finalByte === 0x6E) { // 'n' — DSR
      const param = parser.getParam(0, 0);
      if (param === 6) {
        // CPR (Cursor Position Report)
        const response = this.handleCursorPositionReport();
        this.onResponseReady.fire(response);
        this.sendResponse(encodeStr(response));
        return true;
      }
      if (param === 5) {
        // DSR (Device Status Report)
        const response = this.handleDeviceStatusReportQuery();
        this.onResponseReady.fire(response);
        this.sendResponse(encodeStr(response));
        return true;
      }
    }

    // DECRQM — Mode query
    if ((finalByte === 0x70 || finalByte === 0x79) && privateMarker === 0x3F && intermediates.length > 0 && intermediates[0] === 0x24) {
      const mode = parser.getParam(0, 0);
      const response = this.handleModeQuery(mode);
      this.onResponseReady.fire(response);
      this.sendResponse(encodeStr(response));
      return true;
    }

    return false;
  }

  /** Handle ND-specific CSI sequences */
  protected handleNDSpecificSequence(finalByte: number, parser: EscapeSequenceParser): boolean {
    const privateMarker = parser.privateMarker;

    // DEC private mode sequences (?Nh / ?Nl)
    if (privateMarker === 0x3F && (finalByte === 0x68 || finalByte === 0x6C)) {
      const enable = finalByte === 0x68;
      return this.handleNDPrivateSequence(finalByte, parser, enable);
    }

    // ND rectangle/work area operations
    switch (finalByte) {
      case 0x7A: // 'z' — NDSAR (Set Attribute in Rectangle)
        this.handleSetAttributeInRectangle(parser);
        return true;
      case 0x7B: // '{' — NDAAR (Add Attribute in Rectangle)
        this.handleAddAttributeInRectangle(parser);
        return true;
      case 0x7D: // '}' — NDRAR (Remove Attribute in Rectangle)
        this.handleRemoveAttributeInRectangle(parser);
        return true;
      case 0x7C: // '|' — NDFC (Fill Character in Rectangle)
        this.handleFillCharacterInRectangle(parser);
        return true;
      case 0x7E: // '~' — NDDWA (Define Work Area)
        this.handleDefineWorkArea(parser);
        return true;
      case 0x75: // 'u' — NDSREC (Save Rectangle)
        if (parser.privateMarker === 0) {
          this.handleSaveRectangle(parser);
          return true;
        }
        break;
      case 0x76: // 'v' — NDRREC (Restore Rectangle)
        this.handleRestoreRectangle(parser);
        return true;
    }

    return false;
  }

  /** Handle ND private mode set/reset. Returns true if handled. */
  protected handleNDPrivateSequence(finalByte: number, parser: EscapeSequenceParser, enable: boolean): boolean {
    const paramCount = parser.paramCount;
    for (let i = 0; i < paramCount; i++) {
      const mode = parser.getRawParam(i);
      switch (mode) {
        case 66: this.handle2115CompatibilityMode(enable); return true;
        case 67: this.smoothScrollMode = enable; return true;
        case 68: this.blinkMode = enable; return true;
        case 69: this.enhancedBlinkMode = enable; return true;
      }
    }
    // Also let the base DEC private mode handler run
    return false;
  }

  // --- ND Rectangle/Work Area Operations ---

  protected handleSetAttributeInRectangle(parser: EscapeSequenceParser): void {
    if (parser.paramCount < 5) return;
    const attr = parser.getRawParam(0);
    const x1 = parser.getRawParam(1);
    const y1 = parser.getRawParam(2);
    const x2 = parser.getRawParam(3);
    const y2 = parser.getRawParam(4);
    this.rectangleOperations.setAttributeInRectangle(this.buffer, attr, x1, y1, x2, y2);
  }

  protected handleAddAttributeInRectangle(parser: EscapeSequenceParser): void {
    if (parser.paramCount < 5) return;
    this.rectangleOperations.addAttributeInRectangle(
      this.buffer, parser.getRawParam(0),
      parser.getRawParam(1), parser.getRawParam(2),
      parser.getRawParam(3), parser.getRawParam(4),
    );
  }

  protected handleRemoveAttributeInRectangle(parser: EscapeSequenceParser): void {
    if (parser.paramCount < 5) return;
    this.rectangleOperations.removeAttributeInRectangle(
      this.buffer, parser.getRawParam(0),
      parser.getRawParam(1), parser.getRawParam(2),
      parser.getRawParam(3), parser.getRawParam(4),
    );
  }

  protected handleFillCharacterInRectangle(parser: EscapeSequenceParser): void {
    if (parser.paramCount < 5) return;
    this.rectangleOperations.fillCharacterInRectangle(
      this.buffer, parser.getRawParam(0),
      parser.getRawParam(1), parser.getRawParam(2),
      parser.getRawParam(3), parser.getRawParam(4),
    );
  }

  protected handleDefineWorkArea(parser: EscapeSequenceParser): void {
    if (parser.paramCount < 4) {
      this.workAreas.clear();
      return;
    }
    this.workAreas.defineWorkArea(
      parser.getRawParam(0), parser.getRawParam(1),
      parser.getRawParam(2), parser.getRawParam(3),
    );
  }

  protected handleSaveRectangle(parser: EscapeSequenceParser): void {
    if (parser.paramCount < 4) return;
    this.rectangleOperations.saveRectangle(
      this.buffer,
      parser.getRawParam(0), parser.getRawParam(1),
      parser.getRawParam(2), parser.getRawParam(3),
    );
  }

  protected handleRestoreRectangle(parser: EscapeSequenceParser): void {
    const x = parser.getParam(0, 0);
    const y = parser.getParam(1, 0);
    this.rectangleOperations.restoreRectangle(this.buffer, x, y);
  }

  // --- ESC Sequence Handling ---

  protected override handleEscapeSequence(parser: EscapeSequenceParser): void {
    const finalByte = parser.finalByte;
    const intermediates = parser.getIntermediates();

    if (intermediates.length === 0) {
      // ESC Z — Terminal Identification
      if (finalByte === 0x5A) {
        const response = this.handleTerminalIdentification();
        this.onResponseReady.fire(response);
        this.sendResponse(encodeStr(response));
        return;
      }
    }

    // ESC # sequences (double-width/height)
    if (intermediates.length === 1 && intermediates[0] === 0x23) {
      this.handleDoubleWidthHeight(finalByte);
      return;
    }

    super.handleEscapeSequence(parser);
  }

  protected override handleEscapeWithIntermediates(finalByte: number, intermediates: number[]): void {
    if (intermediates.length === 1) {
      const intermediate = intermediates[0];

      // ESC # 3/4/5/6 — double-width/height
      if (intermediate === 0x23) {
        this.handleDoubleWidthHeight(finalByte);
        return;
      }

      // TDV character set designation (ESC ( 0-9, ESC ) 0-9)
      // ESC ( 0 designates USASCII to G0 (charset type 0).
      // ESC ( B (VT100 US ASCII) falls through to base class for VT100 compat.
      if (intermediate === 0x28 || intermediate === 0x29) {
        const gxIndex = intermediate === 0x28 ? 0 : 1;
        if (finalByte >= 0x30 && finalByte <= 0x39) {
          const setType = (finalByte - 0x30) as TDVCharacterSetType;
          this.setCharacterSet(gxIndex, setType);
          return;
        }
      }
    }

    super.handleEscapeWithIntermediates(finalByte, intermediates);
  }

  /** Handle ESC # 3/4/5/6 for double-width/height lines */
  protected handleDoubleWidthHeight(finalByte: number): void {
    switch (finalByte) {
      case 0x33: // ESC # 3 — Double-height top
        this.setLineDoubleHeight(this.cursor.row, true);
        break;
      case 0x34: // ESC # 4 — Double-height bottom
        this.setLineDoubleHeight(this.cursor.row, false);
        break;
      case 0x35: // ESC # 5 — Single-width single-height
        this.setLineSingleSize(this.cursor.row);
        break;
      case 0x36: // ESC # 6 — Double-width
        this.setLineDoubleWidth(this.cursor.row);
        break;
    }
  }

  // --- Double-width/height helpers ---

  private setLineDoubleHeight(row: number, isTop: boolean): void {
    for (let col = 0; col < this.width; col++) {
      const cell = this.buffer.getCellRef(row, col);
      cell.doubleWidth = true;
      cell.doubleHeight = true;
      if (isTop) {
        cell.attributes = setAttribute(cell.attributes, CharacterAttributes.DoubleHeightTop);
        cell.attributes = clearAttribute(cell.attributes, CharacterAttributes.DoubleHeightBottom);
      } else {
        cell.attributes = setAttribute(cell.attributes, CharacterAttributes.DoubleHeightBottom);
        cell.attributes = clearAttribute(cell.attributes, CharacterAttributes.DoubleHeightTop);
      }
      cell.attributes = setAttribute(cell.attributes, CharacterAttributes.DoubleWidth);
    }
  }

  private setLineDoubleWidth(row: number): void {
    for (let col = 0; col < this.width; col++) {
      const cell = this.buffer.getCellRef(row, col);
      cell.doubleWidth = true;
      cell.attributes = setAttribute(cell.attributes, CharacterAttributes.DoubleWidth);
      cell.attributes = clearAttribute(cell.attributes, CharacterAttributes.DoubleHeightTop);
      cell.attributes = clearAttribute(cell.attributes, CharacterAttributes.DoubleHeightBottom);
    }
  }

  private setLineSingleSize(row: number): void {
    for (let col = 0; col < this.width; col++) {
      const cell = this.buffer.getCellRef(row, col);
      cell.doubleWidth = false;
      cell.doubleHeight = false;
      cell.attributes = clearAttribute(cell.attributes, CharacterAttributes.DoubleWidth);
      cell.attributes = clearAttribute(cell.attributes, CharacterAttributes.DoubleHeightTop);
      cell.attributes = clearAttribute(cell.attributes, CharacterAttributes.DoubleHeightBottom);
    }
  }

  // --- Character set mapping override ---

  protected override applyCharacterSetMapping(codepoint: number, _charSet: number): number {
    // TDV uses bitmap fonts with FontNumber-based glyph selection, not Unicode mapping.
    return codepoint;
  }

  // --- Query/Response methods (virtual, overridden by derived) ---

  protected handleDeviceAttributesQuery(): string {
    return '\x1b[?1;2c';
  }

  protected handleSecondaryDeviceAttributesQuery(): string {
    return '\x1b[>1;0;0c';
  }

  protected handleCursorPositionReport(): string {
    return `\x1b[${this.cursor.row + 1};${this.cursor.column + 1}R`;
  }

  protected handleDeviceStatusReportQuery(): string {
    return '\x1b[0n';
  }

  protected handleTerminalIdentification(): string {
    return '\x1b[?1;0c';
  }

  protected handleModeQuery(mode: number): string {
    const state = this.getModeState(mode);
    return `\x1b[?${mode};${state}$y`;
  }

  protected getModeState(mode: number): number {
    switch (mode) {
      case 67: return this.smoothScrollMode ? 1 : 2;
      case 68: return this.blinkMode ? 1 : 2;
      case 69: return this.enhancedBlinkMode ? 1 : 2;
      default: return 0;
    }
  }

  // --- 2115 Compatibility Mode (virtual) ---
  protected handle2115CompatibilityMode(_enable: boolean): void {
    // Overridden by derived classes
  }

  protected get2115CompatibilityMode(): boolean {
    return false;
  }

  // --- Scroll overrides ---

  protected override scrollUp(): void {
    super.scrollUp();
  }

  protected override scrollDown(): void {
    super.scrollDown();
  }

  // --- Helper methods for 2115 compatibility ---

  eraseCurrentLine(): void {
    this.buffer.clearToEndOfLine(this.cursor.row, this.cursor.column);
  }

  erasePage(): void {
    this.buffer.clear();
  }

  rollUp(): void {
    this.scrollUp();
  }

  rollDown(): void {
    this.scrollDown();
  }

  cursorToStartOfLine(): void {
    this.cursor.column = 0;
  }

  cursorHome(): void {
    this.cursor.home();
  }

  /** Check if cursor is in the work area */
  isCursorInWorkArea(): boolean {
    return this.workAreas.isInWorkArea(this.cursor.row, this.cursor.column);
  }

  /** Check if cursor is in a protected area */
  isCursorInProtectedArea(): boolean {
    return this.protectedAreas.isProtected(this.cursor.row, this.cursor.column);
  }

  /** Program a PUSH key */
  programPushKey(keyNumber: number, sequence: string): void {
    this.pushKeys.programKey(keyNumber, sequence);
  }

  /** Execute a programmed PUSH key */
  executePushKey(keyNumber: number): void {
    const seq = this.pushKeys.getKeySequence(keyNumber);
    if (seq) {
      this.processData(encodeStr(seq));
    }
  }

  /** Set message LED state */
  setMessageLED(type: TDVMessageLEDType, state: boolean): void {
    this.messageLEDs.setLED(type, state);
  }

  override getTerminalType(): string { return 'TDV'; }
  override getTerminalCapabilities(): string { return 'TDV'; }

  /** Get available ISO 646 variants (virtual) */
  getAvailableCharacterSetVariants(): { value: number; description: string }[] {
    return [];
  }

  /** Get ISO 646 language code (virtual) */
  getISO646LanguageCode(): string | null {
    return null;
  }

  /** Get the parser (for input processing) */
  getParser(): EscapeSequenceParser {
    return this.parser;
  }
}

/** Encode a string as ASCII bytes */
function encodeStr(str: string): Uint8Array {
  const arr = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    arr[i] = str.charCodeAt(i);
  }
  return arr;
}
