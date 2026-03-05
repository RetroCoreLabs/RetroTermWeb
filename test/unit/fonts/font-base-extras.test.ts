/**
 * Additional tests for FontBase edge cases.
 * Covers stretchY > 2, boundary conditions, and mapSpaceChar behavior.
 */
import { describe, it, expect } from 'vitest';
import { FontBase } from '../../../src/fonts/FontBase';

function createFont(opts: {
  height: number;
  width: number;
  stretchY?: number;
  glyphs: number[];
  fontNumOffset?: number[];
  mapSpaceChar?: number;
}): FontBase {
  const font = new FontBase();
  font.height = opts.height;
  font.heightToUse = opts.height;
  font.width = opts.width;
  font.stretchY = opts.stretchY ?? 1;
  font.glyphs = new Uint16Array(opts.glyphs);
  font.fontNumOffset = opts.fontNumOffset ?? [];
  font.mapSpaceChar = opts.mapSpaceChar ?? 0;
  return font;
}

describe('FontBase — stretchY=3', () => {
  it('should stretch rows with stretchY=3', () => {
    // With stretchY=3, height=6, rowsPerGlyph = 6/3 = 2
    // Glyph at pos 0: rows [0xAAAA, 0xBBBB]
    const font = createFont({
      height: 6,
      width: 16,
      stretchY: 3,
      glyphs: [0xAAAA, 0xBBBB, 0, 0], // glyph 0: 2 rows
    });

    const bits = font.getFontBits(0, 0);
    expect(bits).not.toBeNull();
    expect(bits!.length).toBe(6);

    // Row 0: i=0, bitrow=floor(0/3)=0, i%2=0 → glyphs[0] = 0xAAAA
    expect(bits![0]).toBe(0xAAAA);
    // Row 1: i=1, i%2=1 → 0 (odd row zeroed)
    expect(bits![1]).toBe(0);
    // Row 2: i=2, bitrow=floor(2/3)=0, i%2=0 → glyphs[0] = 0xAAAA
    expect(bits![2]).toBe(0xAAAA);
    // Row 3: i=3, i%2=1 → 0
    expect(bits![3]).toBe(0);
    // Row 4: i=4, bitrow=floor(4/3)=1, i%2=0 → glyphs[1] = 0xBBBB
    expect(bits![4]).toBe(0xBBBB);
    // Row 5: i=5, i%2=1 → 0
    expect(bits![5]).toBe(0);
  });
});

describe('FontBase — stretchY=4', () => {
  it('should stretch rows with stretchY=4', () => {
    // With stretchY=4, height=8, rowsPerGlyph = 8/4 = 2
    const font = createFont({
      height: 8,
      width: 16,
      stretchY: 4,
      glyphs: [0x1111, 0x2222, 0, 0],
    });

    const bits = font.getFontBits(0, 0);
    expect(bits).not.toBeNull();
    expect(bits!.length).toBe(8);

    // Even rows get glyph data, odd rows get 0
    expect(bits![0]).toBe(0x1111); // i=0, even, bitrow=0
    expect(bits![1]).toBe(0);      // i=1, odd
    expect(bits![2]).toBe(0x1111); // i=2, even, bitrow=0
    expect(bits![3]).toBe(0);      // i=3, odd
    expect(bits![4]).toBe(0x2222); // i=4, even, bitrow=1
    expect(bits![5]).toBe(0);      // i=5, odd
    expect(bits![6]).toBe(0x2222); // i=6, even, bitrow=1
    expect(bits![7]).toBe(0);      // i=7, odd
  });
});

describe('FontBase — boundary conditions', () => {
  it('should return null for empty glyph data', () => {
    const font = createFont({
      height: 16,
      width: 8,
      glyphs: [],
    });

    expect(font.getFontBits(0, 0)).toBeNull();
  });

  it('should return null when glyph offset exceeds data', () => {
    // font with only 16 rows of data — glyph 0 only
    const font = createFont({
      height: 16,
      width: 8,
      glyphs: Array.from({ length: 16 }, () => 0xFF),
    });

    // Glyph index 5 → startPos = 5*16 = 80, which exceeds glyphs.length(16)
    expect(font.getFontBits(5, 0)).toBeNull();
  });

  it('should return zeros for rows beyond glyph data', () => {
    // 32 rows of data, glyph 1 starts at row 16 but only partial data
    const glyphs = Array.from({ length: 20 }, (_, i) => i < 16 ? 0xFFFF : 0xAAAA);
    const font = createFont({
      height: 16,
      width: 8,
      glyphs,
    });

    // Glyph 1: startPos = 16, data from [16..19], rows 4-15 go out of bounds
    const bits = font.getFontBits(1, 0);
    expect(bits).not.toBeNull();
    // First 4 rows have data (indices 16..19)
    expect(bits![0]).toBe(0xAAAA);
    expect(bits![3]).toBe(0xAAAA);
    // Rows beyond available data should be 0
    expect(bits![4]).toBe(0);
    expect(bits![15]).toBe(0);
  });

  it('should handle fontNum with offset correctly', () => {
    // 3 fonts: font0 at offset 0, font1 at offset 256, font2 at offset 512
    const glyphs = new Array(1024 * 16).fill(0);
    // Put a recognizable pattern at font1, glyph 0x41 ('A')
    const startPos = (0x41 + 256) * 16;
    for (let i = 0; i < 16; i++) glyphs[startPos + i] = 0xDEAD;

    const font = createFont({
      height: 16,
      width: 8,
      glyphs,
      fontNumOffset: [0, 256, 512],
    });

    const bits = font.getFontBits(0x41, 1);
    expect(bits).not.toBeNull();
    expect(bits![0]).toBe(0xDEAD);
  });

  it('should use fontNumOffset[fontNum] when fontNum > 0', () => {
    const glyphs = new Array(200).fill(0);
    // Place data at position (0x10 + 50) * 1 = 66 (with height=1, stretchY=1)
    glyphs[66] = 0x1234;

    const font = createFont({
      height: 1,
      width: 16,
      glyphs,
      fontNumOffset: [0, 50, 100],
    });

    const bits = font.getFontBits(0x10, 1);
    expect(bits).not.toBeNull();
    expect(bits![0]).toBe(0x1234);
  });
});

describe('FontBase — mapSpaceChar', () => {
  it('should map space (0x20) to alternate character', () => {
    // Create font where glyph at position 5 has recognizable data
    const glyphs = new Array(100).fill(0);
    glyphs[5] = 0xBEEF; // 1-row glyph at position 5

    const font = createFont({
      height: 1,
      width: 16,
      glyphs,
      mapSpaceChar: 5,
    });

    const bits = font.getFontBits(0x20, 0);
    expect(bits).not.toBeNull();
    expect(bits![0]).toBe(0xBEEF);
  });

  it('should map space to position 0 when mapSpaceChar is 0 (default)', () => {
    const glyphs = new Array(100).fill(0);
    glyphs[0] = 0xAAAA; // 1-row glyph at position 0

    const font = createFont({
      height: 1,
      width: 16,
      glyphs,
      mapSpaceChar: 0,
    });

    const bits = font.getFontBits(0x20, 0);
    expect(bits).not.toBeNull();
    expect(bits![0]).toBe(0xAAAA);
  });

  it('should not affect non-space characters', () => {
    const glyphs = new Array(100).fill(0);
    glyphs[0x41] = 0x1111; // 'A' at native position

    const font = createFont({
      height: 1,
      width: 16,
      glyphs,
      mapSpaceChar: 5,
    });

    const bits = font.getFontBits(0x41, 0);
    expect(bits).not.toBeNull();
    expect(bits![0]).toBe(0x1111);
  });
});

describe('FontBase — stretchY=1 (no stretch)', () => {
  it('should return glyph data directly without modification', () => {
    const font = createFont({
      height: 4,
      width: 8,
      stretchY: 1,
      glyphs: [0x11, 0x22, 0x33, 0x44, 0xAA, 0xBB, 0xCC, 0xDD],
    });

    const bits = font.getFontBits(0, 0);
    expect(bits).not.toBeNull();
    expect(bits![0]).toBe(0x11);
    expect(bits![1]).toBe(0x22);
    expect(bits![2]).toBe(0x33);
    expect(bits![3]).toBe(0x44);
  });

  it('should return second glyph correctly', () => {
    const font = createFont({
      height: 4,
      width: 8,
      stretchY: 1,
      glyphs: [0x11, 0x22, 0x33, 0x44, 0xAA, 0xBB, 0xCC, 0xDD],
    });

    const bits = font.getFontBits(1, 0);
    expect(bits).not.toBeNull();
    expect(bits![0]).toBe(0xAA);
    expect(bits![1]).toBe(0xBB);
    expect(bits![2]).toBe(0xCC);
    expect(bits![3]).toBe(0xDD);
  });
});
