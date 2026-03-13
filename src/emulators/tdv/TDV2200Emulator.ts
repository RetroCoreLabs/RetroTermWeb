/**
 * TDV2200 terminal emulator.
 * Extends TDVEmulatorBase with ISO 646 variants, graphics extension,
 * character set management, and 2115 compatibility.
 * Port of C# TDV2200Emulator.
 */

import { TDVEmulatorBase } from './TDVEmulatorBase';
import { EscapeSequenceParser } from '../../parser/EscapeSequenceParser';
import { TDV2200ISO646Variant } from './TDV2200ISO646Variant';
import { TDVISO646VariantHandler } from './components/TDVISO646VariantHandler';
import { TDVCharacterSetManager } from './components/TDVCharacterSetManager';
import { TDV2115CompatibilityHandler } from './components/TDV2115CompatibilityHandler';
import { TDVInputProcessor } from './components/TDVInputProcessor';
import { TDVDCSHandler } from './components/TDVDCSHandler';
import { TDVCharacterSetType, CHARSET_TYPE_TO_FONTNUM } from './components/TDVCharacterSets';

export class TDV2200Emulator extends TDVEmulatorBase {
  // Component handlers
  private readonly _iso646Handler: TDVISO646VariantHandler;
  private readonly _characterSetManager: TDVCharacterSetManager;
  private readonly _compatibilityHandler: TDV2115CompatibilityHandler;
  private readonly _inputProcessor: TDVInputProcessor;
  private readonly _dcsHandler: TDVDCSHandler;

  // Graphics and Tektronix extensions
  private _hasGraphicsExtension: boolean = false;
  private _isTektronixMode: boolean = false;

  constructor(width: number = 80, height: number = 24, maxScrollback: number = 1000) {
    super(width, height, maxScrollback);
    this._iso646Handler = new TDVISO646VariantHandler();
    this._characterSetManager = new TDVCharacterSetManager(this);
    this._compatibilityHandler = new TDV2115CompatibilityHandler(this);
    this._inputProcessor = new TDVInputProcessor(
      this, this._iso646Handler, this._characterSetManager, this._compatibilityHandler,
    );
    this._dcsHandler = new TDVDCSHandler();

    // Set default character sets
    this._g0CharacterSet = TDVCharacterSetType.USASCII;
    this._g1CharacterSet = TDVCharacterSetType.USASCII;
    this._g2CharacterSet = TDVCharacterSetType.GraphicsI;
    this._g3CharacterSet = TDVCharacterSetType.GraphicsII;
  }

  // --- Properties ---

  override get maxScrollback(): number { return 10000; }
  get is2115CompatibilityMode(): boolean { return this._compatibilityHandler.is2115CompatibilityMode; }
  get videoOn(): boolean { return this._compatibilityHandler.videoOn; }
  get leds(): boolean[] { return this._compatibilityHandler.leds; }
  get hasGraphicsExtension(): boolean { return this._hasGraphicsExtension; }
  get isTektronixMode(): boolean { return this._isTektronixMode; }
  get currentISO646Variant(): TDV2200ISO646Variant { return this._iso646Handler.currentISO646Variant; }

  override get characterSetVariant(): number { return this._iso646Handler.currentISO646Variant; }
  override set characterSetVariant(value: number) {
    this._iso646Handler.setVariant(value as TDV2200ISO646Variant);
  }

  // --- Reset ---

  override resetToInitialState(): void {
    super.resetToInitialState();
    this._g0CharacterSet = TDVCharacterSetType.USASCII;
    this._g1CharacterSet = TDVCharacterSetType.USASCII;
    this._g2CharacterSet = TDVCharacterSetType.GraphicsI;
    this._g3CharacterSet = TDVCharacterSetType.GraphicsII;
    this._invokedCharacterSet = 0;
    if (this._iso646Handler) this._iso646Handler.reset();
    if (this._characterSetManager) this._characterSetManager.reset();
    if (this._compatibilityHandler) this._compatibilityHandler.reset();
    if (this._dcsHandler) this._dcsHandler.reset();
    this._hasGraphicsExtension = false;
    this._isTektronixMode = false;
  }

  // --- Control Character Handling ---

  protected override handleExecute(control: number): void {
    // Check DLE mode for binary cursor positioning
    if (this._compatibilityHandler.isDLEMode) {
      this._compatibilityHandler.handleDLEByte(control);
      return;
    }

    // Check 2115 compatibility mode
    if (this._compatibilityHandler.is2115CompatibilityMode) {
      if (this._compatibilityHandler.processTDV2115ControlCharacter(control)) {
        return;
      }
    }

    // Handle SO/SI for G0/G1 switching
    switch (control) {
      case 0x0E: // SO — Shift Out to G1
        this._invokedCharacterSet = 1;
        return;
      case 0x0F: // SI — Shift In to G0
        this._invokedCharacterSet = 0;
        return;
    }

    super.handleExecute(control);
  }

  // --- ESC Sequence Handling ---

  protected override handleEscapeSequence(parser: EscapeSequenceParser): void {
    const finalByte = parser.finalByte;
    const intermediates = parser.getIntermediates();

    if (intermediates.length === 0) {
      switch (finalByte) {
        case 0x51: // ESC Q — Exit 2115 compatibility mode
          this._compatibilityHandler.set2115CompatibilityMode(false);
          return;
        case 0x4E: // ESC N — SS2 (Single Shift to G2)
          this._characterSetManager.activateSS2();
          return;
        case 0x4F: // ESC O — SS3 (Single Shift to G3)
          this._characterSetManager.activateSS3();
          return;
        case 0x6E: // ESC n — LS2 (Locking Shift to G2)
          this._invokedCharacterSet = 2;
          return;
        case 0x6F: // ESC o — LS3 (Locking Shift to G3)
          this._invokedCharacterSet = 3;
          return;
      }
    }

    // ESC % X — ISO 646 variant selection
    if (intermediates.length === 1 && intermediates[0] === 0x25) {
      this._iso646Handler.startExpectingVariant();
      this._iso646Handler.handleVariantSelection(finalByte);
      return;
    }

    super.handleEscapeSequence(parser);
  }

  // --- CSI Sequence Handling ---

  protected override handleCsiSequence(parser: EscapeSequenceParser): void {
    const privateMarker = parser.privateMarker;
    const finalByte = parser.finalByte;

    // Step 1: Check for query/response sequences
    if (this.handleQuerySequence(finalByte, parser)) return;

    // Step 2: Handle ND private modes
    if (privateMarker === 0x3F && (finalByte === 0x68 || finalByte === 0x6C)) {
      const enable = finalByte === 0x68;
      const paramCount = parser.paramCount;
      for (let i = 0; i < paramCount; i++) {
        const mode = parser.getRawParam(i);
        if (mode === 40) {
          this._compatibilityHandler.set2115CompatibilityMode(enable);
          return;
        }
      }
    }

    // Step 3: Handle TDV2200-specific sequences
    if (this.handleTDV2200Sequence(finalByte, parser)) return;

    // Step 4: Handle ND-specific sequences
    if (this.handleNDSpecificSequence(finalByte, parser)) return;

    // Step 5: Fall through to base handler
    super.handleCsiSequence(parser);
  }

  /** Handle TDV2200-specific CSI sequences */
  private handleTDV2200Sequence(finalByte: number, parser: EscapeSequenceParser): boolean {
    switch (finalByte) {
      case 0x3C: // '<' — NDVIDEO (Alpha/Graphics toggle)
        this.handleVideoToggle(parser);
        return true;
      case 0x3E: // '>' — Mode control
        this.handleModeControl(parser);
        return true;
      case 0x70: // 'p' — NDLIWA (Insert Lines in Work Area)
        this.handleInsertLinesInWorkArea(parser);
        return true;
      case 0x71: // 'q' — NDDLWA (Delete Lines in Work Area)
        this.handleDeleteLinesInWorkArea(parser);
        return true;
      case 0x73: // 's' — NDICHE (Insert Characters with Extent)
        if (parser.privateMarker === 0) {
          this.handleInsertCharactersWithExtent(parser);
          return true;
        }
        return false;
      case 0x74: // 't' — NDDCHE (Delete Characters with Extent)
        this.handleDeleteCharactersWithExtent(parser);
        return true;
    }
    return false;
  }

  // --- Character Handling ---

  protected override handleCharacter(codepoint: number): void {
    // Save cursor position before writing
    const row = this.cursor.row;
    const col = this.cursor.column;

    // Determine font number based on SS2/SS3 or active character set
    let fontNumber = 0;
    let mappedCodepoint = codepoint;

    if (this._characterSetManager.isSS2Active) {
      const result = this._characterSetManager.processSingleShift2(codepoint);
      if (result) {
        fontNumber = result.fontNumber;
        mappedCodepoint = result.mappedChar;
      }
    } else if (this._characterSetManager.isSS3Active) {
      const result = this._characterSetManager.processSingleShift3(codepoint);
      if (result) {
        fontNumber = result.fontNumber;
        mappedCodepoint = result.mappedChar;
      }
    } else {
      // Check active character set for font number
      const activeType = this.getActiveCharacterSetType();
      if (activeType !== TDVCharacterSetType.USASCII) {
        fontNumber = CHARSET_TYPE_TO_FONTNUM[activeType] ?? 0;
      }
    }

    // ISO 646 variant: store variant-specific fontNumber per-cell
    // so Norwegian/Swedish/German chars render with correct bitmap glyphs
    if (fontNumber === 0) {
      const variant = this._iso646Handler.currentISO646Variant;
      if (variant === TDV2200ISO646Variant.Norwegian) {
        fontNumber = 5;
      } else if (variant === TDV2200ISO646Variant.Swedish) {
        fontNumber = 6;
      } else if (variant === TDV2200ISO646Variant.German) {
        fontNumber = 7;
      }
    }

    // VT100 compatibility: DEC Special Graphics (line drawing) via ESC(0
    if (fontNumber === 0 && mappedCodepoint === codepoint) {
      const charSet = this.characterSets[this.activeCharacterSet];
      if (charSet === 2) {
        mappedCodepoint = this.applyCharacterSetMapping(codepoint, 2);
      }
    }

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

    // Write to buffer
    const cell = this.buffer.getCellRef(this.cursor.row, this.cursor.column);
    cell.codepoint = mappedCodepoint;
    cell.attributes = this.currentAttributes;
    cell.foreground = this.currentForeground;
    cell.background = this.currentBackground;
    cell.fontNumber = fontNumber;
    cell.characterSet = this.characterSets[this.activeCharacterSet];

    // Advance cursor
    if (this.cursor.column < this.width - 1) {
      this.cursor.column = this.cursor.column + 1;
    } else if (this.autoWrapMode) {
      this.cursor.wrapPending = true;
    }
  }

  // --- TDV2200-specific operation handlers ---

  private handleVideoToggle(parser: EscapeSequenceParser): void {
    // ESC[mode< — Alpha/Graphics toggle
    const mode = parser.getParam(0, 0);
    if (mode === 1) {
      this._hasGraphicsExtension = true;
    } else if (mode === 0) {
      this._hasGraphicsExtension = false;
    }
  }

  private handleModeControl(parser: EscapeSequenceParser): void {
    // ESC[n> — Mode control
    const mode = parser.getParam(0, 0);
    switch (mode) {
      case 0: this._hasGraphicsExtension = false; break;
      case 1: this._hasGraphicsExtension = true; break;
      case 2: this._isTektronixMode = true; break;
      case 3: this._isTektronixMode = false; break;
    }
  }

  private handleInsertLinesInWorkArea(parser: EscapeSequenceParser): void {
    const count = parser.getParam(0, 1);
    const wa = this.workAreas.getCurrentWorkArea();
    // Insert lines within the work area
    for (let i = 0; i < count; i++) {
      this.buffer.scrollDownRegion(this.cursor.row, wa.bottom);
    }
  }

  private handleDeleteLinesInWorkArea(parser: EscapeSequenceParser): void {
    const count = parser.getParam(0, 1);
    const wa = this.workAreas.getCurrentWorkArea();
    // Delete lines within the work area
    for (let i = 0; i < count; i++) {
      this.buffer.scrollUpRegion(this.cursor.row, wa.bottom);
    }
  }

  private handleInsertCharactersWithExtent(parser: EscapeSequenceParser): void {
    const count = parser.getParam(0, 1);
    this.insertCharacters(this.cursor.row, this.cursor.column, count);
  }

  private handleDeleteCharactersWithExtent(parser: EscapeSequenceParser): void {
    const count = parser.getParam(0, 1);
    this.deleteCharacters(this.cursor.row, this.cursor.column, count);
  }

  // --- Query/Response ---

  protected override handleDeviceAttributesQuery(): string {
    if (this._compatibilityHandler.is2115CompatibilityMode) {
      return '\x1b[?115;0c';
    }
    return '\x1b[?220;0c';
  }

  protected override handleSecondaryDeviceAttributesQuery(): string {
    return '\x1b[>220;0;0c';
  }

  protected override handleTerminalIdentification(): string {
    if (this._compatibilityHandler.is2115CompatibilityMode) {
      return '\x1b[?115;0c';
    }
    return '\x1b[?220;0c';
  }

  protected override handle2115CompatibilityMode(enable: boolean): void {
    this._compatibilityHandler.set2115CompatibilityMode(enable);
  }

  protected override get2115CompatibilityMode(): boolean {
    return this._compatibilityHandler.is2115CompatibilityMode;
  }

  protected override getModeState(mode: number): number {
    switch (mode) {
      case 1: return this.applicationCursorKeys ? 1 : 2;
      case 40: return this._compatibilityHandler.is2115CompatibilityMode ? 1 : 2;
      default: return super.getModeState(mode);
    }
  }

  // --- Double Width/Height ---

  protected override handleDoubleWidthHeight(finalByte: number): void {
    super.handleDoubleWidthHeight(finalByte);
  }

  // --- Terminal Type ---

  override getTerminalType(): string {
    let type = 'TDV2200';
    if (this._hasGraphicsExtension) type += ' [GRAPHICS]';
    if (this._isTektronixMode) type += ' [TEKTRONIX]';
    const variant = this._iso646Handler.currentISO646Variant;
    if (variant !== TDV2200ISO646Variant.International) {
      const names = ['', 'Norwegian', 'Swedish', 'German'];
      type += ` [ISO646:${names[variant]}]`;
    }
    return type;
  }

  override getTerminalCapabilities(): string {
    return 'TDV2200: Character sets, ISO 646 variants, Protected areas, Work areas, LEDs, Push keys, Rectangle operations, Double width/height, Graphics extension';
  }

  // --- Character Set Variants ---

  override getAvailableCharacterSetVariants(): { value: number; description: string }[] {
    return [
      { value: TDV2200ISO646Variant.International, description: 'International (US ASCII)' },
      { value: TDV2200ISO646Variant.Norwegian, description: 'Norwegian/Danish' },
      { value: TDV2200ISO646Variant.Swedish, description: 'Swedish/Finnish' },
      { value: TDV2200ISO646Variant.German, description: 'German' },
    ];
  }

  override getISO646LanguageCode(): string | null {
    switch (this._iso646Handler.currentISO646Variant) {
      case TDV2200ISO646Variant.Norwegian: return 'no';
      case TDV2200ISO646Variant.Swedish: return 'sv';
      case TDV2200ISO646Variant.German: return 'de';
      default: return null;
    }
  }

  /** Get the ISO 646 handler (for testing) */
  get iso646Handler(): TDVISO646VariantHandler { return this._iso646Handler; }

  /** Get the compatibility handler (for testing) */
  get compatibilityHandler(): TDV2115CompatibilityHandler { return this._compatibilityHandler; }

  /** Get the character set manager (for testing) */
  get characterSetManager(): TDVCharacterSetManager { return this._characterSetManager; }

  /** Get the DCS handler (for testing) */
  get dcsHandler(): TDVDCSHandler { return this._dcsHandler; }
}
