/**
 * UI tests for TDV-specific rendering features.
 * Verifies 2115 mode, double-width/height lines, rectangle operations,
 * LED sequences, query/response, and TDV pipeline integration.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Terminal } from '../../src/terminal/Terminal';
import { CharacterAttributes, hasAttribute } from '../../src/buffer/CharacterAttributes';

describe('TDV-Specific Rendering', () => {
  let container: HTMLElement;
  let term: Terminal;

  beforeEach(() => {
    container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '400px';
    document.body.appendChild(container);
  });

  afterEach(() => {
    term.dispose();
    document.body.innerHTML = '';
  });

  function emu(): any { return term.getEmulator(); }
  function buf() { return emu().buffer; }
  function cursor() { return emu().cursor; }
  function rowText(row: number): string {
    let text = '';
    for (let col = 0; col < 80; col++) text += buf().getCell(row, col).getString();
    return text.trimEnd();
  }

  describe('2115 compatibility mode rendering', () => {
    it('should enable 2115 mode via ESC[?40h', () => {
      term = new Terminal({ rows: 24, cols: 80, emulatorType: 'tdv2200' });
      term.open(container);
      term.write('\x1b[?40h');
      expect(emu().is2115CompatibilityMode).toBe(true);
    });

    it('STX (0x02) should turn video off in 2115 mode', () => {
      term = new Terminal({ rows: 24, cols: 80, emulatorType: 'tdv2200' });
      term.open(container);
      term.write('\x1b[?40h');
      term.write(new Uint8Array([0x02]));
      expect(emu().videoOn).toBe(false);
    });

    it('ETX (0x03) should turn video on in 2115 mode', () => {
      term = new Terminal({ rows: 24, cols: 80, emulatorType: 'tdv2200' });
      term.open(container);
      term.write('\x1b[?40h');
      term.write(new Uint8Array([0x02])); // off
      term.write(new Uint8Array([0x03])); // on
      expect(emu().videoOn).toBe(true);
    });

    it('EOT (0x04) should erase line in 2115 mode', () => {
      term = new Terminal({ rows: 24, cols: 80, emulatorType: 'tdv2200' });
      term.open(container);
      term.write('Hello');
      term.write('\x1b[?40h');
      term.write(new Uint8Array([0x04]));
      // EOT erases from cursor to end of line
      const cp = buf().getCell(0, cursor().column).codepoint;
      expect(cp === 0 || cp === 0x20).toBe(true);
    });

    it('EM (0x19) should erase page in 2115 mode', () => {
      term = new Terminal({ rows: 24, cols: 80, emulatorType: 'tdv2200' });
      term.open(container);
      term.write('Content');
      term.write('\x1b[?40h');
      term.write(new Uint8Array([0x19]));
      expect(rowText(0)).toBe('');
    });

    it('BS (0x08) should move cursor left in 2115 mode', () => {
      term = new Terminal({ rows: 24, cols: 80, emulatorType: 'tdv2200' });
      term.open(container);
      term.write('\x1b[?40h');
      term.write('ABC');
      const colBefore = cursor().column;
      term.write(new Uint8Array([0x08]));
      expect(cursor().column).toBe(colBefore - 1);
    });

    it('ESC Q should disable 2115 mode', () => {
      term = new Terminal({ rows: 24, cols: 80, emulatorType: 'tdv2200' });
      term.open(container);
      term.write('\x1b[?40h');
      expect(emu().is2115CompatibilityMode).toBe(true);
      term.write('\x1bQ');
      expect(emu().is2115CompatibilityMode).toBe(false);
    });
  });

  describe('Double-width/height lines', () => {
    it('ESC#6 should set double-width', () => {
      term = new Terminal({ rows: 24, cols: 80, emulatorType: 'tdv2200' });
      term.open(container);
      term.write('Hello');
      term.write('\x1b#6');
      expect(buf().getCellRef(0, 0).doubleWidth).toBe(true);
      expect(hasAttribute(buf().getCell(0, 0).attributes, CharacterAttributes.DoubleWidth)).toBe(true);
    });

    it('ESC#3 should set double-height top', () => {
      term = new Terminal({ rows: 24, cols: 80, emulatorType: 'tdv2200' });
      term.open(container);
      term.write('Hello');
      term.write('\x1b#3');
      expect(buf().getCellRef(0, 0).doubleHeight).toBe(true);
      expect(hasAttribute(buf().getCell(0, 0).attributes, CharacterAttributes.DoubleHeightTop)).toBe(true);
    });

    it('ESC#4 should set double-height bottom', () => {
      term = new Terminal({ rows: 24, cols: 80, emulatorType: 'tdv2200' });
      term.open(container);
      term.write('Hello');
      term.write('\x1b#4');
      expect(hasAttribute(buf().getCell(0, 0).attributes, CharacterAttributes.DoubleHeightBottom)).toBe(true);
    });

    it('ESC#5 should reset to single-size', () => {
      term = new Terminal({ rows: 24, cols: 80, emulatorType: 'tdv2200' });
      term.open(container);
      term.write('Hello\x1b#6'); // Set double-width
      expect(buf().getCellRef(0, 0).doubleWidth).toBe(true);
      term.write('\x1b#5'); // Reset to single
      expect(buf().getCellRef(0, 0).doubleWidth).toBe(false);
      expect(buf().getCellRef(0, 0).doubleHeight).toBe(false);
    });
  });

  describe('Rectangle operations rendering', () => {
    it('NDSAR should set attribute in rectangle', () => {
      term = new Terminal({ rows: 24, cols: 80, emulatorType: 'tdv2200' });
      term.open(container);
      // Fill some content
      term.write('\x1b[1;1HABCDEFGHIJ');
      // NDSAR: ESC[attr;x1;y1;x2;y2 z — set bold in rectangle
      // x1=2,y1=0,x2=6,y2=0 → cols 2-6, row 0 (0-based)
      term.write('\x1b[1;2;0;6;0z');
      // Cells in cols 2-6 (0-based) on row 0 should be bold
      expect(hasAttribute(buf().getCell(0, 2).attributes, CharacterAttributes.Bold)).toBe(true);
      expect(hasAttribute(buf().getCell(0, 6).attributes, CharacterAttributes.Bold)).toBe(true);
    });
  });

  describe('Message LED API', () => {
    it('setMessageLED should update LED state', () => {
      term = new Terminal({ rows: 24, cols: 80, emulatorType: 'tdv2200' });
      term.open(container);
      // LED control via emulator API (LED sequences are DCS-based)
      emu().setMessageLED(1, true); // Set the "Set" LED
      const states = emu().messageLEDs.getLEDStates();
      expect(states.set).toBe(true);
    });

    it('setMessageLED clear should reset LED state', () => {
      term = new Terminal({ rows: 24, cols: 80, emulatorType: 'tdv2200' });
      term.open(container);
      emu().setMessageLED(1, true); // Set the "Set" LED
      emu().setMessageLED(1, false); // Clear the "Set" LED
      const states = emu().messageLEDs.getLEDStates();
      expect(states.set).toBe(false);
    });
  });

  describe('TDV query/response via Terminal', () => {
    it('Primary DA should produce response', () => {
      term = new Terminal({ rows: 24, cols: 80, emulatorType: 'tdv2200' });
      term.open(container);
      const responses: string[] = [];
      emu().onResponseReady.on((r: string) => responses.push(r));
      term.write('\x1b[c');
      expect(responses.length).toBeGreaterThan(0);
      expect(responses[0]).toContain('\x1b[?');
    });

    it('DSR should respond with OK status', () => {
      term = new Terminal({ rows: 24, cols: 80, emulatorType: 'tdv2200' });
      term.open(container);
      const responses: string[] = [];
      emu().onResponseReady.on((r: string) => responses.push(r));
      term.write('\x1b[5n');
      expect(responses.length).toBe(1);
      expect(responses[0]).toBe('\x1b[0n');
    });
  });

  describe('TDV2215 specific', () => {
    it('should report correct terminal type', () => {
      term = new Terminal({ rows: 24, cols: 80, emulatorType: 'tdv2215' });
      term.open(container);
      expect(emu().getTerminalType()).toBe('TDV2215');
    });

    it('should handle text output', () => {
      term = new Terminal({ rows: 24, cols: 80, emulatorType: 'tdv2215' });
      term.open(container);
      term.write('Hello TDV2215');
      expect(rowText(0)).toBe('Hello TDV2215');
    });
  });

  describe('Full pipeline integration', () => {
    it('TDV2200 text + attributes + cursor positioning', () => {
      term = new Terminal({ rows: 24, cols: 80, emulatorType: 'tdv2200' });
      term.open(container);
      term.write('\x1b[5;10H\x1b[1mBold Text\x1b[0m Normal');
      expect(buf().getCell(4, 9).codepoint).toBe(0x42); // B
      expect(hasAttribute(buf().getCell(4, 9).attributes, CharacterAttributes.Bold)).toBe(true);
      expect(hasAttribute(buf().getCell(4, 19).attributes, CharacterAttributes.Bold)).toBe(false);
    });

    it('TDV2200 mixed sequences in single write', () => {
      term = new Terminal({ rows: 24, cols: 80, emulatorType: 'tdv2200' });
      term.open(container);
      term.write('Line1\r\n\x1b[1mBold\x1b[0m\r\n\x1b[5;1HRow5');
      expect(rowText(0)).toBe('Line1');
      expect(rowText(1)).toBe('Bold');
      expect(hasAttribute(buf().getCell(1, 0).attributes, CharacterAttributes.Bold)).toBe(true);
      expect(rowText(4)).toBe('Row5');
    });
  });
});
