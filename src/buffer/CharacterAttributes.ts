/**
 * Character attribute flags stored as a 16-bit bitfield.
 * Maps to SGR (Select Graphic Rendition) escape sequence parameters.
 */
export const enum CharacterAttributes {
  None              = 0,
  Bold              = 1 << 0,   // SGR 1
  Dim               = 1 << 1,   // SGR 2
  Italic            = 1 << 2,   // SGR 3
  Underline         = 1 << 3,   // SGR 4
  Blink             = 1 << 4,   // SGR 5
  RapidBlink        = 1 << 5,   // SGR 6
  Reverse           = 1 << 6,   // SGR 7
  Hidden            = 1 << 7,   // SGR 8
  Strikethrough     = 1 << 8,   // SGR 9
  DoubleWidth       = 1 << 9,   // DECDWL
  DoubleHeightTop   = 1 << 10,  // DECDHL top half
  DoubleHeightBottom = 1 << 11, // DECDHL bottom half
  Protected         = 1 << 12,  // Protected fields (forms mode)
}

/** Check if an attribute flag is set */
export function hasAttribute(attrs: CharacterAttributes, flag: CharacterAttributes): boolean {
  return (attrs & flag) === flag;
}

/** Set an attribute flag */
export function setAttribute(attrs: CharacterAttributes, flag: CharacterAttributes): CharacterAttributes {
  return (attrs | flag) as CharacterAttributes;
}

/** Clear an attribute flag */
export function clearAttribute(attrs: CharacterAttributes, flag: CharacterAttributes): CharacterAttributes {
  return (attrs & ~flag) as CharacterAttributes;
}

/** Toggle an attribute flag */
export function toggleAttribute(attrs: CharacterAttributes, flag: CharacterAttributes): CharacterAttributes {
  return (attrs ^ flag) as CharacterAttributes;
}

/** Check if any double-size attribute is set */
export function isDoubleSize(attrs: CharacterAttributes): boolean {
  return (attrs & (CharacterAttributes.DoubleWidth | CharacterAttributes.DoubleHeightTop | CharacterAttributes.DoubleHeightBottom)) !== 0;
}
