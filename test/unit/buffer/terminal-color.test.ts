import { describe, it, expect } from 'vitest';
import { TerminalColor, StandardColors } from '../../../src/buffer/TerminalColor';

describe('TerminalColor', () => {
  it('should create default color', () => {
    const color = TerminalColor.Default;
    expect(color.isDefault).toBe(true);
    expect(color.isIndexed).toBe(false);
    expect(color.isRgb).toBe(false);
  });

  it('should create indexed color', () => {
    const color = TerminalColor.fromIndex(1);
    expect(color.isDefault).toBe(false);
    expect(color.isIndexed).toBe(true);
    expect(color.index).toBe(1);
  });

  it('should create RGB color', () => {
    const color = TerminalColor.fromRgb(255, 128, 0);
    expect(color.isRgb).toBe(true);
    expect(color.r).toBe(255);
    expect(color.g).toBe(128);
    expect(color.b).toBe(0);
  });

  it('should check equality', () => {
    expect(TerminalColor.Default.equals(TerminalColor.Default)).toBe(true);
    expect(TerminalColor.fromIndex(1).equals(TerminalColor.fromIndex(1))).toBe(true);
    expect(TerminalColor.fromIndex(1).equals(TerminalColor.fromIndex(2))).toBe(false);
    expect(TerminalColor.fromRgb(1, 2, 3).equals(TerminalColor.fromRgb(1, 2, 3))).toBe(true);
    expect(TerminalColor.fromRgb(1, 2, 3).equals(TerminalColor.fromRgb(1, 2, 4))).toBe(false);
    expect(TerminalColor.Default.equals(TerminalColor.fromIndex(0))).toBe(false);
  });

  it('should convert standard colors to RGB', () => {
    const red = TerminalColor.fromIndex(StandardColors.Red);
    const rgb = red.toRgb();
    expect(rgb.r).toBe(205);
    expect(rgb.g).toBe(0);
    expect(rgb.b).toBe(0);
  });

  it('should convert 216-color cube to RGB', () => {
    // Index 16 = first cube color (0,0,0)
    expect(TerminalColor.fromIndex(16).toRgb()).toEqual({ r: 0, g: 0, b: 0 });
    // Index 196 = (5,0,0) = (255,0,0)
    expect(TerminalColor.fromIndex(196).toRgb()).toEqual({ r: 255, g: 0, b: 0 });
  });

  it('should convert grayscale to RGB', () => {
    // Index 232 = first grayscale (gray = 8)
    const gray = TerminalColor.fromIndex(232).toRgb();
    expect(gray.r).toBe(8);
    expect(gray.g).toBe(8);
    expect(gray.b).toBe(8);

    // Index 255 = last grayscale (gray = 238)
    const last = TerminalColor.fromIndex(255).toRgb();
    expect(last.r).toBe(238);
    expect(last.g).toBe(238);
    expect(last.b).toBe(238);
  });

  it('should convert default to black RGB', () => {
    expect(TerminalColor.Default.toRgb()).toEqual({ r: 0, g: 0, b: 0 });
  });
});
