/**
 * Main orchestrator for TDV input processing.
 * Handles byte-by-byte input with TDV-specific mode handling:
 * ISO 646 variant selection, SS2/SS3, DLE mode, 2115 compatibility.
 * Port of C# TDVInputProcessor.
 */

import type { TDVEmulatorBase } from '../TDVEmulatorBase';
import type { TDVISO646VariantHandler } from './TDVISO646VariantHandler';
import type { TDVCharacterSetManager } from './TDVCharacterSetManager';
import type { TDV2115CompatibilityHandler } from './TDV2115CompatibilityHandler';

export class TDVInputProcessor {
  private readonly _emulator: TDVEmulatorBase;
  private readonly _iso646Handler: TDVISO646VariantHandler;
  private readonly _characterSetManager: TDVCharacterSetManager;
  private readonly _compatibilityHandler: TDV2115CompatibilityHandler;

  constructor(
    emulator: TDVEmulatorBase,
    iso646Handler: TDVISO646VariantHandler,
    characterSetManager: TDVCharacterSetManager,
    compatibilityHandler: TDV2115CompatibilityHandler,
  ) {
    this._emulator = emulator;
    this._iso646Handler = iso646Handler;
    this._characterSetManager = characterSetManager;
    this._compatibilityHandler = compatibilityHandler;
  }

  /** Process input through TDV-specific modes before standard parsing */
  processInput(data: Uint8Array): void {
    // If ISO 646 variant selection is pending, handle the next byte
    if (this._iso646Handler.isExpectingVariant) {
      for (let i = 0; i < data.length; i++) {
        if (this._iso646Handler.handleVariantSelection(data[i])) {
          // Variant was selected, process remaining bytes normally
          if (i + 1 < data.length) {
            const remaining = data.subarray(i + 1);
            this._emulator.processData(remaining);
          }
          return;
        }
      }
      return;
    }

    // If in DLE mode (binary cursor positioning), handle directly
    if (this._compatibilityHandler.isDLEMode) {
      for (let i = 0; i < data.length; i++) {
        if (this._compatibilityHandler.handleDLE(data[i])) {
          if (!this._compatibilityHandler.isDLEMode && i + 1 < data.length) {
            const remaining = data.subarray(i + 1);
            this._emulator.processData(remaining);
            return;
          }
        }
      }
      return;
    }

    // Default: pass through to standard parser
    this._emulator.processData(data);
  }

  /** Reset all handlers */
  reset(): void {
    this._iso646Handler.reset();
    this._characterSetManager.reset();
    this._compatibilityHandler.reset();
  }
}
