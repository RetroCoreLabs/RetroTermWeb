/**
 * Handles DCS (Device Control String) sequences for TDV terminals.
 * Port of C# TDVDCSHandler.
 */

export class TDVDCSHandler {
  private _dcsBuffer: number[] = [];
  private _isReceivingDCS: boolean = false;

  get isReceivingDCS(): boolean { return this._isReceivingDCS; }

  get currentDCSString(): string {
    let str = '';
    for (let i = 0; i < this._dcsBuffer.length; i++) {
      str += String.fromCharCode(this._dcsBuffer[i]);
    }
    return str;
  }

  /** Start receiving a DCS sequence */
  startDCS(): void {
    this._dcsBuffer.length = 0;
    this._isReceivingDCS = true;
  }

  /** Add a character to the DCS buffer */
  addDCSCharacter(c: number): void {
    if (this._isReceivingDCS) {
      this._dcsBuffer.push(c);
    }
  }

  /** Process the accumulated DCS sequence. Returns a description string. */
  processDCS(): string {
    if (!this._isReceivingDCS || this._dcsBuffer.length === 0) return '';
    const sequence = this.currentDCSString;
    this._dcsBuffer.length = 0;
    this._isReceivingDCS = false;
    return this.processTDVDCSSequence(sequence);
  }

  /** Cancel DCS reception */
  cancelDCS(): void {
    this._dcsBuffer.length = 0;
    this._isReceivingDCS = false;
  }

  /** Reset state */
  reset(): void {
    this.cancelDCS();
  }

  private processTDVDCSSequence(sequence: string): string {
    if (sequence.startsWith('PUSH')) {
      return this.processPUSHSequence(sequence);
    }
    if (sequence.startsWith('UDC')) {
      return `UDC: ${sequence.substring(3)}`;
    }
    if (sequence.startsWith('SOFT')) {
      return `SOFT: ${sequence.substring(4)}`;
    }
    if (sequence.startsWith('LED')) {
      return `LED: ${sequence.substring(3)}`;
    }
    return `Unknown DCS: ${sequence}`;
  }

  private processPUSHSequence(sequence: string): string {
    if (sequence.length < 5) return `Invalid PUSH: ${sequence}`;
    const keyDigit = sequence.charCodeAt(4) - 0x30;
    if (keyDigit < 1 || keyDigit > 16) return `Invalid PUSH key: ${keyDigit}`;
    return `PUSH key ${keyDigit} pressed`;
  }
}
