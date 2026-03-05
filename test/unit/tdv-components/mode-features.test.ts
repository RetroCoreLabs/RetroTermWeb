import { describe, it, expect } from 'vitest';
import { TDVExtendedModeFeature } from '../../../src/emulators/tdv/components/TDVExtendedModeFeature';
import { TDVTransparentModeFeature } from '../../../src/emulators/tdv/components/TDVTransparentModeFeature';
import { TDV2215Features } from '../../../src/emulators/tdv/components/TDV2215Features';

describe('TDVExtendedModeFeature', () => {
  it('should initialize as disabled', () => {
    const mode = new TDVExtendedModeFeature();
    expect(mode.isEnabled).toBe(false);
  });

  it('should enable', () => {
    const mode = new TDVExtendedModeFeature();
    mode.enable();
    expect(mode.isEnabled).toBe(true);
  });

  it('should disable', () => {
    const mode = new TDVExtendedModeFeature();
    mode.enable();
    mode.disable();
    expect(mode.isEnabled).toBe(false);
  });

  it('should reset to disabled', () => {
    const mode = new TDVExtendedModeFeature();
    mode.enable();
    mode.reset();
    expect(mode.isEnabled).toBe(false);
  });

  it('should allow multiple enable calls', () => {
    const mode = new TDVExtendedModeFeature();
    mode.enable();
    mode.enable();
    expect(mode.isEnabled).toBe(true);
  });
});

describe('TDVTransparentModeFeature', () => {
  it('should initialize as disabled', () => {
    const mode = new TDVTransparentModeFeature();
    expect(mode.isEnabled).toBe(false);
  });

  it('should enable', () => {
    const mode = new TDVTransparentModeFeature();
    mode.enable();
    expect(mode.isEnabled).toBe(true);
  });

  it('should disable', () => {
    const mode = new TDVTransparentModeFeature();
    mode.enable();
    mode.disable();
    expect(mode.isEnabled).toBe(false);
  });

  it('should reset to disabled', () => {
    const mode = new TDVTransparentModeFeature();
    mode.enable();
    mode.reset();
    expect(mode.isEnabled).toBe(false);
  });
});

describe('TDV2215Features', () => {
  it('should create with all sub-features', () => {
    const features = new TDV2215Features();
    expect(features.extendedMode).toBeDefined();
    expect(features.transparentMode).toBeDefined();
    expect(features.dcsHandler).toBeDefined();
  });

  it('should expose isExtendedMode from sub-feature', () => {
    const features = new TDV2215Features();
    expect(features.isExtendedMode).toBe(false);
    features.extendedMode.enable();
    expect(features.isExtendedMode).toBe(true);
  });

  it('should expose isTransparentMode from sub-feature', () => {
    const features = new TDV2215Features();
    expect(features.isTransparentMode).toBe(false);
    features.transparentMode.enable();
    expect(features.isTransparentMode).toBe(true);
  });

  it('should reset all sub-features', () => {
    const features = new TDV2215Features();
    features.extendedMode.enable();
    features.transparentMode.enable();
    features.dcsHandler.startDCS();
    features.dcsHandler.addDCSCharacter(0x41);

    features.reset();

    expect(features.isExtendedMode).toBe(false);
    expect(features.isTransparentMode).toBe(false);
    expect(features.dcsHandler.isReceivingDCS).toBe(false);
  });

  it('should allow independent sub-feature control', () => {
    const features = new TDV2215Features();
    features.extendedMode.enable();
    expect(features.isExtendedMode).toBe(true);
    expect(features.isTransparentMode).toBe(false);

    features.transparentMode.enable();
    expect(features.isExtendedMode).toBe(true);
    expect(features.isTransparentMode).toBe(true);

    features.extendedMode.disable();
    expect(features.isExtendedMode).toBe(false);
    expect(features.isTransparentMode).toBe(true);
  });
});
