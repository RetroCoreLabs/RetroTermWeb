/**
 * Transparent mode feature for TDV2215 emulators.
 * When enabled, control characters are displayed rather than executed.
 * Port of C# TDVTransparentModeFeature.
 */

export class TDVTransparentModeFeature {
  private _isEnabled: boolean = false;

  get isEnabled(): boolean { return this._isEnabled; }

  enable(): void { this._isEnabled = true; }
  disable(): void { this._isEnabled = false; }
  reset(): void { this._isEnabled = false; }
}
