/**
 * Represents a single cell in the terminal buffer.
 * Mirrors the C# TerminalCell struct.
 *
 * Fields:
 * - codepoint: Unicode codepoint of the character
 * - attributes: CharacterAttributes bitfield
 * - characterSet: Character set index (0=ASCII, 1-15=alternate)
 * - flags: Packed bitfield (doubleWidth, doubleHeight, fontNumber, fieldAttribute)
 * - foreground: Foreground color
 * - background: Background color
 */

import { CharacterAttributes } from './CharacterAttributes';
import { TerminalColor } from './TerminalColor';

/**
 * A terminal cell. Mutable for performance (avoids allocation on every write).
 * Use copyFrom() for value-copy semantics.
 */
export class TerminalCell {
  codepoint: number;
  attributes: CharacterAttributes;
  characterSet: number;
  foreground: TerminalColor;
  background: TerminalColor;

  /**
   * Packed flags:
   *   bit 0: doubleWidth
   *   bit 1: doubleHeight
   *   bits 2-5: fontNumber (0-15)
   *   bits 6-8: fieldAttribute (0-7)
   */
  private _flags: number;

  constructor(codepoint: number = 0) {
    this.codepoint = codepoint;
    this.attributes = CharacterAttributes.None;
    this.characterSet = 0;
    this._flags = 0;
    this.foreground = TerminalColor.Default;
    this.background = TerminalColor.Default;
  }

  static create(
    codepoint: number,
    attributes: CharacterAttributes,
    foreground: TerminalColor,
    background: TerminalColor,
    characterSet: number = 0,
  ): TerminalCell {
    const cell = new TerminalCell(codepoint);
    cell.attributes = attributes;
    cell.foreground = foreground;
    cell.background = background;
    cell.characterSet = characterSet;
    return cell;
  }

  get doubleWidth(): boolean {
    return (this._flags & 0x01) !== 0;
  }
  set doubleWidth(value: boolean) {
    this._flags = value ? (this._flags | 0x01) : (this._flags & ~0x01);
  }

  get doubleHeight(): boolean {
    return (this._flags & 0x02) !== 0;
  }
  set doubleHeight(value: boolean) {
    this._flags = value ? (this._flags | 0x02) : (this._flags & ~0x02);
  }

  get fontNumber(): number {
    return (this._flags >>> 2) & 0x0F;
  }
  set fontNumber(value: number) {
    this._flags = (this._flags & ~(0x0F << 2)) | ((value & 0x0F) << 2);
  }

  get fieldAttribute(): number {
    return (this._flags >>> 6) & 0x07;
  }
  set fieldAttribute(value: number) {
    this._flags = (this._flags & ~(0x07 << 6)) | ((value & 0x07) << 6);
  }

  /** True if this cell has no meaningful content */
  get isEmpty(): boolean {
    return (this.codepoint === 0 || this.codepoint === 0x20) &&
      this.attributes === CharacterAttributes.None &&
      this.foreground.isDefault &&
      this.background.isDefault;
  }

  /** True if any character attributes are set */
  get hasAttributes(): boolean {
    return this.attributes !== CharacterAttributes.None;
  }

  /** Get the character as a string */
  getString(): string {
    if (this.codepoint === 0) return ' ';
    if (this.codepoint <= 0xFFFF) return String.fromCharCode(this.codepoint);
    return String.fromCodePoint(this.codepoint);
  }

  /** Reset all fields to defaults */
  clear(): void {
    this.codepoint = 0;
    this.attributes = CharacterAttributes.None;
    this.characterSet = 0;
    this._flags = 0;
    this.foreground = TerminalColor.Default;
    this.background = TerminalColor.Default;
  }

  /** Copy attributes (not codepoint) from another cell */
  copyAttributesFrom(other: TerminalCell): void {
    this.attributes = other.attributes;
    this.characterSet = other.characterSet;
    this.fontNumber = other.fontNumber;
    this.foreground = other.foreground;
    this.background = other.background;
  }

  /** Deep copy from another cell */
  copyFrom(other: TerminalCell): void {
    this.codepoint = other.codepoint;
    this.attributes = other.attributes;
    this.characterSet = other.characterSet;
    this._flags = other._flags;
    this.foreground = other.foreground;
    this.background = other.background;
  }

  /** Create a deep clone */
  clone(): TerminalCell {
    const cell = new TerminalCell();
    cell.copyFrom(this);
    return cell;
  }

  /** Value equality */
  equals(other: TerminalCell): boolean {
    return this.codepoint === other.codepoint &&
      this.attributes === other.attributes &&
      this.characterSet === other.characterSet &&
      this._flags === other._flags &&
      this.foreground.equals(other.foreground) &&
      this.background.equals(other.background);
  }

  /** An empty cell (codepoint 0) */
  static empty(): TerminalCell {
    return new TerminalCell(0);
  }

  /** A space cell (codepoint 32) */
  static space(): TerminalCell {
    return new TerminalCell(0x20);
  }
}
