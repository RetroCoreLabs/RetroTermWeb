import { describe, it, expect } from 'vitest';
import { TDV2215Emulator } from '../../../src/emulators/tdv/TDV2215Emulator';
import { encode, getRowTextTrimmed, collectResponses, decodeResponse } from '../../helpers/test-emulator';
import { TDV2200ISO646Variant } from '../../../src/emulators/tdv/TDV2200ISO646Variant';

describe('TDV2215Emulator', () => {
  function create(cols = 80, rows = 24): TDV2215Emulator {
    return new TDV2215Emulator(cols, rows);
  }

  describe('properties', () => {
    it('should report terminal type', () => {
      const emu = create();
      expect(emu.getTerminalType()).toBe('TDV2215');
    });

    it('should initialize in non-extended, non-transparent mode', () => {
      const emu = create();
      expect(emu.isExtendedMode).toBe(false);
      expect(emu.isTransparentMode).toBe(false);
      expect(emu.is2115CompatibilityMode).toBe(false);
    });

    it('should have no pending single shift', () => {
      const emu = create();
      expect(emu.hasPendingSingleShift).toBe(false);
      expect(emu.pendingSingleShift).toBe(0);
    });

    it('should have default locked character set 0', () => {
      const emu = create();
      expect(emu.lockedCharacterSet).toBe(0);
    });
  });

  describe('extended mode', () => {
    it('should enable extended mode with CSI ? 1 h', () => {
      const emu = create();
      emu.processData(encode('\x1b[?1h'));
      expect(emu.isExtendedMode).toBe(true);
    });

    it('should disable extended mode with CSI ? 1 l', () => {
      const emu = create();
      emu.processData(encode('\x1b[?1h'));
      emu.processData(encode('\x1b[?1l'));
      expect(emu.isExtendedMode).toBe(false);
    });

    it('should enable with ESC Q when not in 2115 mode', () => {
      const emu = create();
      emu.processData(encode('\x1bQ'));
      expect(emu.isExtendedMode).toBe(true);
    });

    it('should report mode state in DECRQM', () => {
      const emu = create();
      emu.processData(encode('\x1b[?1h')); // Enable
      const responses = collectResponses(emu);
      emu.processData(encode('\x1b[?1$p'));
      expect(decodeResponse(responses[0])).toBe('\x1b[?1;1$y');
    });
  });

  describe('transparent mode', () => {
    it('should enable transparent mode with CSI ? 2 h', () => {
      const emu = create();
      emu.processData(encode('\x1b[?2h'));
      expect(emu.isTransparentMode).toBe(true);
    });

    it('should disable transparent mode with CSI ? 2 l', () => {
      const emu = create();
      emu.processData(encode('\x1b[?2h'));
      emu.processData(encode('\x1b[?2l'));
      expect(emu.isTransparentMode).toBe(false);
    });
  });

  describe('2115 compatibility mode', () => {
    it('should enable with CSI ? 40 h', () => {
      const emu = create();
      emu.processData(encode('\x1b[?40h'));
      expect(emu.is2115CompatibilityMode).toBe(true);
    });

    it('should disable with CSI ? 40 l', () => {
      const emu = create();
      emu.processData(encode('\x1b[?40h'));
      emu.processData(encode('\x1b[?40l'));
      expect(emu.is2115CompatibilityMode).toBe(false);
    });

    it('ESC Q should exit 2115 mode when active', () => {
      const emu = create();
      emu.processData(encode('\x1b[?40h'));
      expect(emu.is2115CompatibilityMode).toBe(true);
      emu.processData(encode('\x1bQ'));
      expect(emu.is2115CompatibilityMode).toBe(false);
    });

    it('should return 2115 DA when in compatibility mode', () => {
      const emu = create();
      emu.processData(encode('\x1b[?40h'));
      const responses = collectResponses(emu);
      emu.processData(encode('\x1b[c'));
      expect(decodeResponse(responses[0])).toBe('\x1b[?1;0c');
    });
  });

  describe('single shifts (SS2/SS3)', () => {
    it('ESC N should activate SS2', () => {
      const emu = create();
      emu.processData(encode('\x1bN'));
      expect(emu.hasPendingSingleShift).toBe(true);
      expect(emu.pendingSingleShift).toBe(2);
    });

    it('ESC O should activate SS3', () => {
      const emu = create();
      emu.processData(encode('\x1bO'));
      expect(emu.hasPendingSingleShift).toBe(true);
      expect(emu.pendingSingleShift).toBe(3);
    });

    it('SS2 should clear after one character', () => {
      const emu = create();
      emu.processData(encode('\x1bN'));
      emu.processData(encode('A'));
      expect(emu.hasPendingSingleShift).toBe(false);
    });

    it('SS2 should use G2 charset and set font number 2', () => {
      const emu = create();
      emu.processData(encode('\x1bN')); // SS2
      emu.processData(encode('`')); // 0x60 in GraphicsI = ◆
      const cell = emu.buffer.getCellRef(0, 0);
      expect(cell.fontNumber).toBe(2);
    });

    it('SS3 should use G3 charset and set font number 3', () => {
      const emu = create();
      emu.processData(encode('\x1bO')); // SS3
      emu.processData(encode('`')); // 0x60 in GraphicsII = •
      const cell = emu.buffer.getCellRef(0, 0);
      expect(cell.fontNumber).toBe(3);
    });

    it('SS3 should render subscript digit bytes (0x00-0x09) as characters', () => {
      const emu = create();
      // Subscript digits are at bytes 0x00-0x09 in G3 (GraphicsII) charset.
      // These are control code bytes, but SS3 must treat them as display characters.
      for (let digit = 0; digit <= 9; digit++) {
        emu.processData(new Uint8Array([0x1B, 0x4F])); // ESC O = SS3
        emu.processData(new Uint8Array([digit]));       // subscript digit byte
      }
      for (let col = 0; col < 10; col++) {
        const cell = emu.buffer.getCellRef(0, col);
        expect(cell.fontNumber).toBe(3);
        expect(cell.codepoint).toBe(col);
      }
    });

    it('SS3 should render superscript digit bytes (0x10-0x19) as characters', () => {
      const emu = create();
      // Superscript digits are at bytes 0x10-0x19 in G3 charset.
      for (let digit = 0; digit <= 9; digit++) {
        emu.processData(new Uint8Array([0x1B, 0x4F])); // ESC O = SS3
        emu.processData(new Uint8Array([0x10 + digit])); // superscript digit byte
      }
      for (let col = 0; col < 10; col++) {
        const cell = emu.buffer.getCellRef(0, col);
        expect(cell.fontNumber).toBe(3);
        expect(cell.codepoint).toBe(0x10 + col);
      }
    });

    it('SS3 should clear pending state after control code byte', () => {
      const emu = create();
      emu.processData(new Uint8Array([0x1B, 0x4F])); // ESC O = SS3
      expect(emu.hasPendingSingleShift).toBe(true);
      emu.processData(new Uint8Array([0x05])); // subscript digit 5
      expect(emu.hasPendingSingleShift).toBe(false);
      // Next character should be normal (fontNumber 0)
      emu.processData(encode('A'));
      expect(emu.buffer.getCellRef(0, 1).fontNumber).toBe(0);
    });
  });

  describe('locking shifts', () => {
    it('ESC n should lock to G2 (LS2)', () => {
      const emu = create();
      emu.processData(encode('\x1bn'));
      expect(emu.lockedCharacterSet).toBe(2);
    });

    it('ESC o should lock to G3 (LS3)', () => {
      const emu = create();
      emu.processData(encode('\x1bo'));
      expect(emu.lockedCharacterSet).toBe(3);
    });

    it('LS2 should set font number on subsequent characters', () => {
      const emu = create();
      emu.processData(encode('\x1bn')); // LS2 -> G2
      emu.processData(encode('A'));
      const cell = emu.buffer.getCellRef(0, 0);
      expect(cell.fontNumber).toBe(2);
    });

    it('ESC ~ should set LS1R', () => {
      const emu = create();
      emu.processData(encode('\x1b~'));
      expect(emu.getCurrentCharacterSet()).toBe(1);
    });

    it('ESC } should set LS2R', () => {
      const emu = create();
      emu.processData(encode('\x1b}'));
      expect(emu.getCurrentCharacterSet()).toBe(2);
    });

    it('ESC | should set LS3R', () => {
      const emu = create();
      emu.processData(encode('\x1b|'));
      expect(emu.getCurrentCharacterSet()).toBe(3);
    });
  });

  describe('ISO 646 variant selection', () => {
    it('ESC % N should select Norwegian variant', () => {
      const emu = create();
      emu.processData(encode('\x1b%N'));
      expect(emu.characterSetVariant).toBe(TDV2200ISO646Variant.Norwegian);
    });

    it('ESC % S should select Swedish variant', () => {
      const emu = create();
      emu.processData(encode('\x1b%S'));
      expect(emu.characterSetVariant).toBe(TDV2200ISO646Variant.Swedish);
    });

    it('ESC % G should select German variant', () => {
      const emu = create();
      emu.processData(encode('\x1b%G'));
      expect(emu.characterSetVariant).toBe(TDV2200ISO646Variant.German);
    });

    it('ESC % I should select International variant', () => {
      const emu = create();
      emu.processData(encode('\x1b%N')); // Set Norwegian first
      emu.processData(encode('\x1b%I')); // Back to International
      expect(emu.characterSetVariant).toBe(TDV2200ISO646Variant.International);
    });
  });

  describe('query/response', () => {
    it('should respond to primary DA', () => {
      const emu = create();
      const responses = collectResponses(emu);
      emu.processData(encode('\x1b[c'));
      expect(responses.length).toBe(1);
      expect(decodeResponse(responses[0])).toBe('\x1b[?1;2c');
    });

    it('should respond to secondary DA', () => {
      const emu = create();
      const responses = collectResponses(emu);
      emu.processData(encode('\x1b[>c'));
      expect(responses.length).toBe(1);
      expect(decodeResponse(responses[0])).toBe('\x1b[>115;0;0c');
    });

    it('should respond to ESC Z', () => {
      const emu = create();
      const responses = collectResponses(emu);
      emu.processData(encode('\x1bZ'));
      expect(decodeResponse(responses[0])).toBe('\x1b[?1;2c');
    });
  });

  describe('terminal type reporting', () => {
    it('should include mode suffixes in type string', () => {
      const emu = create();
      emu.processData(encode('\x1b[?1h')); // Extended
      expect(emu.getTerminalType()).toContain('[Extended]');
    });

    it('should include 2115 suffix when in compat mode', () => {
      const emu = create();
      emu.processData(encode('\x1b[?40h'));
      expect(emu.getTerminalType()).toContain('[2115]');
    });
  });

  describe('character set variants', () => {
    it('should list available variants', () => {
      const emu = create();
      const variants = emu.getAvailableCharacterSetVariants();
      expect(variants.length).toBe(4);
      expect(variants[0].description).toContain('International');
    });

    it('should return ISO 646 language code', () => {
      const emu = create();
      expect(emu.getISO646LanguageCode()).toBeNull(); // International
      emu.characterSetVariant = TDV2200ISO646Variant.Norwegian;
      expect(emu.getISO646LanguageCode()).toBe('no');
    });
  });

  describe('reset', () => {
    it('should reset all TDV2215 state', () => {
      const emu = create();
      emu.processData(encode('\x1b[?1h')); // Extended mode
      emu.processData(encode('\x1b[?40h')); // 2115 compat
      emu.processData(encode('\x1bN'));     // SS2
      emu.processData(encode('\x1bn'));     // LS2
      emu.reset();
      expect(emu.isExtendedMode).toBe(false);
      expect(emu.is2115CompatibilityMode).toBe(false);
      expect(emu.hasPendingSingleShift).toBe(false);
      expect(emu.lockedCharacterSet).toBe(0);
    });
  });
});
