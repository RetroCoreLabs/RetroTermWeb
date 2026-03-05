/**
 * Extended mode feature for TDV2215 emulators.
 * When enabled, provides enhanced C0/C1 control handling.
 * Port of C# TDVExtendedModeFeature.
 */

export class TDVExtendedModeFeature {
  private _isEnabled: boolean = false;

  get isEnabled(): boolean { return this._isEnabled; }

  enable(): void { this._isEnabled = true; }
  disable(): void { this._isEnabled = false; }
  reset(): void { this._isEnabled = false; }
}
