import { describe, it, expect } from 'vitest';
import { TDVISO646VariantHandler } from '../../../src/emulators/tdv/components/TDVISO646VariantHandler';
import { TDV2200ISO646Variant } from '../../../src/emulators/tdv/TDV2200ISO646Variant';

describe('TDVISO646VariantHandler', () => {
  it('should initialize to International variant', () => {
    const handler = new TDVISO646VariantHandler();
    expect(handler.currentISO646Variant).toBe(TDV2200ISO646Variant.International);
    expect(handler.isExpectingVariant).toBe(false);
  });

  it('should start expecting variant after startExpectingVariant()', () => {
    const handler = new TDVISO646VariantHandler();
    handler.startExpectingVariant();
    expect(handler.isExpectingVariant).toBe(true);
  });

  it('should select International variant with "I"', () => {
    const handler = new TDVISO646VariantHandler();
    handler.startExpectingVariant();
    const result = handler.handleVariantSelection(0x49); // 'I'
    expect(result).toBe(true);
    expect(handler.currentISO646Variant).toBe(TDV2200ISO646Variant.International);
    expect(handler.isExpectingVariant).toBe(false);
  });

  it('should select Norwegian variant with "N"', () => {
    const handler = new TDVISO646VariantHandler();
    handler.startExpectingVariant();
    handler.handleVariantSelection(0x4E); // 'N'
    expect(handler.currentISO646Variant).toBe(TDV2200ISO646Variant.Norwegian);
  });

  it('should select Swedish variant with "S"', () => {
    const handler = new TDVISO646VariantHandler();
    handler.startExpectingVariant();
    handler.handleVariantSelection(0x53); // 'S'
    expect(handler.currentISO646Variant).toBe(TDV2200ISO646Variant.Swedish);
  });

  it('should select German variant with "G"', () => {
    const handler = new TDVISO646VariantHandler();
    handler.startExpectingVariant();
    handler.handleVariantSelection(0x47); // 'G'
    expect(handler.currentISO646Variant).toBe(TDV2200ISO646Variant.German);
  });

  it('should return false for unrecognized selector', () => {
    const handler = new TDVISO646VariantHandler();
    handler.startExpectingVariant();
    const result = handler.handleVariantSelection(0x58); // 'X'
    expect(result).toBe(false);
  });

  it('should return false when not expecting variant', () => {
    const handler = new TDVISO646VariantHandler();
    const result = handler.handleVariantSelection(0x4E); // 'N'
    expect(result).toBe(false);
    expect(handler.currentISO646Variant).toBe(TDV2200ISO646Variant.International);
  });

  it('should directly set variant', () => {
    const handler = new TDVISO646VariantHandler();
    handler.setVariant(TDV2200ISO646Variant.German);
    expect(handler.currentISO646Variant).toBe(TDV2200ISO646Variant.German);
  });

  it('should reset to International', () => {
    const handler = new TDVISO646VariantHandler();
    handler.setVariant(TDV2200ISO646Variant.Norwegian);
    handler.reset();
    expect(handler.currentISO646Variant).toBe(TDV2200ISO646Variant.International);
    expect(handler.isExpectingVariant).toBe(false);
  });
});
