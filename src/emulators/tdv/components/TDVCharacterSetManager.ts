/**
 * Manages SS2/SS3 (Single Shift) character set switching and font number tracking.
 * Port of C# TDVCharacterSetManager.
 */

import { CHARSET_TYPE_TO_FONTNUM } from './TDVCharacterSets';

/** Interface for the emulator methods this component needs */
export interface ICharacterSetEmulator {
  getG2CharacterSet(): number;
  getG3CharacterSet(): number;
}

export class TDVCharacterSetManager {
  private readonly _emulator: ICharacterSetEmulator;
  private _isSS2Active: boolean = false;
  private _isSS3Active: boolean = false;

  constructor(emulator: ICharacterSetEmulator) {
    this._emulator = emulator;
  }

  get isSS2Active(): boolean { return this._isSS2Active; }
  get isSS3Active(): boolean { return this._isSS3Active; }

  /** Activate SS2 — next character from G2 */
  activateSS2(): void {
    this._isSS2Active = true;
  }

  /** Activate SS3 — next character from G3 */
  activateSS3(): void {
    this._isSS3Active = true;
  }

  /** Process single shift 2 for a character */
  processSingleShift2(c: number): { mappedChar: number; fontNumber: number } | null {
    if (!this._isSS2Active) return null;
    const g2Type = this._emulator.getG2CharacterSet();
    this._isSS2Active = false;
    return { mappedChar: c, fontNumber: CHARSET_TYPE_TO_FONTNUM[g2Type] ?? 0 };
  }

  /** Process single shift 3 for a character */
  processSingleShift3(c: number): { mappedChar: number; fontNumber: number } | null {
    if (!this._isSS3Active) return null;
    const g3Type = this._emulator.getG3CharacterSet();
    this._isSS3Active = false;
    return { mappedChar: c, fontNumber: CHARSET_TYPE_TO_FONTNUM[g3Type] ?? 0 };
  }

  /** Handle single shift for a character (delegates to SS2 or SS3) */
  handleSingleShift(c: number): { mappedChar: number; fontNumber: number } | null {
    if (this._isSS2Active) return this.processSingleShift2(c);
    if (this._isSS3Active) return this.processSingleShift3(c);
    return null;
  }

  /** Reset all state */
  reset(): void {
    this._isSS2Active = false;
    this._isSS3Active = false;
  }

  /** Clear single shift flags (alias for reset) */
  clearSingleShiftFlags(): void {
    this.reset();
  }
}
