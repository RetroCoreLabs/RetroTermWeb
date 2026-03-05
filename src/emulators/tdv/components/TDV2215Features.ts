/**
 * Aggregator for TDV2215-specific features.
 * Composes extended mode, transparent mode, and DCS handler features.
 * Port of C# TDV2215Features.
 */

import { TDVExtendedModeFeature } from './TDVExtendedModeFeature';
import { TDVTransparentModeFeature } from './TDVTransparentModeFeature';
import { TDVDCSHandlerFeature } from './TDVDCSHandlerFeature';

export class TDV2215Features {
  readonly extendedMode: TDVExtendedModeFeature;
  readonly transparentMode: TDVTransparentModeFeature;
  readonly dcsHandler: TDVDCSHandlerFeature;

  get isExtendedMode(): boolean { return this.extendedMode.isEnabled; }
  get isTransparentMode(): boolean { return this.transparentMode.isEnabled; }

  constructor() {
    this.extendedMode = new TDVExtendedModeFeature();
    this.transparentMode = new TDVTransparentModeFeature();
    this.dcsHandler = new TDVDCSHandlerFeature();
  }

  reset(): void {
    this.extendedMode.reset();
    this.transparentMode.reset();
    this.dcsHandler.reset();
  }
}
