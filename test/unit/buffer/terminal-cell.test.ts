import { describe, it, expect } from 'vitest';
import { TerminalCell } from '../../../src/buffer/TerminalCell';
import { CharacterAttributes } from '../../../src/buffer/CharacterAttributes';
import { TerminalColor } from '../../../src/buffer/TerminalColor';

describe('TerminalCell', () => {
  it('should create with default values', () => {
    const cell = new TerminalCell();
    expect(cell.codepoint).toBe(0);
    expect(cell.attributes).toBe(CharacterAttributes.None);
    expect(cell.characterSet).toBe(0);
    expect(cell.foreground.isDefault).toBe(true);
    expect(cell.background.isDefault).toBe(true);
  });

  it('should create with codepoint', () => {
    const cell = new TerminalCell(0x41);
    expect(cell.codepoint).toBe(0x41);
  });

  it('should create with static factory', () => {
    const cell = TerminalCell.create(
      0x41,
      CharacterAttributes.Bold,
      TerminalColor.fromIndex(1),
      TerminalColor.fromIndex(2),
    );
    expect(cell.codepoint).toBe(0x41);
    expect(cell.attributes).toBe(CharacterAttributes.Bold);
    expect(cell.foreground.index).toBe(1);
    expect(cell.background.index).toBe(2);
  });

  it('should get/set doubleWidth', () => {
    const cell = new TerminalCell();
    expect(cell.doubleWidth).toBe(false);
    cell.doubleWidth = true;
    expect(cell.doubleWidth).toBe(true);
  });

  it('should get/set doubleHeight', () => {
    const cell = new TerminalCell();
    cell.doubleHeight = true;
    expect(cell.doubleHeight).toBe(true);
  });

  it('should get/set fontNumber', () => {
    const cell = new TerminalCell();
    cell.fontNumber = 3;
    expect(cell.fontNumber).toBe(3);
    cell.fontNumber = 7;
    expect(cell.fontNumber).toBe(7);
  });

  it('should get/set fieldAttribute', () => {
    const cell = new TerminalCell();
    cell.fieldAttribute = 5;
    expect(cell.fieldAttribute).toBe(5);
  });

  it('should not conflict between flag fields', () => {
    const cell = new TerminalCell();
    cell.doubleWidth = true;
    cell.fontNumber = 3;
    cell.fieldAttribute = 2;
    expect(cell.doubleWidth).toBe(true);
    expect(cell.fontNumber).toBe(3);
    expect(cell.fieldAttribute).toBe(2);
  });

  it('should report isEmpty correctly', () => {
    const empty = new TerminalCell(0);
    expect(empty.isEmpty).toBe(true);

    const space = new TerminalCell(0x20);
    expect(space.isEmpty).toBe(true);

    const a = new TerminalCell(0x41);
    expect(a.isEmpty).toBe(false);

    const emptyWithAttr = new TerminalCell(0x20);
    emptyWithAttr.attributes = CharacterAttributes.Bold;
    expect(emptyWithAttr.isEmpty).toBe(false);
  });

  it('should getString correctly', () => {
    expect(new TerminalCell(0).getString()).toBe(' ');
    expect(new TerminalCell(0x41).getString()).toBe('A');
    expect(new TerminalCell(0x20AC).getString()).toBe('€');
  });

  it('should clear to defaults', () => {
    const cell = TerminalCell.create(0x41, CharacterAttributes.Bold, TerminalColor.fromIndex(1), TerminalColor.fromIndex(2));
    cell.fontNumber = 3;
    cell.clear();
    expect(cell.codepoint).toBe(0);
    expect(cell.attributes).toBe(CharacterAttributes.None);
    expect(cell.fontNumber).toBe(0);
    expect(cell.foreground.isDefault).toBe(true);
  });

  it('should deep copy from another cell', () => {
    const src = TerminalCell.create(0x41, CharacterAttributes.Bold, TerminalColor.fromIndex(1), TerminalColor.fromRgb(255, 0, 0));
    src.fontNumber = 2;
    const dst = new TerminalCell();
    dst.copyFrom(src);
    expect(dst.codepoint).toBe(0x41);
    expect(dst.fontNumber).toBe(2);
    expect(dst.foreground.index).toBe(1);
  });

  it('should clone correctly', () => {
    const src = TerminalCell.create(0x41, CharacterAttributes.Italic, TerminalColor.Default, TerminalColor.Default);
    const clone = src.clone();
    expect(clone.equals(src)).toBe(true);
    clone.codepoint = 0x42;
    expect(src.codepoint).toBe(0x41); // Original unchanged
  });

  it('should check equality', () => {
    const a = TerminalCell.create(0x41, CharacterAttributes.Bold, TerminalColor.fromIndex(1), TerminalColor.Default);
    const b = TerminalCell.create(0x41, CharacterAttributes.Bold, TerminalColor.fromIndex(1), TerminalColor.Default);
    const c = TerminalCell.create(0x42, CharacterAttributes.Bold, TerminalColor.fromIndex(1), TerminalColor.Default);
    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });
});
