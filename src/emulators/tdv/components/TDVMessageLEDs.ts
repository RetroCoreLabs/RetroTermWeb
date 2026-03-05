/**
 * Manages the three message LEDs (Clear/Set/Blink) for TDV terminals.
 * Port of C# TDVMessageLEDs.
 */

export const enum TDVMessageLEDType {
  Clear = 0,
  Set = 1,
  Blink = 2,
}

export class TDVMessageLEDs {
  private _clearLED: boolean = false;
  private _setLED: boolean = false;
  private _blinkLED: boolean = false;

  setClearLED(state: boolean): void { this._clearLED = state; }
  setSetLED(state: boolean): void { this._setLED = state; }
  setBlinkLED(state: boolean): void { this._blinkLED = state; }

  getLEDStates(): { clear: boolean; set: boolean; blink: boolean } {
    return { clear: this._clearLED, set: this._setLED, blink: this._blinkLED };
  }

  setLED(type: TDVMessageLEDType, state: boolean): void {
    switch (type) {
      case TDVMessageLEDType.Clear: this._clearLED = state; break;
      case TDVMessageLEDType.Set: this._setLED = state; break;
      case TDVMessageLEDType.Blink: this._blinkLED = state; break;
    }
  }

  clear(): void {
    this._clearLED = false;
    this._setLED = false;
    this._blinkLED = false;
  }
}
