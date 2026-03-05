import { describe, it, expect } from 'vitest';
import {
  CharacterAttributes,
  hasAttribute,
  setAttribute,
  clearAttribute,
  toggleAttribute,
  isDoubleSize,
} from '../../../src/buffer/CharacterAttributes';

describe('CharacterAttributes', () => {
  it('should have None as zero', () => {
    expect(CharacterAttributes.None).toBe(0);
  });

  it('should have correct bit positions', () => {
    expect(CharacterAttributes.Bold).toBe(1);
    expect(CharacterAttributes.Dim).toBe(2);
    expect(CharacterAttributes.Italic).toBe(4);
    expect(CharacterAttributes.Underline).toBe(8);
    expect(CharacterAttributes.Blink).toBe(16);
    expect(CharacterAttributes.RapidBlink).toBe(32);
    expect(CharacterAttributes.Reverse).toBe(64);
    expect(CharacterAttributes.Hidden).toBe(128);
    expect(CharacterAttributes.Strikethrough).toBe(256);
    expect(CharacterAttributes.Protected).toBe(4096);
  });

  it('should check hasAttribute', () => {
    const attrs = (CharacterAttributes.Bold | CharacterAttributes.Italic) as CharacterAttributes;
    expect(hasAttribute(attrs, CharacterAttributes.Bold)).toBe(true);
    expect(hasAttribute(attrs, CharacterAttributes.Italic)).toBe(true);
    expect(hasAttribute(attrs, CharacterAttributes.Underline)).toBe(false);
  });

  it('should set attribute', () => {
    const attrs = setAttribute(CharacterAttributes.None, CharacterAttributes.Bold);
    expect(hasAttribute(attrs, CharacterAttributes.Bold)).toBe(true);
  });

  it('should clear attribute', () => {
    const attrs = (CharacterAttributes.Bold | CharacterAttributes.Italic) as CharacterAttributes;
    const cleared = clearAttribute(attrs, CharacterAttributes.Bold);
    expect(hasAttribute(cleared, CharacterAttributes.Bold)).toBe(false);
    expect(hasAttribute(cleared, CharacterAttributes.Italic)).toBe(true);
  });

  it('should toggle attribute', () => {
    const attrs = toggleAttribute(CharacterAttributes.None, CharacterAttributes.Bold);
    expect(hasAttribute(attrs, CharacterAttributes.Bold)).toBe(true);
    const toggled = toggleAttribute(attrs, CharacterAttributes.Bold);
    expect(hasAttribute(toggled, CharacterAttributes.Bold)).toBe(false);
  });

  it('should detect double size', () => {
    expect(isDoubleSize(CharacterAttributes.None)).toBe(false);
    expect(isDoubleSize(CharacterAttributes.Bold)).toBe(false);
    expect(isDoubleSize(CharacterAttributes.DoubleWidth)).toBe(true);
    expect(isDoubleSize(CharacterAttributes.DoubleHeightTop)).toBe(true);
    expect(isDoubleSize(CharacterAttributes.DoubleHeightBottom)).toBe(true);
  });
});
