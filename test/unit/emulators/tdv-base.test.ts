import { describe, it, expect } from 'vitest';
import { TDV2215Emulator } from '../../../src/emulators/tdv/TDV2215Emulator';
import { TDV2200Emulator } from '../../../src/emulators/tdv/TDV2200Emulator';
import { encode, getRowTextTrimmed, collectResponses, decodeResponse } from '../../helpers/test-emulator';
import { TDVMessageLEDType } from '../../../src/emulators/tdv/components/TDVMessageLEDs';
import { TDVCharacterSetType } from '../../../src/emulators/tdv/components/TDVCharacterSets';

describe('TDVEmulatorBase (via TDV2215Emulator)', () => {
  function create(cols = 80, rows = 24): TDV2215Emulator {
    return new TDV2215Emulator(cols, rows);
  }

  describe('basic TDV features', () => {
    it('should write text to buffer', () => {
      const emu = create();
      emu.processData(encode('Hello'));
      expect(getRowTextTrimmed(emu.buffer, 0)).toBe('Hello');
    });

    it('should have composition components initialized', () => {
      const emu = create();
      expect(emu.protectedAreas).toBeDefined();
      expect(emu.workAreas).toBeDefined();
      expect(emu.messageLEDs).toBeDefined();
      expect(emu.rectangleOperations).toBeDefined();
      expect(emu.pushKeys).toBeDefined();
    });

    it('should set and get message LED states', () => {
      const emu = create();
      emu.setMessageLED(TDVMessageLEDType.Clear, true);
      expect(emu.messageLEDState.clear).toBe(true);
      expect(emu.messageLEDState.set).toBe(false);
    });

    it('should program and execute PUSH keys', () => {
      const emu = create();
      emu.programPushKey(1, 'HELLO');
      emu.executePushKey(1);
      expect(getRowTextTrimmed(emu.buffer, 0)).toBe('HELLO');
    });
  });

  describe('ND-specific CSI sequences', () => {
    it('should handle NDSAR (set attribute in rectangle)', () => {
      const emu = create();
      // Write some text
      emu.processData(encode('ABCDEFGHIJ'));
      // ESC[attr;x1;y1;x2;y2z — Set bold in cols 0-4, row 0
      emu.processData(encode('\x1b[1;0;0;4;0z'));
      for (let col = 0; col <= 4; col++) {
        expect(emu.buffer.getCellRef(0, col).attributes & 1).toBe(1); // Bold
      }
    });

    it('should handle NDDWA (define work area)', () => {
      const emu = create();
      emu.processData(encode('\x1b[5;3;40;20~'));
      const wa = emu.currentWorkArea;
      expect(wa.left).toBe(5);
      expect(wa.top).toBe(3);
      expect(wa.right).toBe(40);
      expect(wa.bottom).toBe(20);
    });

    it('should clear work area with no params', () => {
      const emu = create();
      emu.processData(encode('\x1b[5;3;40;20~'));
      emu.processData(encode('\x1b[~')); // No params = clear
      const wa = emu.currentWorkArea;
      expect(wa.left).toBe(0);
      expect(wa.top).toBe(0);
    });

    it('should handle NDSREC (save rectangle) and NDRREC (restore)', () => {
      const emu = create();
      emu.processData(encode('ABCDE'));
      // Save cols 0-4, row 0: x1=0, y1=0, x2=4, y2=0
      emu.processData(encode('\x1b[0;0;4;0u'));
      // Overwrite
      emu.processData(encode('\x1b[HXXXXX'));
      // Restore at position (0, 0)
      emu.processData(encode('\x1b[0;0v'));
      expect(getRowTextTrimmed(emu.buffer, 0).substring(0, 5)).toBe('ABCDE');
    });
  });

  describe('ND private modes', () => {
    it('should handle smooth scroll mode (67)', () => {
      const emu = create();
      emu.processData(encode('\x1b[?67h'));
      expect(emu.smoothScrollMode).toBe(true);
      emu.processData(encode('\x1b[?67l'));
      expect(emu.smoothScrollMode).toBe(false);
    });

    it('should handle blink mode (68)', () => {
      const emu = create();
      emu.processData(encode('\x1b[?68h'));
      expect(emu.blinkMode).toBe(true);
    });

    it('should handle enhanced blink mode (69)', () => {
      const emu = create();
      emu.processData(encode('\x1b[?69h'));
      expect(emu.enhancedBlinkMode).toBe(true);
    });
  });

  describe('character set designation', () => {
    it('should designate character set to G0', () => {
      const emu = create();
      emu.setCharacterSet(0, TDVCharacterSetType.GraphicsI);
      expect(emu.getG0CharacterSet()).toBe(TDVCharacterSetType.GraphicsI);
    });

    it('should invoke locking shifts', () => {
      const emu = create();
      emu.invokeCharacterSet(2);
      expect(emu.getCurrentCharacterSet()).toBe(2);
    });

    it('should get active character set type', () => {
      const emu = create();
      expect(emu.getActiveCharacterSetType()).toBe(TDVCharacterSetType.USASCII);
      emu.invokeCharacterSet(2);
      expect(emu.getActiveCharacterSetType()).toBe(TDVCharacterSetType.GraphicsI);
    });
  });

  describe('double width/height', () => {
    it('should set double height top with ESC # 3', () => {
      const emu = create();
      emu.processData(encode('Hello'));
      emu.processData(encode('\x1b#3'));
      const cell = emu.buffer.getCellRef(0, 0);
      expect(cell.doubleWidth).toBe(true);
      expect(cell.doubleHeight).toBe(true);
    });

    it('should set double width with ESC # 6', () => {
      const emu = create();
      emu.processData(encode('Hello'));
      emu.processData(encode('\x1b#6'));
      const cell = emu.buffer.getCellRef(0, 0);
      expect(cell.doubleWidth).toBe(true);
    });

    it('should revert to single size with ESC # 5', () => {
      const emu = create();
      emu.processData(encode('Hello'));
      emu.processData(encode('\x1b#6')); // Double width
      emu.processData(encode('\x1b#5')); // Single size
      const cell = emu.buffer.getCellRef(0, 0);
      expect(cell.doubleWidth).toBe(false);
      expect(cell.doubleHeight).toBe(false);
    });
  });

  describe('query/response', () => {
    it('should respond to ESC Z (terminal identification)', () => {
      const emu = create();
      const responses = collectResponses(emu);
      emu.processData(encode('\x1bZ'));
      expect(responses.length).toBe(1);
      expect(decodeResponse(responses[0])).toBe('\x1b[?1;2c');
    });

    it('should respond to cursor position report', () => {
      const emu = create();
      const responses = collectResponses(emu);
      emu.processData(encode('\x1b[3;5H')); // Move to row 3, col 5
      emu.processData(encode('\x1b[6n'));    // CPR
      expect(responses.length).toBe(1);
      expect(decodeResponse(responses[0])).toBe('\x1b[3;5R');
    });

    it('should respond to device status report', () => {
      const emu = create();
      const responses = collectResponses(emu);
      emu.processData(encode('\x1b[5n'));
      expect(responses.length).toBe(1);
      expect(decodeResponse(responses[0])).toBe('\x1b[0n');
    });

    it('should respond to mode query (DECRQM)', () => {
      const emu = create();
      emu.processData(encode('\x1b[?67h')); // Enable smooth scroll
      const responses = collectResponses(emu);
      emu.processData(encode('\x1b[?67$p'));
      expect(responses.length).toBe(1);
      expect(decodeResponse(responses[0])).toBe('\x1b[?67;1$y');
    });
  });

  describe('helper methods', () => {
    it('eraseCurrentLine should clear to end of line', () => {
      const emu = create();
      emu.processData(encode('Hello World'));
      emu.cursor.column = 5;
      emu.eraseCurrentLine();
      expect(getRowTextTrimmed(emu.buffer, 0)).toBe('Hello');
    });

    it('erasePage should clear entire buffer', () => {
      const emu = create();
      emu.processData(encode('Hello'));
      emu.erasePage();
      expect(getRowTextTrimmed(emu.buffer, 0)).toBe('');
    });

    it('cursorHome should move to 0,0', () => {
      const emu = create();
      emu.cursor.moveTo(10, 20);
      emu.cursorHome();
      expect(emu.cursor.row).toBe(0);
      expect(emu.cursor.column).toBe(0);
    });
  });
});
