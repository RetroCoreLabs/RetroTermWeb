/**
 * Handles TDV2115 compatibility mode.
 * Port of C# TDV2115CompatibilityHandler.
 */

/** Interface for the emulator methods this component needs */
export interface I2115Emulator {
  readonly width: number;
  readonly height: number;
  cursor: { row: number; column: number; moveTo(row: number, col: number): void };
  eraseCurrentLine(): void;
  erasePage(): void;
  rollUp(): void;
  rollDown(): void;
  cursorToStartOfLine(): void;
  cursorHome(): void;
  buffer: {
    getCellRef(row: number, col: number): {
      attributes: number;
    };
  };
}

export class TDV2115CompatibilityHandler {
  private readonly _emulator: I2115Emulator;
  private _is2115CompatibilityMode: boolean = false;
  private _videoOn: boolean = true;
  private _leds: boolean[] = [false, false, false];
  private _isDLEMode: boolean = false;
  private _dleByteCount: number = 0;
  private _dleLine: number = 0;
  private _dleColumn: number = 0;

  constructor(emulator: I2115Emulator) {
    this._emulator = emulator;
  }

  get is2115CompatibilityMode(): boolean { return this._is2115CompatibilityMode; }
  get videoOn(): boolean { return this._videoOn; }
  get leds(): boolean[] { return this._leds; }
  get isDLEMode(): boolean { return this._isDLEMode; }

  set2115CompatibilityMode(enable: boolean): void {
    this._is2115CompatibilityMode = enable;
  }

  /** Process a TDV2115 control character. Returns true if handled. */
  processTDV2115ControlCharacter(c: number): boolean {
    if (!this._is2115CompatibilityMode) return false;

    if (this._isDLEMode) {
      this.handleDLEByte(c);
      return true;
    }

    switch (c) {
      case 0x02: this._videoOn = false; return true;  // STX = video off
      case 0x03: this._videoOn = true; return true;   // ETX = video on
      case 0x04: this._emulator.eraseCurrentLine(); return true; // EOT
      case 0x19: this._emulator.erasePage(); return true; // EM
      case 0x05: this._leds[0] = true; return true;   // ENQ = LED 1 on
      case 0x06: this._leds[1] = true; return true;   // ACK = LED 2 on
      case 0x15: this._leds[2] = true; return true;   // NAK = LED 3 on
      case 0x16: this._leds[0] = false; this._leds[1] = false; this._leds[2] = false; return true; // SYN
      case 0x0D: this._emulator.cursorToStartOfLine(); return true; // CR
      case 0x1D: this._emulator.cursorHome(); return true; // GS = home
      case 0x08: // BS = cursor left
        if (this._emulator.cursor.column > 0) {
          this._emulator.cursor.column = this._emulator.cursor.column - 1;
        }
        return true;
      case 0x18: // CAN = cursor right
        if (this._emulator.cursor.column < this._emulator.width - 1) {
          this._emulator.cursor.column = this._emulator.cursor.column + 1;
        }
        return true;
      case 0x1C: // FS = cursor up
        if (this._emulator.cursor.row > 0) {
          this._emulator.cursor.row = this._emulator.cursor.row - 1;
        }
        return true;
      case 0x0A: case 0x0B: // LF/VT = cursor down or roll up
        if (this._emulator.cursor.row < this._emulator.height - 1) {
          this._emulator.cursor.row = this._emulator.cursor.row + 1;
        } else {
          this._emulator.rollUp();
        }
        return true;
      case 0x0C: this._emulator.rollUp(); return true; // FF = roll up
      case 0x17: this._emulator.rollDown(); return true; // ETB = roll down
      case 0x10: // DLE = start binary cursor positioning
        this._isDLEMode = true;
        this._dleByteCount = 0;
        return true;
      case 0x07: case 0x09: return false; // BEL, HT — let base handle
      default: return false;
    }
  }

  /** Handle DLE binary cursor positioning byte */
  handleDLEByte(b: number): void {
    if (this._dleByteCount === 0) {
      this._dleLine = b & 0x1F;
      this._dleByteCount = 1;
    } else {
      this._dleColumn = b & 0x7F;
      if (this._dleLine < this._emulator.height && this._dleColumn < this._emulator.width) {
        this._emulator.cursor.moveTo(this._dleLine, this._dleColumn);
      }
      this._isDLEMode = false;
      this._dleByteCount = 0;
    }
  }

  /** Handle DLE mode byte. Returns true if in DLE mode. */
  handleDLE(b: number): boolean {
    if (!this._isDLEMode) return false;
    this.handleDLEByte(b);
    return true;
  }

  /** Reset all state */
  reset(): void {
    this._is2115CompatibilityMode = false;
    this._videoOn = true;
    this._leds = [false, false, false];
    this._isDLEMode = false;
    this._dleByteCount = 0;
    this._dleLine = 0;
    this._dleColumn = 0;
  }
}
