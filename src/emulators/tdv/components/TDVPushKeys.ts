/**
 * Manages programmable PUSH keys (function keys) for TDV terminals.
 * Port of C# TDVPushKeys.
 */

const MAX_KEYS = 24;

export class TDVPushKeys {
  private _programmedKeys: Map<number, string> = new Map();

  get programmedKeyCount(): number {
    return this._programmedKeys.size;
  }

  /** Program a key (1-24) with a sequence. Empty/null sequence clears the key. */
  programKey(keyNumber: number, sequence: string): void {
    if (keyNumber < 1 || keyNumber > MAX_KEYS) {
      throw new RangeError(`Key number ${keyNumber} out of range (1-${MAX_KEYS})`);
    }
    if (!sequence) {
      this._programmedKeys.delete(keyNumber);
    } else {
      this._programmedKeys.set(keyNumber, sequence);
    }
  }

  /** Get the programmed sequence for a key. Returns empty string if not programmed. */
  getKeySequence(keyNumber: number): string {
    return this._programmedKeys.get(keyNumber) ?? '';
  }

  /** Check if a key is programmed */
  isKeyProgrammed(keyNumber: number): boolean {
    return this._programmedKeys.has(keyNumber);
  }

  /** Clear a specific key */
  clearKey(keyNumber: number): void {
    this._programmedKeys.delete(keyNumber);
  }

  /** Clear all programmed keys */
  clear(): void {
    this._programmedKeys.clear();
  }

  /** Get all programmed keys as a new Map */
  getAllProgrammedKeys(): Map<number, string> {
    return new Map(this._programmedKeys);
  }
}
