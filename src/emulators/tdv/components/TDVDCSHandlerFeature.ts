/**
 * DCS handler feature for TDV2215 emulators.
 * Handles PUSH-key and PROGRAM-key programming via DCS sequences.
 * Port of C# TDVDCSHandlerFeature.
 */

import type { TDVEmulatorBase } from '../TDVEmulatorBase';

export class TDVDCSHandlerFeature {
  private _dcsBuffer: number[] = [];
  private _isReceivingDCS: boolean = false;

  get isReceivingDCS(): boolean { return this._isReceivingDCS; }

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

  /** Handle DCS byte data, looking for ESC ST terminator */
  handleDCS(data: Uint8Array, emulator: TDVEmulatorBase): void {
    for (let i = 0; i < data.length; i++) {
      const b = data[i];
      // Check for ESC (0x1B) followed by \ (0x5C) as string terminator
      if (b === 0x1B && i + 1 < data.length && data[i + 1] === 0x5C) {
        this.processDCSSequence(emulator);
        i++; // Skip the backslash
        continue;
      }
      // Check for ST (0x9C) as string terminator
      if (b === 0x9C) {
        this.processDCSSequence(emulator);
        continue;
      }
      this._dcsBuffer.push(b);
    }
  }

  /** Parse completed DCS sequence for PUSH or PROGRAM keywords */
  processDCSSequence(emulator: TDVEmulatorBase): void {
    if (this._dcsBuffer.length === 0) {
      this._isReceivingDCS = false;
      return;
    }

    let sequence = '';
    for (let i = 0; i < this._dcsBuffer.length; i++) {
      sequence += String.fromCharCode(this._dcsBuffer[i]);
    }

    if (sequence.startsWith('PUSH')) {
      this.handlePUSHKeySequence(sequence, emulator);
    } else if (sequence.startsWith('PROGRAM')) {
      this.handlePROGRAMKeySequence(sequence, emulator);
    }

    this._dcsBuffer.length = 0;
    this._isReceivingDCS = false;
  }

  /** Parse PUSH<key><data> format and store in emulator's PushKeys */
  private handlePUSHKeySequence(sequence: string, emulator: TDVEmulatorBase): void {
    if (sequence.length < 5) return;
    const keyDigit = sequence.charCodeAt(4) - 0x30;
    if (keyDigit < 1 || keyDigit > 24) return;
    const data = sequence.substring(5);
    emulator.pushKeys.programKey(keyDigit, data);
  }

  /** Parse PROGRAM<key> format and send stored sequence */
  private handlePROGRAMKeySequence(sequence: string, emulator: TDVEmulatorBase): void {
    if (sequence.length < 8) return;
    const keyStr = sequence.substring(7);
    const keyNum = parseInt(keyStr, 10);
    if (isNaN(keyNum) || keyNum < 1 || keyNum > 24) return;
    const keySeq = emulator.pushKeys.getKeySequence(keyNum);
    if (keySeq) {
      emulator.processData(encodeStr(keySeq));
    }
  }

  /** Process completed DCS sequence, returning its string content */
  processDCS(): string {
    if (this._dcsBuffer.length === 0) {
      this._isReceivingDCS = false;
      return '';
    }
    let sequence = '';
    for (let i = 0; i < this._dcsBuffer.length; i++) {
      sequence += String.fromCharCode(this._dcsBuffer[i]);
    }
    this._dcsBuffer.length = 0;
    this._isReceivingDCS = false;
    return sequence;
  }

  /** Reset state */
  reset(): void {
    this._dcsBuffer.length = 0;
    this._isReceivingDCS = false;
  }
}

function encodeStr(str: string): Uint8Array {
  const arr = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    arr[i] = str.charCodeAt(i);
  }
  return arr;
}
