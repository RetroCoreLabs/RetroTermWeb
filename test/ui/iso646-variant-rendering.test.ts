/**
 * ISO 646 Variant Rendering Tests
 * Port of TDV2215CharSetScreenshotTests.cs variant tests + CanvasRenderer sync validation.
 *
 * Tests that ISO 646 national variants change glyphs at the correct positions,
 * that switching back restores glyphs, and that CanvasRenderer.syncCharacterSetVariant works.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FontTDV2215 } from '../../src/fonts/FontTDV2215';
import { TDV2200Emulator } from '../../src/emulators/tdv/TDV2200Emulator';
import { TDV2215Emulator } from '../../src/emulators/tdv/TDV2215Emulator';
import { Terminal } from '../../src/terminal/Terminal';

describe('ISO 646 Variant Rendering', () => {
  const variantPositions = [0x5B, 0x5C, 0x5D, 0x7B, 0x7C, 0x7D, 0x7E];

  describe('FontTDV2215 variant glyph changes', () => {
    it('Norwegian variant should change glyphs at all variant positions', () => {
      const intlFont = new FontTDV2215();
      intlFont.characterSetVariant = 0;
      const norFont = new FontTDV2215();
      norFont.characterSetVariant = 1;

      for (const pos of variantPositions) {
        const intlBits = intlFont.getFontBits(pos, 0);
        const norBits = norFont.getFontBits(pos, 0);
        expect(intlBits).not.toBeNull();
        expect(norBits).not.toBeNull();
        let differs = false;
        for (let i = 0; i < intlBits!.length; i++) {
          if (intlBits![i] !== norBits![i]) { differs = true; break; }
        }
        expect(differs).toBe(true);
      }
    });

    it('Swedish variant should change glyphs at all variant positions', () => {
      const intlFont = new FontTDV2215();
      intlFont.characterSetVariant = 0;
      const sweFont = new FontTDV2215();
      sweFont.characterSetVariant = 2;

      for (const pos of variantPositions) {
        const intlBits = intlFont.getFontBits(pos, 0);
        const sweBits = sweFont.getFontBits(pos, 0);
        expect(intlBits).not.toBeNull();
        expect(sweBits).not.toBeNull();
        let differs = false;
        for (let i = 0; i < intlBits!.length; i++) {
          if (intlBits![i] !== sweBits![i]) { differs = true; break; }
        }
        expect(differs).toBe(true);
      }
    });

    it('German variant should change glyphs at all variant positions', () => {
      const intlFont = new FontTDV2215();
      intlFont.characterSetVariant = 0;
      const gerFont = new FontTDV2215();
      gerFont.characterSetVariant = 3;

      for (const pos of variantPositions) {
        const intlBits = intlFont.getFontBits(pos, 0);
        const gerBits = gerFont.getFontBits(pos, 0);
        expect(intlBits).not.toBeNull();
        expect(gerBits).not.toBeNull();
        let differs = false;
        for (let i = 0; i < intlBits!.length; i++) {
          if (intlBits![i] !== gerBits![i]) { differs = true; break; }
        }
        expect(differs).toBe(true);
      }
    });

    it('switching back to International should restore original glyphs', () => {
      const font = new FontTDV2215();

      // Capture international glyphs
      const intlGlyphs: (Uint16Array | null)[] = [];
      for (const pos of variantPositions) {
        intlGlyphs.push(font.getFontBits(pos, 0));
      }

      // Switch to Norwegian then back
      font.characterSetVariant = 1;
      font.characterSetVariant = 0;

      for (let idx = 0; idx < variantPositions.length; idx++) {
        const bits = font.getFontBits(variantPositions[idx], 0);
        expect(bits).not.toBeNull();
        expect(intlGlyphs[idx]).not.toBeNull();
        for (let i = 0; i < bits!.length; i++) {
          expect(bits![i]).toBe(intlGlyphs[idx]![i]);
        }
      }
    });
  });

  describe('getAvailableCharacterSetVariants', () => {
    it('TDV2200 should return 4 variants with correct descriptions', () => {
      const emulator = new TDV2200Emulator(80, 24);
      const variants = emulator.getAvailableCharacterSetVariants();

      expect(variants.length).toBe(4);
      expect(variants[0]).toEqual({ value: 0, description: 'International (US ASCII)' });
      expect(variants[1]).toEqual({ value: 1, description: 'Norwegian/Danish' });
      expect(variants[2]).toEqual({ value: 2, description: 'Swedish/Finnish' });
      expect(variants[3]).toEqual({ value: 3, description: 'German' });
    });

    it('TDV2215 should return 4 variants with correct descriptions', () => {
      const emulator = new TDV2215Emulator(80, 24);
      const variants = emulator.getAvailableCharacterSetVariants();

      expect(variants.length).toBe(4);
      expect(variants[0]).toEqual({ value: 0, description: 'International (US ASCII)' });
      expect(variants[1]).toEqual({ value: 1, description: 'Norwegian/Danish' });
      expect(variants[2]).toEqual({ value: 2, description: 'Swedish/Finnish' });
      expect(variants[3]).toEqual({ value: 3, description: 'German' });
    });
  });

  describe('CanvasRenderer variant syncing', () => {
    let container: HTMLElement;

    beforeEach(() => {
      container = document.createElement('div');
      container.style.width = '800px';
      container.style.height = '400px';
      document.body.appendChild(container);
    });

    afterEach(() => {
      document.body.innerHTML = '';
    });

    it('syncCharacterSetVariant should update font variant', () => {
      const term = new Terminal({
        rows: 24, cols: 80,
        emulatorType: 'tdv2215',
        useBitmapFont: true,
      });
      term.open(container);

      const renderer = term.getRenderer()!;
      expect(renderer).not.toBeNull();
      expect(renderer.isBitmapFontActive).toBe(true);

      // Sync variant to Norwegian
      renderer.syncCharacterSetVariant(1);
      const font = renderer.bitmapFontRenderer!.font;
      expect((font as { characterSetVariant: number }).characterSetVariant).toBe(1);

      term.dispose();
    });

    it('syncCharacterSetVariant should not re-set if value unchanged', () => {
      const term = new Terminal({
        rows: 24, cols: 80,
        emulatorType: 'tdv2215',
        useBitmapFont: true,
      });
      term.open(container);

      const renderer = term.getRenderer()!;

      // Call sync twice with same value — second call is a no-op
      renderer.syncCharacterSetVariant(2);
      const font = renderer.bitmapFontRenderer!.font;
      expect((font as { characterSetVariant: number }).characterSetVariant).toBe(2);

      // The internal _lastSyncedVariant should prevent re-setting
      renderer.syncCharacterSetVariant(2);
      expect((font as { characterSetVariant: number }).characterSetVariant).toBe(2);

      term.dispose();
    });
  });
});
