/**
 * TDV keyboard mapper using TDV2200KeyRegistry as single source of truth.
 * Handles Extended Control Mode (CSI nn _ sequences), Simple ASCII Mode (C0 codes),
 * and Numeric Pad Function Mode.
 *
 * Resolution order:
 * 1. Alt key bindings (Alt+H → HELP, etc.)
 * 2. TDV2115 mode C0 codes for fixed keys
 * 3. Registry lookup (fixed keys=C0, function/editing=CSI nn _)
 * 4. Backspace (PC-only key, sends BS=0x08)
 * 5. No fallback — keys without TDV equivalents return null
 */

import type { IKeyboardMapper } from './KeyboardMapper';
import { KeyModifiers, TerminalModes } from './KeyboardMapper';
import { TDV2200KeyRegistry } from './TDV2200KeyRegistry';

export class TDVKeyboardMapper implements IKeyboardMapper {
  /** Whether Extended Control Mode is active (CSI sequences vs C0 codes) */
  extendedControlMode: boolean = true;

  /** Whether Numeric Pad Function Mode is active */
  numericPadFuncMode: boolean = false;

  mapKey(keyCode: number, modifiers: KeyModifiers, terminalModes: TerminalModes): string | null {
    // 1. Alt key bindings (Alt+H → HELP, etc.)
    if (modifiers & KeyModifiers.Alt) {
      const shifted = !!(modifiers & KeyModifiers.Shift);
      const target = shifted
        ? TDV2200KeyRegistry.getDefaultAltShiftTarget(keyCode)
        : TDV2200KeyRegistry.getDefaultAltTarget(keyCode);
      if (target) {
        const key = TDV2200KeyRegistry.getKey(target);
        if (key && key.isProgrammable) {
          // PUSH key — caller should handle programmed string lookup
          return null;
        }
        const seq = TDV2200KeyRegistry.getSequence(target, true, false, shifted, false);
        if (seq !== null) return seq;
      }
    }

    // 2. TDV2115 mode: C0 codes for fixed keys
    if (terminalModes & TerminalModes.TDV2115Mode) {
      if (modifiers === KeyModifiers.None) {
        switch (keyCode) {
          case 38: return '\x1c'; // Up
          case 40: return '\x0b'; // Down
          case 39: return '\x18'; // Right
          case 37: return '\x08'; // Left
          case 36: return '\x1d'; // Home
        }
      }
    }

    // 3. Registry lookup (Extended Control Mode)
    if (!(modifiers & KeyModifiers.Alt)) {
      const grid = TDV2200KeyRegistry.getGridForVK(keyCode);
      if (grid !== null) {
        const shift = !!(modifiers & KeyModifiers.Shift);
        const ctrl = !!(modifiers & KeyModifiers.Ctrl);
        const seq = TDV2200KeyRegistry.getSequence(grid, this.extendedControlMode, this.numericPadFuncMode, shift, ctrl);
        if (seq !== null) return seq;
      }
    }

    // 4. Backspace fallback (PC-only key)
    if (keyCode === 8) return '\x08';

    // 5. No fallback
    return null;
  }
}
