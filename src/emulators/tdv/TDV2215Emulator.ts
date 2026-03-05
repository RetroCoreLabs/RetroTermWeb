/**
 * TDV2215 terminal emulator.
 * Extends TDVEmulatorBase with extended mode, transparent mode,
 * DCS handling, character set management, and 2115 compatibility.
 * Port of C# TDV2215Emulator.
 */

import { TDVEmulatorBase } from './TDVEmulatorBase';
import { EscapeSequenceParser } from '../../parser/EscapeSequenceParser';
import { TDV2200ISO646Variant } from './TDV2200ISO646Variant';
import { TDVISO646VariantHandler } from './components/TDVISO646VariantHandler';
import { TDVCharacterSetManager } from './components/TDVCharacterSetManager';
import { TDV2115CompatibilityHandler } from './components/TDV2115CompatibilityHandler';
import { TDVInputProcessor } from './components/TDVInputProcessor';
import { TDV2215Features } from './components/TDV2215Features';
import { TDVCharacterSetType, CHARSET_TYPE_TO_FONTNUM } from './components/TDVCharacterSets';

export class TDV2215Emulator extends TDVEmulatorBase {
  // Component handlers
  private readonly _iso646Handler: TDVISO646VariantHandler;
  private readonly _characterSetManager: TDVCharacterSetManager;
  private readonly _compatibilityHandler: TDV2115CompatibilityHandler;
  private readonly _inputProcessor: TDVInputProcessor;
  private readonly _features: TDV2215Features;

  // Single shift state: 0=none, 2=SS2, 3=SS3
  private _pendingSingleShift: number = 0;
  // Locked character set: 0=G0, 1=G1, 2=G2/LS2, 3=G3/LS3
  private _lockedCharacterSet: number = 0;

  constructor(width: number = 80, height: number = 24, maxScrollback: number = 10000) {
    super(width, height, maxScrollback);
    this._iso646Handler = new TDVISO646VariantHandler();
    this._characterSetManager = new TDVCharacterSetManager(this);
    this._compatibilityHandler = new TDV2115CompatibilityHandler(this);
    this._inputProcessor = new TDVInputProcessor(
      this, this._iso646Handler, this._characterSetManager, this._compatibilityHandler,
    );
    this._features = new TDV2215Features();

    // Set default character sets
    this._g0CharacterSet = TDVCharacterSetType.USASCII;
    this._g1CharacterSet = TDVCharacterSetType.USASCII;
    this._g2CharacterSet = TDVCharacterSetType.GraphicsI;
    this._g3CharacterSet = TDVCharacterSetType.GraphicsII;
  }

  // --- Properties ---

  get isExtendedMode(): boolean { return this._features.isExtendedMode; }
  get isTransparentMode(): boolean { return this._features.isTransparentMode; }
  get is2115CompatibilityMode(): boolean { return this._compatibilityHandler.is2115CompatibilityMode; }
  override get maxScrollback(): number { return 10000; }
  get hasPendingSingleShift(): boolean { return this._pendingSingleShift !== 0; }
  get pendingSingleShift(): number { return this._pendingSingleShift; }
  get lockedCharacterSet(): number { return this._lockedCharacterSet; }

  override get characterSetVariant(): number { return this._iso646Handler.currentISO646Variant; }
  override set characterSetVariant(value: number) {
    this._iso646Handler.setVariant(value as TDV2200ISO646Variant);
  }

  // --- Reset ---

  override resetToInitialState(): void {
    super.resetToInitialState();
    this._pendingSingleShift = 0;
    this._lockedCharacterSet = 0;
    if (this._iso646Handler) this._iso646Handler.reset();
    if (this._characterSetManager) this._characterSetManager.reset();
    if (this._compatibilityHandler) this._compatibilityHandler.reset();
    if (this._features) this._features.reset();
    this._g0CharacterSet = TDVCharacterSetType.USASCII;
    this._g1CharacterSet = TDVCharacterSetType.USASCII;
    this._g2CharacterSet = TDVCharacterSetType.GraphicsI;
    this._g3CharacterSet = TDVCharacterSetType.GraphicsII;
    this._invokedCharacterSet = 0;
  }

  // --- CSI Sequence Handling ---

  protected override handleCsiSequence(parser: EscapeSequenceParser): void {
    const privateMarker = parser.privateMarker;
    const finalByte = parser.finalByte;

    // Step 1: Check for query/response sequences
    if (this.handleQuerySequence(finalByte, parser)) return;

    // Step 2: Handle DEC private modes (extended, transparent, 2115 compat)
    if (privateMarker === 0x3F && (finalByte === 0x68 || finalByte === 0x6C)) {
      const enable = finalByte === 0x68;
      const paramCount = parser.paramCount;
      for (let i = 0; i < paramCount; i++) {
        const mode = parser.getRawParam(i);
        switch (mode) {
          case 1: // Extended mode
            if (enable) this._features.extendedMode.enable();
            else this._features.extendedMode.disable();
            return;
          case 2: // Transparent mode
            if (enable) this._features.transparentMode.enable();
            else this._features.transparentMode.disable();
            return;
          case 40: // 2115 compatibility
            this._compatibilityHandler.set2115CompatibilityMode(enable);
            return;
        }
      }
    }

    // Step 3: Handle ND-specific sequences
    if (this.handleNDSpecificSequence(finalByte, parser)) return;

    // Step 4: Fall through to base handler
    super.handleCsiSequence(parser);
  }

  // --- Control Character Handling ---

  protected override handleExecute(control: number): void {
    // If single shift pending, treat ANY byte as a display character.
    // TDV subscript digits use bytes 0x00-0x09, superscript uses 0x10-0x19 —
    // these are in the control code range but must be rendered via the G3 charset.
    if (this._pendingSingleShift !== 0) {
      this.handleCharacter(control);
      return;
    }

    // Check DLE mode for binary cursor positioning (2115 compatibility)
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

    // Default handling
    super.handleExecute(control);
  }

  // --- ESC Sequence Handling ---

  protected override handleEscapeSequence(parser: EscapeSequenceParser): void {
    const finalByte = parser.finalByte;
    const intermediates = parser.getIntermediates();

    if (intermediates.length === 0) {
      switch (finalByte) {
        case 0x51: // ESC Q — Exit 2115 compatibility / enable extended mode
          if (this._compatibilityHandler.is2115CompatibilityMode) {
            this._compatibilityHandler.set2115CompatibilityMode(false);
          } else {
            this._features.extendedMode.enable();
          }
          return;
        case 0x4E: // ESC N — SS2 (Single Shift 2, next char from G2)
          this._pendingSingleShift = 2;
          this._characterSetManager.activateSS2();
          return;
        case 0x4F: // ESC O — SS3 (Single Shift 3, next char from G3)
          this._pendingSingleShift = 3;
          this._characterSetManager.activateSS3();
          return;
        case 0x6E: // ESC n — LS2 (Locking Shift 2, lock to G2)
          this._lockedCharacterSet = 2;
          this._invokedCharacterSet = 2;
          return;
        case 0x6F: // ESC o — LS3 (Locking Shift 3, lock to G3)
          this._lockedCharacterSet = 3;
          this._invokedCharacterSet = 3;
          return;
        case 0x7E: // ESC ~ — LS1R (Locking Shift 1 Right)
          this._invokedCharacterSet = 1;
          return;
        case 0x7D: // ESC } — LS2R (Locking Shift 2 Right)
          this._invokedCharacterSet = 2;
          return;
        case 0x7C: // ESC | — LS3R (Locking Shift 3 Right)
          this._invokedCharacterSet = 3;
          return;
      }
    }

    // ESC % — ISO 646 variant selection
    if (intermediates.length === 1 && intermediates[0] === 0x25) {
      this._iso646Handler.startExpectingVariant();
      this._iso646Handler.handleVariantSelection(finalByte);
      return;
    }

    super.handleEscapeSequence(parser);
  }

  // --- Character Handling ---

  protected override handleCharacter(codepoint: number): void {
    // Determine font number based on single shift or locked character set
    let fontNumber = 0;
    let mappedCodepoint = codepoint;

    if (this._pendingSingleShift === 2) {
      // SS2: next char from G2
      const result = this._characterSetManager.processSingleShift2(codepoint);
      if (result) {
        fontNumber = result.fontNumber;
        mappedCodepoint = result.mappedChar;
      }
      this._pendingSingleShift = 0;
    } else if (this._pendingSingleShift === 3) {
      // SS3: next char from G3
      const result = this._characterSetManager.processSingleShift3(codepoint);
      if (result) {
        fontNumber = result.fontNumber;
        mappedCodepoint = result.mappedChar;
      }
      this._pendingSingleShift = 0;
    } else if (this._lockedCharacterSet >= 2) {
      // Locking shift: derive fontNumber from the charset type
      const type = this._lockedCharacterSet === 2
        ? this._g2CharacterSet
        : this._g3CharacterSet;
      fontNumber = CHARSET_TYPE_TO_FONTNUM[type] ?? 0;
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

    // Advance cursor
    if (this.cursor.column < this.width - 1) {
      this.cursor.column = this.cursor.column + 1;
    } else if (this.autoWrapMode) {
      this.cursor.wrapPending = true;
    }
  }

  // --- Query/Response ---

  protected override handleDeviceAttributesQuery(): string {
    if (this._compatibilityHandler.is2115CompatibilityMode) {
      return '\x1b[?1;0c';
    }
    return '\x1b[?1;2c';
  }

  protected override handleSecondaryDeviceAttributesQuery(): string {
    return '\x1b[>115;0;0c';
  }

  protected override handleTerminalIdentification(): string {
    if (this._compatibilityHandler.is2115CompatibilityMode) {
      return '\x1b[?1;0c';
    }
    return '\x1b[?1;2c';
  }

  protected override handle2115CompatibilityMode(enable: boolean): void {
    this._compatibilityHandler.set2115CompatibilityMode(enable);
  }

  protected override get2115CompatibilityMode(): boolean {
    return this._compatibilityHandler.is2115CompatibilityMode;
  }

  protected override getModeState(mode: number): number {
    switch (mode) {
      case 1: return this._features.isExtendedMode ? 1 : 2;
      case 2: return this._features.isTransparentMode ? 1 : 2;
      default: return super.getModeState(mode);
    }
  }

  // --- DCS Handling ---

  protected override handleDCSSequence(parser: EscapeSequenceParser): void {
    this._features.dcsHandler.startDCS();
  }

  // --- Terminal Type ---

  override getTerminalType(): string {
    let type = 'TDV2215';
    if (this._features.isExtendedMode) type += ' [Extended]';
    if (this._features.isTransparentMode) type += ' [Transparent]';
    if (this._compatibilityHandler.is2115CompatibilityMode) type += ' [2115]';
    return type;
  }

  override getTerminalCapabilities(): string {
    return 'TDV2215: Extended mode, Transparent mode, DCS, Character sets, ISO 646, Protected areas, Work areas, LEDs, Push keys, Rectangle operations';
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

  /** Program a function key (1-24) with a sequence */
  programFunctionKey(keyNumber: number, sequence: string): void {
    this.pushKeys.programKey(keyNumber, sequence);
  }

  /** Get the features aggregator (for testing) */
  get features(): TDV2215Features { return this._features; }

  /** Get the ISO 646 handler (for testing) */
  get iso646Handler(): TDVISO646VariantHandler { return this._iso646Handler; }

  /** Get the compatibility handler (for testing) */
  get compatibilityHandler(): TDV2115CompatibilityHandler { return this._compatibilityHandler; }

  /** Get the character set manager (for testing) */
  get characterSetManager(): TDVCharacterSetManager { return this._characterSetManager; }
}
