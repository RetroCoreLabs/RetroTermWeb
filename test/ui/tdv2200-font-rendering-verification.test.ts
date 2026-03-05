/**
 * TDV2200 font rendering verification tests.
 * Full pipeline tests verifying charset designation -> buffer fontNumber -> distinct pixel output.
 *
 * These tests verify that the rendering pipeline produces visually distinct output
 * when different character sets are active, using BitmapFontRenderer.getGlyphPixels().
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Terminal } from '../../src/terminal/Terminal';
import { BitmapFontRenderer } from '../../src/renderer/BitmapFontRenderer';
import { FontTDV2200 } from '../../src/fonts/FontTDV2200';
import { CHARSET_TYPE_TO_FONTNUM } from '../../src/emulators/tdv/components/TDVCharacterSets';

describe('TDV2200 font rendering verification', () => {
  let container: HTMLElement;
  let term: Terminal;

  beforeEach(() => {
    container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '400px';
    document.body.appendChild(container);
    term = new Terminal({ rows: 24, cols: 80, emulatorType: 'tdv2200' });
    term.open(container);
  });

  afterEach(() => {
    term.dispose();
    document.body.innerHTML = '';
  });

  /**
   * Helper: compare two pixel grids and return whether they differ.
   */
  function pixelsDiffer(a: boolean[][], b: boolean[][]): boolean {
    if (a.length !== b.length) return true;
    for (let r = 0; r < a.length; r++) {
      if (a[r].length !== b[r].length) return true;
      for (let c = 0; c < a[r].length; c++) {
        if (a[r][c] !== b[r][c]) return true;
      }
    }
    return false;
  }

  describe('Different banks produce different pixels', () => {
    it('GraphicsI (charset 1, fontNum 2) differs from USASCII (charset 0, fontNum 0)', () => {
      const renderer = new BitmapFontRenderer(new FontTDV2200());
      const fontNum0 = CHARSET_TYPE_TO_FONTNUM[0] ?? 0; // USASCII -> 0
      const fontNum1 = CHARSET_TYPE_TO_FONTNUM[1];       // GraphicsI -> 2
      expect(fontNum0).toBe(0);
      expect(fontNum1).toBe(2);

      // Compare multiple codepoints to ensure banks differ
      let diffCount = 0;
      for (const ch of [0x41, 0x60, 0x30, 0x5A]) {
        const ascii = renderer.getGlyphPixels(ch, fontNum0);
        const graphI = renderer.getGlyphPixels(ch, fontNum1);
        expect(ascii).not.toBeNull();
        expect(graphI).not.toBeNull();
        if (pixelsDiffer(ascii!, graphI!)) diffCount++;
      }
      expect(diffCount).toBeGreaterThan(0);
    });

    it('GraphicsII (charset 2, fontNum 3) differs from GraphicsI (charset 1, fontNum 2)', () => {
      const renderer = new BitmapFontRenderer(new FontTDV2200());
      const fontNumGI = CHARSET_TYPE_TO_FONTNUM[1];  // GraphicsI -> 2
      const fontNumGII = CHARSET_TYPE_TO_FONTNUM[2]; // GraphicsII -> 3
      expect(fontNumGI).toBe(2);
      expect(fontNumGII).toBe(3);

      let diffCount = 0;
      for (const ch of [0x41, 0x60, 0x30]) {
        const gI = renderer.getGlyphPixels(ch, fontNumGI);
        const gII = renderer.getGlyphPixels(ch, fontNumGII);
        expect(gI).not.toBeNull();
        expect(gII).not.toBeNull();
        if (pixelsDiffer(gI!, gII!)) diffCount++;
      }
      expect(diffCount).toBeGreaterThan(0);
    });

    it('ND Private (charset 9, fontNum 4) differs from USASCII', () => {
      const renderer = new BitmapFontRenderer(new FontTDV2200());
      const fontNumND = CHARSET_TYPE_TO_FONTNUM[9]; // ND -> 4
      expect(fontNumND).toBe(4);

      let diffCount = 0;
      for (const ch of [0x41, 0x42, 0x43]) {
        const ascii = renderer.getGlyphPixels(ch, 0);
        const nd = renderer.getGlyphPixels(ch, fontNumND);
        expect(ascii).not.toBeNull();
        expect(nd).not.toBeNull();
        if (pixelsDiffer(ascii!, nd!)) diffCount++;
      }
      expect(diffCount).toBeGreaterThan(0);
    });
  });

  describe('Same bank produces same pixels', () => {
    it('Math (charset 3) = GraphicsI (charset 1) — both fontNum 2', () => {
      const renderer = new BitmapFontRenderer(new FontTDV2200());
      const fontNumMath = CHARSET_TYPE_TO_FONTNUM[3];    // Math -> 2
      const fontNumGraphI = CHARSET_TYPE_TO_FONTNUM[1];  // GraphicsI -> 2
      expect(fontNumMath).toBe(2);
      expect(fontNumGraphI).toBe(2);

      for (const ch of [0x41, 0x60, 0x30, 0x5A]) {
        const math = renderer.getGlyphPixels(ch, fontNumMath);
        const graphI = renderer.getGlyphPixels(ch, fontNumGraphI);
        expect(math).not.toBeNull();
        expect(graphI).not.toBeNull();
        expect(pixelsDiffer(math!, graphI!)).toBe(false);
      }
    });

    it('Greek (charset 4) = GraphicsI (charset 1) — both fontNum 2', () => {
      const renderer = new BitmapFontRenderer(new FontTDV2200());
      const fontNumGreek = CHARSET_TYPE_TO_FONTNUM[4];   // Greek -> 2
      const fontNumGraphI = CHARSET_TYPE_TO_FONTNUM[1];  // GraphicsI -> 2
      expect(fontNumGreek).toBe(2);
      expect(fontNumGraphI).toBe(2);

      for (const ch of [0x41, 0x60, 0x30]) {
        const greek = renderer.getGlyphPixels(ch, fontNumGreek);
        const graphI = renderer.getGlyphPixels(ch, fontNumGraphI);
        expect(greek).not.toBeNull();
        expect(graphI).not.toBeNull();
        expect(pixelsDiffer(greek!, graphI!)).toBe(false);
      }
    });

    it('Diacritics (charset 5) = USASCII (charset 0) — both fontNum 0', () => {
      const renderer = new BitmapFontRenderer(new FontTDV2200());
      const fontNumDiac = CHARSET_TYPE_TO_FONTNUM[5];  // Diacritics -> 0
      expect(fontNumDiac).toBe(0);

      for (const ch of [0x41, 0x60, 0x30, 0x5A]) {
        const diac = renderer.getGlyphPixels(ch, fontNumDiac);
        const ascii = renderer.getGlyphPixels(ch, 0);
        expect(diac).not.toBeNull();
        expect(ascii).not.toBeNull();
        expect(pixelsDiffer(diac!, ascii!)).toBe(false);
      }
    });

    it('Box (charset 6) = GraphicsI (charset 1) — both fontNum 2', () => {
      const renderer = new BitmapFontRenderer(new FontTDV2200());
      const fontNumBox = CHARSET_TYPE_TO_FONTNUM[6];    // Box -> 2
      const fontNumGraphI = CHARSET_TYPE_TO_FONTNUM[1]; // GraphicsI -> 2
      expect(fontNumBox).toBe(2);
      expect(fontNumGraphI).toBe(2);

      for (const ch of [0x41, 0x60]) {
        const box = renderer.getGlyphPixels(ch, fontNumBox);
        const graphI = renderer.getGlyphPixels(ch, fontNumGraphI);
        expect(box).not.toBeNull();
        expect(graphI).not.toBeNull();
        expect(pixelsDiffer(box!, graphI!)).toBe(false);
      }
    });

    it('NIX/Nordic (charset 7) = USASCII (charset 0) — both fontNum 0', () => {
      const renderer = new BitmapFontRenderer(new FontTDV2200());
      const fontNumNIX = CHARSET_TYPE_TO_FONTNUM[7]; // NIX -> 0
      expect(fontNumNIX).toBe(0);

      for (const ch of [0x41, 0x60, 0x30]) {
        const nix = renderer.getGlyphPixels(ch, fontNumNIX);
        const ascii = renderer.getGlyphPixels(ch, 0);
        expect(nix).not.toBeNull();
        expect(ascii).not.toBeNull();
        expect(pixelsDiffer(nix!, ascii!)).toBe(false);
      }
    });

    it('Technical (charset 8) = GraphicsI (charset 1) — both fontNum 2', () => {
      const renderer = new BitmapFontRenderer(new FontTDV2200());
      const fontNumTech = CHARSET_TYPE_TO_FONTNUM[8];   // Technical -> 2
      const fontNumGraphI = CHARSET_TYPE_TO_FONTNUM[1]; // GraphicsI -> 2
      expect(fontNumTech).toBe(2);
      expect(fontNumGraphI).toBe(2);

      for (const ch of [0x41, 0x60]) {
        const tech = renderer.getGlyphPixels(ch, fontNumTech);
        const graphI = renderer.getGlyphPixels(ch, fontNumGraphI);
        expect(tech).not.toBeNull();
        expect(graphI).not.toBeNull();
        expect(pixelsDiffer(tech!, graphI!)).toBe(false);
      }
    });
  });

  describe('Full pipeline: charset designation to buffer to pixels', () => {
    function emu(): any { return term.getEmulator(); }
    function buf() { return emu().buffer; }

    it('writing with GraphicsI charset stores fontNumber=2 in buffer', () => {
      // Designate GraphicsI (type 1) to G0, then invoke G0 with SI
      term.write('\x1b(1');  // ESC ( 1 = designate charset type 1 to G0
      term.write('\x0F');    // SI = invoke G0
      term.write('\x1b[1;1H'); // Home cursor
      term.write(String.fromCharCode(0x60)); // Write a character
      expect(buf().getCellRef(0, 0).fontNumber).toBe(2);
    });

    it('writing with USASCII stores fontNumber=0 in buffer', () => {
      term.write('A'); // 'A' in default USASCII
      expect(buf().getCellRef(0, 0).fontNumber).toBe(0);
    });

    it('buffer fontNumber maps to correct renderer bank', () => {
      const renderer = new BitmapFontRenderer(new FontTDV2200());

      // Write 'a' (0x61) in USASCII (fontNum 0)
      term.write('a');
      const cell0 = buf().getCellRef(0, 0);

      // Switch to GraphicsI and write 'a' (0x61, fontNum 2)
      term.write('\x1b(1\x0F'); // Designate type 1 to G0 + SI
      term.write(String.fromCharCode(0x61));
      const cell1 = buf().getCellRef(0, 1);

      expect(cell0.fontNumber).toBe(0);
      expect(cell1.fontNumber).toBe(2);

      const pixels0 = renderer.getGlyphPixels(cell0.codepoint, cell0.fontNumber);
      const pixels1 = renderer.getGlyphPixels(cell1.codepoint, cell1.fontNumber);
      expect(pixels0).not.toBeNull();
      expect(pixels1).not.toBeNull();
      expect(pixelsDiffer(pixels0!, pixels1!)).toBe(true);
    });
  });
});
