/**
 * TDV2200 Configuration Validation Tests
 *
 * Validates mode settings including 2115 compatibility mode, extended control mode,
 * auto wrap mode, origin mode, cursor visibility, ISO 646 variant setting,
 * character set manager state, and scroll region persistence.
 */

import { describe, it, expect } from 'vitest';
import { TDV2200Emulator } from '../../../src/emulators/tdv/TDV2200Emulator';
import { TDV2200ISO646Variant } from '../../../src/emulators/tdv/TDV2200ISO646Variant';
import { encode } from '../../helpers/test-emulator';
import { assertCursorAt } from '../../helpers/buffer-assertions';
import * as seq from '../../helpers/test-sequences';

describe('TDV2200 Configuration Validation', () => {
  function create(cols = 80, rows = 24): TDV2200Emulator {
    return new TDV2200Emulator(cols, rows);
  }

  describe('2115 compatibility mode', () => {
    it('should be off by default', () => {
      const emu = create();
      expect(emu.is2115CompatibilityMode).toBe(false);
    });

    it('should enable with CSI ? 40 h', () => {
      const emu = create();
      emu.processData(encode('\x1b[?40h'));
      expect(emu.is2115CompatibilityMode).toBe(true);
    });

    it('should disable with CSI ? 40 l', () => {
      const emu = create();
      emu.processData(encode('\x1b[?40h'));
      expect(emu.is2115CompatibilityMode).toBe(true);
      emu.processData(encode('\x1b[?40l'));
      expect(emu.is2115CompatibilityMode).toBe(false);
    });

    it('should toggle on and off repeatedly', () => {
      const emu = create();
      emu.processData(encode('\x1b[?40h'));
      expect(emu.is2115CompatibilityMode).toBe(true);
      emu.processData(encode('\x1b[?40l'));
      expect(emu.is2115CompatibilityMode).toBe(false);
      emu.processData(encode('\x1b[?40h'));
      expect(emu.is2115CompatibilityMode).toBe(true);
    });

    it('ESC Q should exit 2115 compatibility mode', () => {
      const emu = create();
      emu.processData(encode('\x1b[?40h'));
      emu.processData(encode('\x1bQ'));
      expect(emu.is2115CompatibilityMode).toBe(false);
    });
  });

  describe('extended control mode', () => {
    it('smooth scroll mode should be off by default', () => {
      const emu = create();
      expect(emu.smoothScrollMode).toBe(false);
    });

    it('CSI ? 67 h should enable smooth scroll mode', () => {
      const emu = create();
      emu.processData(encode('\x1b[?67h'));
      expect(emu.smoothScrollMode).toBe(true);
    });

    it('CSI ? 67 l should disable smooth scroll mode', () => {
      const emu = create();
      emu.processData(encode('\x1b[?67h'));
      emu.processData(encode('\x1b[?67l'));
      expect(emu.smoothScrollMode).toBe(false);
    });

    it('blink mode should be off by default', () => {
      const emu = create();
      expect(emu.blinkMode).toBe(false);
    });

    it('CSI ? 68 h should enable blink mode', () => {
      const emu = create();
      emu.processData(encode('\x1b[?68h'));
      expect(emu.blinkMode).toBe(true);
    });
  });

  describe('auto wrap mode (DECAWM)', () => {
    it('should be enabled by default', () => {
      const emu = create();
      expect(emu.autoWrapMode).toBe(true);
    });

    it('CSI ? 7 l should disable auto wrap', () => {
      const emu = create();
      emu.processData(encode(seq.decrst(7)));
      expect(emu.autoWrapMode).toBe(false);
    });

    it('CSI ? 7 h should re-enable auto wrap', () => {
      const emu = create();
      emu.processData(encode(seq.decrst(7)));
      emu.processData(encode(seq.decset(7)));
      expect(emu.autoWrapMode).toBe(true);
    });
  });

  describe('origin mode (DECOM)', () => {
    it('should be off by default', () => {
      const emu = create();
      expect(emu.originMode).toBe(false);
    });

    it('CSI ? 6 h should enable origin mode and home cursor', () => {
      const emu = create();
      emu.processData(encode(seq.cup(10, 20))); // Move away from home
      emu.processData(encode(seq.decset(6)));
      expect(emu.originMode).toBe(true);
      assertCursorAt(emu, 0, 0);
    });

    it('CSI ? 6 l should disable origin mode and home cursor', () => {
      const emu = create();
      emu.processData(encode(seq.decset(6)));
      emu.processData(encode(seq.cup(5, 10)));
      emu.processData(encode(seq.decrst(6)));
      expect(emu.originMode).toBe(false);
      assertCursorAt(emu, 0, 0);
    });
  });

  describe('cursor visibility (DECTCEM)', () => {
    it('cursor should be visible by default', () => {
      const emu = create();
      expect(emu.cursor.visible).toBe(true);
    });

    it('CSI ? 25 l should hide cursor', () => {
      const emu = create();
      emu.processData(encode(seq.decrst(25)));
      expect(emu.cursor.visible).toBe(false);
    });

    it('CSI ? 25 h should show cursor', () => {
      const emu = create();
      emu.processData(encode(seq.decrst(25)));
      emu.processData(encode(seq.decset(25)));
      expect(emu.cursor.visible).toBe(true);
    });
  });

  describe('ISO 646 variant setting', () => {
    it('should default to International', () => {
      const emu = create();
      expect(emu.currentISO646Variant).toBe(TDV2200ISO646Variant.International);
    });

    it('ESC % N should select Norwegian', () => {
      const emu = create();
      emu.processData(encode('\x1b%N'));
      expect(emu.currentISO646Variant).toBe(TDV2200ISO646Variant.Norwegian);
    });

    it('ESC % S should select Swedish', () => {
      const emu = create();
      emu.processData(encode('\x1b%S'));
      expect(emu.currentISO646Variant).toBe(TDV2200ISO646Variant.Swedish);
    });

    it('ESC % G should select German', () => {
      const emu = create();
      emu.processData(encode('\x1b%G'));
      expect(emu.currentISO646Variant).toBe(TDV2200ISO646Variant.German);
    });

    it('ESC % I should select International', () => {
      const emu = create();
      emu.processData(encode('\x1b%N')); // Switch to Norwegian first
      emu.processData(encode('\x1b%I'));
      expect(emu.currentISO646Variant).toBe(TDV2200ISO646Variant.International);
    });

    it('programmatic variant set should work', () => {
      const emu = create();
      emu.characterSetVariant = TDV2200ISO646Variant.German;
      expect(emu.characterSetVariant).toBe(TDV2200ISO646Variant.German);
    });
  });

  describe('character set manager state', () => {
    it('G0 should default to USASCII', () => {
      const emu = create();
      expect(emu.getCurrentCharacterSet()).toBe(0); // G0 invoked
    });

    it('LS2 (ESC n) should invoke G2', () => {
      const emu = create();
      emu.processData(encode('\x1bn'));
      expect(emu.getCurrentCharacterSet()).toBe(2);
    });

    it('LS3 (ESC o) should invoke G3', () => {
      const emu = create();
      emu.processData(encode('\x1bo'));
      expect(emu.getCurrentCharacterSet()).toBe(3);
    });

    it('SI (0x0F) should revert to G0', () => {
      const emu = create();
      emu.processData(encode('\x1bn')); // LS2 -> G2
      emu.processData(new Uint8Array([0x0F])); // SI -> G0
      expect(emu.getCurrentCharacterSet()).toBe(0);
    });

    it('SS2 should not persist after single character', () => {
      const emu = create();
      emu.processData(encode('\x1bN')); // SS2
      expect(emu.characterSetManager.isSS2Active).toBe(true);
      emu.processData(encode('X'));
      expect(emu.characterSetManager.isSS2Active).toBe(false);
    });
  });

  describe('scroll region persistence', () => {
    it('should default to full screen scroll region', () => {
      const emu = create();
      expect(emu.scrollTop).toBe(0);
      expect(emu.scrollBottom).toBe(23);
    });

    it('DECSTBM should set scroll region', () => {
      const emu = create();
      emu.processData(encode(seq.decstbm(5, 20)));
      expect(emu.scrollTop).toBe(4);
      expect(emu.scrollBottom).toBe(19);
    });

    it('DECSTBM 0;0 should reset scroll region to full screen', () => {
      const emu = create();
      emu.processData(encode(seq.decstbm(5, 20)));
      emu.processData(encode('\x1b[r')); // Reset (no params)
      expect(emu.scrollTop).toBe(0);
      expect(emu.scrollBottom).toBe(23);
    });

    it('scroll region should persist across cursor movements', () => {
      const emu = create();
      emu.processData(encode(seq.decstbm(3, 18)));
      emu.processData(encode(seq.cup(1, 1)));
      emu.processData(encode(seq.cup(24, 80)));
      // Scroll region should not change
      expect(emu.scrollTop).toBe(2);
      expect(emu.scrollBottom).toBe(17);
    });
  });
});
