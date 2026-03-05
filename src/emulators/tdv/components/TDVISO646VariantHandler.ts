/**
 * Handles ISO 646 variant selection for TDV terminals.
 * Processes the ESC % followed by a variant selector character.
 * Port of C# TDVISO646VariantHandler.
 */

import { TDV2200ISO646Variant } from '../TDV2200ISO646Variant';

export class TDVISO646VariantHandler {
  private _expectingIso646Variant: boolean = false;
  private _currentISO646Variant: TDV2200ISO646Variant = TDV2200ISO646Variant.International;

  get currentISO646Variant(): TDV2200ISO646Variant { return this._currentISO646Variant; }
  get isExpectingVariant(): boolean { return this._expectingIso646Variant; }

  /** Called when ESC % is received */
  startExpectingVariant(): void {
    this._expectingIso646Variant = true;
  }

  /** Handle the variant selection character after ESC % */
  handleVariantSelection(c: number): boolean {
    if (!this._expectingIso646Variant) return false;

    switch (c) {
      case 0x49: // 'I'
        this._currentISO646Variant = TDV2200ISO646Variant.International;
        break;
      case 0x4E: // 'N'
        this._currentISO646Variant = TDV2200ISO646Variant.Norwegian;
        break;
      case 0x53: // 'S'
        this._currentISO646Variant = TDV2200ISO646Variant.Swedish;
        break;
      case 0x47: // 'G'
        this._currentISO646Variant = TDV2200ISO646Variant.German;
        break;
      default:
        return false; // Unrecognized selector
    }

    this._expectingIso646Variant = false;
    return true;
  }

  /** Reset to defaults */
  reset(): void {
    this._expectingIso646Variant = false;
    this._currentISO646Variant = TDV2200ISO646Variant.International;
  }

  /** Directly set the variant */
  setVariant(variant: TDV2200ISO646Variant): void {
    this._currentISO646Variant = variant;
  }
}
