/**
 * Escape sequence parser implementing a state machine for VT100/ECMA-48 sequences.
 * Port of the C# EscapeSequenceParser.
 *
 * Processes raw byte input and dispatches parsed sequences via callbacks:
 * - onCharacter: printable character (ASCII or completed UTF-8 codepoint)
 * - onExecute: C0/C1 control character
 * - onEscapeDispatch: ESC sequence completed
 * - onCsiDispatch: CSI sequence completed
 * - onOscDispatch: OSC sequence completed
 * - onDcsHook: DCS sequence starts
 * - onDcsUnhook: DCS sequence ends
 */

import { ParserState } from './ParserState';

const MAX_PARAMS = 32;
const MAX_INTERMEDIATES = 2;
const INITIAL_STRING_BUFFER_SIZE = 256;

export class EscapeSequenceParser {
  private _state: ParserState = ParserState.Ground;
  private _params: Int32Array = new Int32Array(MAX_PARAMS);
  private _paramCount: number = 0;
  private _intermediateBuffer: Uint8Array = new Uint8Array(MAX_INTERMEDIATES);
  private _intermediateCount: number = 0;
  private _private: number = 0; // Private marker byte (?, >, !, =)
  private _finalByte: number = 0;

  // OSC/DCS string accumulation
  private _stringBuffer: Uint8Array | null = null;
  private _stringLength: number = 0;

  // UTF-8 state
  private _utf8Codepoint: number = 0;
  private _utf8BytesRemaining: number = 0;

  // Callbacks
  onCharacter: ((codepoint: number) => void) | null = null;
  onExecute: ((control: number) => void) | null = null;
  onEscapeDispatch: ((parser: EscapeSequenceParser) => void) | null = null;
  onCsiDispatch: ((parser: EscapeSequenceParser) => void) | null = null;
  onOscDispatch: ((data: Uint8Array) => void) | null = null;
  onDcsHook: ((parser: EscapeSequenceParser) => void) | null = null;
  onDcsPut: ((data: Uint8Array) => void) | null = null;
  onDcsUnhook: (() => void) | null = null;

  get state(): ParserState {
    return this._state;
  }

  get finalByte(): number {
    return this._finalByte;
  }

  get privateMarker(): number {
    return this._private;
  }

  get paramCount(): number {
    return this._paramCount;
  }

  /** Get parameter at index, returning defaultValue if missing or zero */
  getParam(index: number, defaultValue: number = 0): number {
    if (index < 0 || index >= this._paramCount) return defaultValue;
    const val = this._params[index];
    return val === 0 ? defaultValue : val;
  }

  /** Get raw parameter value (0 if not set, unlike getParam which substitutes default) */
  getRawParam(index: number): number {
    if (index < 0 || index >= this._paramCount) return 0;
    return this._params[index];
  }

  /** Get all parameters as a plain array */
  getParams(): number[] {
    const result: number[] = [];
    for (let i = 0; i < this._paramCount; i++) {
      result.push(this._params[i]);
    }
    return result;
  }

  /** Get intermediates as a plain array */
  getIntermediates(): number[] {
    const result: number[] = [];
    for (let i = 0; i < this._intermediateCount; i++) {
      result.push(this._intermediateBuffer[i]);
    }
    return result;
  }

  /** Reset parser to initial ground state */
  reset(): void {
    this._state = ParserState.Ground;
    this._paramCount = 0;
    this._intermediateCount = 0;
    this._private = 0;
    this._finalByte = 0;
    this._stringLength = 0;
    this._utf8Codepoint = 0;
    this._utf8BytesRemaining = 0;
  }

  /** Process a span of bytes through the parser */
  processBytes(data: Uint8Array): void {
    for (let i = 0; i < data.length; i++) {
      this.processByte(data[i]);
    }
  }

  /** Process a single byte */
  private processByte(b: number): void {
    // ESC always transitions to Escape state (except when already there)
    if (b === 0x1B && this._state !== ParserState.Escape) {
      // Track previous state for ESC \ string terminator handling
      if (this._state === ParserState.OscString || this._state === ParserState.DcsPassthrough) {
        this._previousState = this._state;
      } else {
        this._previousState = ParserState.Ground;
      }
      // Cancel any UTF-8 in progress
      if (this._state === ParserState.Utf8Sequence) {
        this._utf8BytesRemaining = 0;
      }
      this._state = ParserState.Escape;
      this.clearParams();
      return;
    }

    // Fast path for Ground state (most common)
    if (this._state === ParserState.Ground) {
      this.handleGround(b);
      return;
    }

    switch (this._state) {
      case ParserState.Escape:
        this.handleEscape(b);
        break;
      case ParserState.EscapeIntermediate:
        this.handleEscapeIntermediate(b);
        break;
      case ParserState.CsiEntry:
      case ParserState.CsiParam:
      case ParserState.CsiIntermediate:
        this.handleCsiState(b);
        break;
      case ParserState.OscString:
        this.handleOscString(b);
        break;
      case ParserState.DcsEntry:
        this.handleDcsEntry(b);
        break;
      case ParserState.DcsParam:
        this.handleDcsParam(b);
        break;
      case ParserState.DcsPassthrough:
        this.handleDcsPassthrough(b);
        break;
      case ParserState.Utf8Sequence:
        this.handleUtf8Continuation(b);
        break;
      case ParserState.ApcString:
      case ParserState.PmString:
      case ParserState.SosString:
        // Consume until ST (ESC \) — ESC handled at top of processByte
        if (b === 0x9C) {
          this._state = ParserState.Ground;
        }
        break;
    }
  }

  /** Handle bytes in Ground state */
  private handleGround(b: number): void {
    if (b >= 0x20 && b <= 0x7E) {
      // Printable ASCII — fast path
      if (this.onCharacter) this.onCharacter(b);
    } else if (b === 0x9B) {
      // C1 CSI — must check before UTF-8
      this._state = ParserState.CsiEntry;
      this.clearParams();
    } else if (b >= 0x80) {
      // Start of UTF-8 multi-byte sequence
      this.handleUtf8Start(b);
    } else if (b === 0x1B) {
      // ESC — handled at top of processByte, should not reach here
      this._state = ParserState.Escape;
      this.clearParams();
    } else {
      // C0 control character
      if (this.onExecute) this.onExecute(b);
    }
  }

  // Track whether we came from an OSC/DCS string (for ESC \ ST handling)
  private _previousState: ParserState = ParserState.Ground;

  /** Handle bytes in Escape state */
  private handleEscape(b: number): void {
    // Handle ESC \ as String Terminator if we came from a string state
    if (b === 0x5C) { // '\'
      if (this._previousState === ParserState.OscString) {
        // ESC \ terminates OSC
        if (this.onOscDispatch && this._stringBuffer) {
          this.onOscDispatch(this._stringBuffer.subarray(0, this._stringLength));
        } else if (this.onOscDispatch) {
          this.onOscDispatch(new Uint8Array(0));
        }
        this._stringLength = 0;
        this._previousState = ParserState.Ground;
        this._state = ParserState.Ground;
        return;
      }
      if (this._previousState === ParserState.DcsPassthrough) {
        if (this.onDcsUnhook) this.onDcsUnhook();
        this._previousState = ParserState.Ground;
        this._state = ParserState.Ground;
        return;
      }
      // Otherwise, treat as normal ESC final byte
      this._finalByte = b;
      if (this.onEscapeDispatch) this.onEscapeDispatch(this);
      this._state = ParserState.Ground;
      this._previousState = ParserState.Ground;
      return;
    }

    this._previousState = ParserState.Ground;

    switch (b) {
      case 0x5B: // '['
        this._state = ParserState.CsiEntry;
        this.clearParams();
        break;
      case 0x5D: // ']'
        this._state = ParserState.OscString;
        this._stringLength = 0;
        break;
      case 0x50: // 'P'
        this._state = ParserState.DcsEntry;
        this.clearParams();
        break;
      case 0x5F: // '_'
        this._state = ParserState.ApcString;
        break;
      case 0x5E: // '^'
        this._state = ParserState.PmString;
        break;
      case 0x58: // 'X'
        this._state = ParserState.SosString;
        break;
      case 0x1B: // ESC in ESC
        this.clearParams();
        // Stay in Escape
        break;
      default:
        if (b >= 0x20 && b <= 0x2F) {
          // Intermediate byte
          if (this._intermediateCount < MAX_INTERMEDIATES) {
            this._intermediateBuffer[this._intermediateCount++] = b;
          }
          this._state = ParserState.EscapeIntermediate;
        } else if (b >= 0x30 && b <= 0x7E) {
          // Final byte
          this._finalByte = b;
          if (this.onEscapeDispatch) this.onEscapeDispatch(this);
          this._state = ParserState.Ground;
        } else if (b < 0x20) {
          // C0 control in escape
          if (this.onExecute) this.onExecute(b);
          this._state = ParserState.Ground;
        } else {
          this._state = ParserState.Ground;
        }
        break;
    }
  }

  /** Handle bytes in EscapeIntermediate state */
  private handleEscapeIntermediate(b: number): void {
    if (b >= 0x20 && b <= 0x2F) {
      // Additional intermediate byte
      if (this._intermediateCount < MAX_INTERMEDIATES) {
        this._intermediateBuffer[this._intermediateCount++] = b;
      }
    } else if (b >= 0x30 && b <= 0x7E) {
      // Final byte
      this._finalByte = b;
      if (this.onEscapeDispatch) this.onEscapeDispatch(this);
      this._state = ParserState.Ground;
    } else if (b === 0x1B) {
      this._state = ParserState.Escape;
      this.clearParams();
    } else if (b < 0x20) {
      if (this.onExecute) this.onExecute(b);
      this._state = ParserState.Ground;
    } else {
      this._state = ParserState.Ground;
    }
  }

  /** Handle bytes in CSI states (Entry, Param, Intermediate) */
  private handleCsiState(b: number): void {
    // Check for private marker at start
    if (this._state === ParserState.CsiEntry &&
      (b === 0x3F || b === 0x3E || b === 0x21 || b === 0x3D)) {
      // '?', '>', '!', '='
      this._private = b;
      this._state = ParserState.CsiParam;
      return;
    }

    // In CsiIntermediate, can only accept more intermediates or a final byte
    if (this._state === ParserState.CsiIntermediate) {
      if (b >= 0x20 && b <= 0x2F) {
        if (this._intermediateCount < MAX_INTERMEDIATES) {
          this._intermediateBuffer[this._intermediateCount++] = b;
        }
        return;
      }
      if ((b >= 0x40 && b <= 0x7E) || b === 0x3C || b === 0x3E || b === 0x3D) {
        this._finalByte = b;
        if (this.onCsiDispatch) this.onCsiDispatch(this);
        this._state = ParserState.Ground;
        return;
      }
      if (b === 0x1B) {
        this._state = ParserState.Escape;
        this.clearParams();
        return;
      }
      if (b < 0x20) {
        if (this.onExecute) this.onExecute(b);
        // Stay in CsiIntermediate (C0 controls don't exit CSI)
        return;
      }
      this._state = ParserState.Ground;
      return;
    }

    // CsiEntry or CsiParam
    if (b >= 0x30 && b <= 0x39) {
      // Digit
      if (this._paramCount === 0) {
        this._paramCount = 1;
        this._params[0] = 0;
      }
      this._params[this._paramCount - 1] = this._params[this._paramCount - 1] * 10 + (b - 0x30);
      this._state = ParserState.CsiParam;
    } else if (b === 0x3B) {
      // ';' — parameter separator
      if (this._paramCount === 0) {
        this._paramCount = 1;
        this._params[0] = 0;
      }
      if (this._paramCount < MAX_PARAMS) {
        this._params[this._paramCount] = 0;
        this._paramCount++;
      }
      this._state = ParserState.CsiParam;
    } else if (b >= 0x20 && b <= 0x2F) {
      // Intermediate byte
      if (this._intermediateCount < MAX_INTERMEDIATES) {
        this._intermediateBuffer[this._intermediateCount++] = b;
      }
      this._state = ParserState.CsiIntermediate;
    } else if ((b >= 0x40 && b <= 0x7E) || b === 0x3C || b === 0x3E || b === 0x3D) {
      // Final byte
      this._finalByte = b;
      if (this.onCsiDispatch) this.onCsiDispatch(this);
      this._state = ParserState.Ground;
    } else if (b === 0x1B) {
      this._state = ParserState.Escape;
      this.clearParams();
    } else if (b < 0x20) {
      // C0 control — execute but stay in CSI
      if (this.onExecute) this.onExecute(b);
    } else {
      this._state = ParserState.Ground;
    }
  }

  /** Handle bytes in OscString state */
  private handleOscString(b: number): void {
    if (b === 0x07 || b === 0x9C) {
      // BEL or ST — end of OSC
      if (this.onOscDispatch && this._stringBuffer) {
        this.onOscDispatch(this._stringBuffer.subarray(0, this._stringLength));
      } else if (this.onOscDispatch) {
        this.onOscDispatch(new Uint8Array(0));
      }
      this._stringLength = 0;
      this._state = ParserState.Ground;
    } else if (b === 0x1B) {
      // ESC — might be ESC \ (ST)
      this._previousState = ParserState.OscString;
      this._state = ParserState.Escape;
    } else {
      this.appendStringByte(b);
    }
  }

  /** Handle bytes in DcsEntry state */
  private handleDcsEntry(b: number): void {
    if (b === 0x1B) {
      this._state = ParserState.Escape;
      return;
    }
    if (b >= 0x30 && b <= 0x39) {
      if (this._paramCount === 0) {
        this._paramCount = 1;
        this._params[0] = 0;
      }
      this._params[this._paramCount - 1] = this._params[this._paramCount - 1] * 10 + (b - 0x30);
      this._state = ParserState.DcsParam;
    } else if (b === 0x3B) {
      if (this._paramCount === 0) {
        this._paramCount = 1;
        this._params[0] = 0;
      }
      if (this._paramCount < MAX_PARAMS) {
        this._params[this._paramCount] = 0;
        this._paramCount++;
      }
      this._state = ParserState.DcsParam;
    } else if (b >= 0x3C && b <= 0x3F) {
      // Private marker
      this._private = b;
      this._state = ParserState.DcsParam;
    } else if (b >= 0x40 && b <= 0x7E) {
      this._finalByte = b;
      if (this.onDcsHook) this.onDcsHook(this);
      this._state = ParserState.DcsPassthrough;
      this._stringLength = 0;
    }
  }

  /** Handle bytes in DcsParam state */
  private handleDcsParam(b: number): void {
    if (b === 0x1B) {
      this._state = ParserState.Escape;
      return;
    }
    if (b >= 0x30 && b <= 0x39) {
      if (this._paramCount === 0) {
        this._paramCount = 1;
        this._params[0] = 0;
      }
      this._params[this._paramCount - 1] = this._params[this._paramCount - 1] * 10 + (b - 0x30);
    } else if (b === 0x3B) {
      if (this._paramCount < MAX_PARAMS) {
        this._params[this._paramCount] = 0;
        this._paramCount++;
      }
    } else if (b >= 0x40 && b <= 0x7E) {
      this._finalByte = b;
      if (this.onDcsHook) this.onDcsHook(this);
      this._state = ParserState.DcsPassthrough;
      this._stringLength = 0;
    }
  }

  /** Handle bytes in DcsPassthrough state */
  private handleDcsPassthrough(b: number): void {
    if (b === 0x9C) {
      // ST — end of DCS
      if (this.onDcsUnhook) this.onDcsUnhook();
      this._state = ParserState.Ground;
    } else if (b === 0x1B) {
      // ESC — might be ESC \ (ST)
      this._previousState = ParserState.DcsPassthrough;
      this._state = ParserState.Escape;
    } else {
      // Accumulate DCS data
      this.appendStringByte(b);
    }
  }

  /** Start a UTF-8 multi-byte sequence */
  private handleUtf8Start(b: number): void {
    if ((b & 0xE0) === 0xC0) {
      // 2-byte sequence
      this._utf8Codepoint = b & 0x1F;
      this._utf8BytesRemaining = 1;
      this._state = ParserState.Utf8Sequence;
    } else if ((b & 0xF0) === 0xE0) {
      // 3-byte sequence
      this._utf8Codepoint = b & 0x0F;
      this._utf8BytesRemaining = 2;
      this._state = ParserState.Utf8Sequence;
    } else if ((b & 0xF8) === 0xF0) {
      // 4-byte sequence
      this._utf8Codepoint = b & 0x07;
      this._utf8BytesRemaining = 3;
      this._state = ParserState.Utf8Sequence;
    } else {
      // Invalid UTF-8 start byte
      if (this.onCharacter) this.onCharacter(0xFFFD);
    }
  }

  /** Handle UTF-8 continuation bytes */
  private handleUtf8Continuation(b: number): void {
    if ((b & 0xC0) === 0x80) {
      // Valid continuation byte
      this._utf8Codepoint = (this._utf8Codepoint << 6) | (b & 0x3F);
      this._utf8BytesRemaining--;
      if (this._utf8BytesRemaining === 0) {
        if (this.onCharacter) this.onCharacter(this._utf8Codepoint);
        this._state = ParserState.Ground;
      }
    } else {
      // Invalid continuation — emit replacement char, re-process byte
      if (this.onCharacter) this.onCharacter(0xFFFD);
      this._utf8BytesRemaining = 0;
      this._state = ParserState.Ground;
      this.processByte(b);
    }
  }

  /** Append a byte to the string buffer (OSC/DCS accumulation) */
  private appendStringByte(b: number): void {
    if (this._stringBuffer === null) {
      this._stringBuffer = new Uint8Array(INITIAL_STRING_BUFFER_SIZE);
    }
    if (this._stringLength >= this._stringBuffer.length) {
      // Double the buffer
      const newBuffer = new Uint8Array(this._stringBuffer.length * 2);
      newBuffer.set(this._stringBuffer);
      this._stringBuffer = newBuffer;
    }
    this._stringBuffer[this._stringLength++] = b;
  }

  /** Clear parameter and intermediate accumulators */
  private clearParams(): void {
    this._paramCount = 0;
    this._intermediateCount = 0;
    this._private = 0;
    this._finalByte = 0;
  }
}
