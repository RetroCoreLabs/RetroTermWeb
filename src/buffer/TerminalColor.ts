/**
 * Terminal color representation supporting default, indexed (256-color), and RGB modes.
 * Mirrors the C# TerminalColor struct.
 */

const enum ColorMode {
  Default = 0,
  Indexed = 1,
  RGB = 2,
}

/** Standard 16-color palette indices */
export const StandardColors = {
  Black: 0,
  Red: 1,
  Green: 2,
  Yellow: 3,
  Blue: 4,
  Magenta: 5,
  Cyan: 6,
  White: 7,
  BrightBlack: 8,
  BrightRed: 9,
  BrightGreen: 10,
  BrightYellow: 11,
  BrightBlue: 12,
  BrightMagenta: 13,
  BrightCyan: 14,
  BrightWhite: 15,
} as const;

/**
 * Immutable color value. Uses a compact representation:
 * - mode (byte): 0=default, 1=indexed, 2=rgb
 * - For indexed: index (byte)
 * - For RGB: r, g, b (bytes)
 *
 * We pack into a single uint32 for fast comparison:
 *   bits 0-7:   mode
 *   bits 8-15:  index (or r)
 *   bits 16-23: g
 *   bits 24-31: b
 */
export class TerminalColor {
  /** Packed representation for fast equality checks */
  private readonly _packed: number;

  private constructor(packed: number) {
    this._packed = packed;
  }

  /** Default terminal color (use terminal's configured fg/bg) */
  static readonly Default = new TerminalColor(ColorMode.Default);

  /** Create an indexed color (0-255 palette) */
  static fromIndex(index: number): TerminalColor {
    return new TerminalColor(ColorMode.Indexed | ((index & 0xFF) << 8));
  }

  /** Create a 24-bit RGB color */
  static fromRgb(r: number, g: number, b: number): TerminalColor {
    return new TerminalColor(
      ColorMode.RGB | ((r & 0xFF) << 8) | ((g & 0xFF) << 16) | ((b & 0xFF) << 24)
    );
  }

  get isDefault(): boolean {
    return (this._packed & 0xFF) === ColorMode.Default;
  }

  get isIndexed(): boolean {
    return (this._packed & 0xFF) === ColorMode.Indexed;
  }

  get isRgb(): boolean {
    return (this._packed & 0xFF) === ColorMode.RGB;
  }

  /** Palette index (valid only when isIndexed) */
  get index(): number {
    return (this._packed >>> 8) & 0xFF;
  }

  /** Red component (valid only when isRgb) */
  get r(): number {
    return (this._packed >>> 8) & 0xFF;
  }

  /** Green component (valid only when isRgb) */
  get g(): number {
    return (this._packed >>> 16) & 0xFF;
  }

  /** Blue component (valid only when isRgb) */
  get b(): number {
    return (this._packed >>> 24) & 0xFF;
  }

  /** Fast equality comparison */
  equals(other: TerminalColor): boolean {
    return this._packed === other._packed;
  }

  /** Convert any color to RGB tuple */
  toRgb(): { r: number; g: number; b: number } {
    const mode = this._packed & 0xFF;
    if (mode === ColorMode.RGB) {
      return { r: this.r, g: this.g, b: this.b };
    }
    if (mode === ColorMode.Indexed) {
      return indexToRgb(this.index);
    }
    return { r: 0, g: 0, b: 0 };
  }

  /** Get the packed value for serialization/comparison */
  get packed(): number {
    return this._packed;
  }
}

/** Standard 16-color RGB values */
const STANDARD_COLORS: readonly [number, number, number][] = [
  [0, 0, 0],       // 0: Black
  [205, 0, 0],     // 1: Red
  [0, 205, 0],     // 2: Green
  [205, 205, 0],   // 3: Yellow
  [0, 0, 238],     // 4: Blue
  [205, 0, 205],   // 5: Magenta
  [0, 205, 205],   // 6: Cyan
  [229, 229, 229], // 7: White
  [127, 127, 127], // 8: Bright Black (Gray)
  [255, 0, 0],     // 9: Bright Red
  [0, 255, 0],     // 10: Bright Green
  [255, 255, 0],   // 11: Bright Yellow
  [92, 92, 255],   // 12: Bright Blue
  [255, 0, 255],   // 13: Bright Magenta
  [0, 255, 255],   // 14: Bright Cyan
  [255, 255, 255], // 15: Bright White
];

/** Convert a 256-color palette index to RGB */
function indexToRgb(index: number): { r: number; g: number; b: number } {
  if (index < 16) {
    const [r, g, b] = STANDARD_COLORS[index];
    return { r, g, b };
  }
  if (index < 232) {
    // 216-color cube (indices 16-231)
    // Each component maps 0-5 to: 0, 95, 135, 175, 215, 255
    const idx = index - 16;
    const ri = Math.floor(idx / 36);
    const gi = Math.floor(idx / 6) % 6;
    const bi = idx % 6;
    const toVal = (v: number) => v === 0 ? 0 : 55 + v * 40;
    return { r: toVal(ri), g: toVal(gi), b: toVal(bi) };
  }
  // Grayscale ramp (indices 232-255)
  const gray = 8 + (index - 232) * 10;
  return { r: gray, g: gray, b: gray };
}
