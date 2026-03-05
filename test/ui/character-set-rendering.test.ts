/**
 * UI tests for character set switching and rendering.
 * Verifies DEC Special Graphics, G0/G1 switching, TDV character sets,
 * locking/single shifts, and ISO 646 variants render correctly in the buffer.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Terminal } from '../../src/terminal/Terminal';

describe('Character Set Rendering', () => {
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

  function createVT100(): Terminal {
    const t = new Terminal({ rows: 24, cols: 80 });
    t.open(container);
    return t;
  }

  function createTDV2200(): Terminal {
    const t = new Terminal({ rows: 24, cols: 80, emulatorType: 'tdv2200' });
    t.open(container);
    return t;
  }

  describe('VT100 DEC Special Graphics (ESC(0)', () => {
    it('should map line drawing corner characters', () => {
      term = createVT100();
      term.write('\x1b(0lqk');
      const buf = term.getEmulator().buffer;
      expect(buf.getCell(0, 0).codepoint).toBe(0x250C); // l -> ┌
      expect(buf.getCell(0, 1).codepoint).toBe(0x2500); // q -> ─
      expect(buf.getCell(0, 2).codepoint).toBe(0x2510); // k -> ┐
    });

    it('should render a complete box', () => {
      term = createVT100();
      term.write('\x1b(0lqqqk\r\nx   x\r\nmqqqj');
      const buf = term.getEmulator().buffer;
      // Top: ┌───┐
      expect(buf.getCell(0, 0).codepoint).toBe(0x250C);
      expect(buf.getCell(0, 1).codepoint).toBe(0x2500);
      expect(buf.getCell(0, 4).codepoint).toBe(0x2510);
      // Sides: │   │
      expect(buf.getCell(1, 0).codepoint).toBe(0x2502);
      expect(buf.getCell(1, 4).codepoint).toBe(0x2502);
      // Bottom: └───┘
      expect(buf.getCell(2, 0).codepoint).toBe(0x2514);
      expect(buf.getCell(2, 4).codepoint).toBe(0x2518);
    });

    it('should map all 11 standard line drawing characters', () => {
      term = createVT100();
      // j k l m n q t u v w x
      term.write('\x1b(0jklmnqtuvwx');
      const buf = term.getEmulator().buffer;
      const expected = [
        0x2518, // j -> ┘
        0x2510, // k -> ┐
        0x250C, // l -> ┌
        0x2514, // m -> └
        0x253C, // n -> ┼
        0x2500, // q -> ─
        0x251C, // t -> ├
        0x2524, // u -> ┤
        0x2534, // v -> ┴
        0x252C, // w -> ┬
        0x2502, // x -> │
      ];
      for (let i = 0; i < expected.length; i++) {
        expect(buf.getCell(0, i).codepoint).toBe(expected[i]);
      }
    });

    it('should map extra special graphics characters', () => {
      term = createVT100();
      term.write('\x1b(0afgy');
      const buf = term.getEmulator().buffer;
      expect(buf.getCell(0, 0).codepoint).toBe(0x2592); // a -> ▒
      expect(buf.getCell(0, 1).codepoint).toBe(0x00B0); // f -> °
      expect(buf.getCell(0, 2).codepoint).toBe(0x00B1); // g -> ±
      expect(buf.getCell(0, 3).codepoint).toBe(0x2264); // y -> ≤
    });

    it('should not affect uppercase ASCII characters', () => {
      term = createVT100();
      term.write('\x1b(0ABC');
      const buf = term.getEmulator().buffer;
      expect(buf.getCell(0, 0).codepoint).toBe(0x41); // A unchanged
      expect(buf.getCell(0, 1).codepoint).toBe(0x42); // B unchanged
      expect(buf.getCell(0, 2).codepoint).toBe(0x43); // C unchanged
    });

    it('should reset to ASCII with ESC(B', () => {
      term = createVT100();
      term.write('\x1b(0lqk\x1b(Blqk');
      const buf = term.getEmulator().buffer;
      // First set: mapped
      expect(buf.getCell(0, 0).codepoint).toBe(0x250C); // ┌
      expect(buf.getCell(0, 1).codepoint).toBe(0x2500); // ─
      expect(buf.getCell(0, 2).codepoint).toBe(0x2510); // ┐
      // Second set: plain ASCII
      expect(buf.getCell(0, 3).codepoint).toBe(0x6C); // l
      expect(buf.getCell(0, 4).codepoint).toBe(0x71); // q
      expect(buf.getCell(0, 5).codepoint).toBe(0x6B); // k
    });
  });

  describe('G0/G1 switching with SO/SI', () => {
    it('SO should switch to G1 for character rendering', () => {
      term = createVT100();
      // Designate DEC Special Graphics to G1 (ESC)0), then SO
      term.write('\x1b)0\x0Elqk');
      const buf = term.getEmulator().buffer;
      expect(buf.getCell(0, 0).codepoint).toBe(0x250C); // l -> ┌
      expect(buf.getCell(0, 1).codepoint).toBe(0x2500); // q -> ─
      expect(buf.getCell(0, 2).codepoint).toBe(0x2510); // k -> ┐
    });

    it('SI should switch back to G0', () => {
      term = createVT100();
      term.write('\x1b)0\x0Elqk\x0Flqk');
      const buf = term.getEmulator().buffer;
      // After SO: mapped
      expect(buf.getCell(0, 0).codepoint).toBe(0x250C);
      // After SI: plain ASCII
      expect(buf.getCell(0, 3).codepoint).toBe(0x6C); // l
      expect(buf.getCell(0, 4).codepoint).toBe(0x71); // q
    });

    it('SO/SI round-trip should toggle rendering', () => {
      term = createVT100();
      term.write('\x1b)0\x0El\x0Fl');
      const buf = term.getEmulator().buffer;
      expect(buf.getCell(0, 0).codepoint).toBe(0x250C); // mapped ┌
      expect(buf.getCell(0, 1).codepoint).toBe(0x6C);   // plain l
    });
  });

  describe('TDV character sets — fontNumber verification', () => {
    it('SS2 should set fontNumber to 2', () => {
      term = createTDV2200();
      term.write('\x1bNA');
      const buf = term.getEmulator().buffer;
      expect(buf.getCellRef(0, 0).fontNumber).toBe(2);
    });

    it('SS3 should set fontNumber to 3', () => {
      term = createTDV2200();
      term.write('\x1bOA');
      const buf = term.getEmulator().buffer;
      expect(buf.getCellRef(0, 0).fontNumber).toBe(3);
    });

    it('SS2 should only affect one character', () => {
      term = createTDV2200();
      term.write('\x1bNAB');
      const buf = term.getEmulator().buffer;
      expect(buf.getCellRef(0, 0).fontNumber).toBe(2);
      expect(buf.getCellRef(0, 1).fontNumber).toBe(0);
    });

    it('SS3 should only affect one character', () => {
      term = createTDV2200();
      term.write('\x1bOXY');
      const buf = term.getEmulator().buffer;
      expect(buf.getCellRef(0, 0).fontNumber).toBe(3);
      expect(buf.getCellRef(0, 1).fontNumber).toBe(0);
    });
  });

  describe('TDV locking shifts', () => {
    it('LS2 (ESC n) should set fontNumber 2 for all subsequent', () => {
      term = createTDV2200();
      term.write('\x1bnABC');
      const buf = term.getEmulator().buffer;
      expect(buf.getCellRef(0, 0).fontNumber).toBe(2);
      expect(buf.getCellRef(0, 1).fontNumber).toBe(2);
      expect(buf.getCellRef(0, 2).fontNumber).toBe(2);
    });

    it('LS3 (ESC o) should set fontNumber 3 for all subsequent', () => {
      term = createTDV2200();
      term.write('\x1boXYZ');
      const buf = term.getEmulator().buffer;
      expect(buf.getCellRef(0, 0).fontNumber).toBe(3);
      expect(buf.getCellRef(0, 1).fontNumber).toBe(3);
      expect(buf.getCellRef(0, 2).fontNumber).toBe(3);
    });

    it('SI after LS2 should reset to fontNumber 0', () => {
      term = createTDV2200();
      term.write('\x1bnA\x0FB');
      const buf = term.getEmulator().buffer;
      expect(buf.getCellRef(0, 0).fontNumber).toBe(2);
      expect(buf.getCellRef(0, 1).fontNumber).toBe(0);
    });

    it('SI after LS3 should reset to fontNumber 0', () => {
      term = createTDV2200();
      term.write('\x1boX\x0FY');
      const buf = term.getEmulator().buffer;
      expect(buf.getCellRef(0, 0).fontNumber).toBe(3);
      expect(buf.getCellRef(0, 1).fontNumber).toBe(0);
    });

    it('alternating LS2 and SI should toggle fontNumber', () => {
      term = createTDV2200();
      term.write('\x1bnA\x0FB\x1bnC\x0FD');
      const buf = term.getEmulator().buffer;
      expect(buf.getCellRef(0, 0).fontNumber).toBe(2); // A
      expect(buf.getCellRef(0, 1).fontNumber).toBe(0); // B
      expect(buf.getCellRef(0, 2).fontNumber).toBe(2); // C
      expect(buf.getCellRef(0, 3).fontNumber).toBe(0); // D
    });
  });

  describe('G0/G1/G2/G3 designation', () => {
    it('ESC(B should designate US ASCII to G0', () => {
      term = createVT100();
      term.write('\x1b(BABC');
      const buf = term.getEmulator().buffer;
      expect(buf.getCell(0, 0).codepoint).toBe(0x41); // A unchanged
    });

    it('ESC(0 should designate DEC Special Graphics to G0', () => {
      term = createVT100();
      term.write('\x1b(0q');
      const buf = term.getEmulator().buffer;
      expect(buf.getCell(0, 0).codepoint).toBe(0x2500); // ─
    });

    it('ESC)0 should designate DEC Special Graphics to G1', () => {
      term = createVT100();
      term.write('\x1b)0\x0Eq');
      const buf = term.getEmulator().buffer;
      expect(buf.getCell(0, 0).codepoint).toBe(0x2500); // ─
    });
  });

  describe('character sets after reset', () => {
    it('RIS should reset character sets to default', () => {
      term = createVT100();
      term.write('\x1b(0lqk');
      // Verify DEC Special Graphics active
      expect(term.getEmulator().buffer.getCell(0, 0).codepoint).toBe(0x250C);
      // RIS
      term.write('\x1bc');
      term.write('lqk');
      const buf = term.getEmulator().buffer;
      expect(buf.getCell(0, 0).codepoint).toBe(0x6C); // plain l
      expect(buf.getCell(0, 1).codepoint).toBe(0x71); // plain q
      expect(buf.getCell(0, 2).codepoint).toBe(0x6B); // plain k
    });

    it('TDV2200 RIS should reset locking shift', () => {
      term = createTDV2200();
      term.write('\x1bnA'); // LS2
      expect(term.getEmulator().buffer.getCellRef(0, 0).fontNumber).toBe(2);
      term.write('\x1bc'); // RIS
      term.write('B');
      expect(term.getEmulator().buffer.getCellRef(0, 0).fontNumber).toBe(0);
    });
  });

  describe('TDV ISO 646 variant switching', () => {
    it('should default to International variant', () => {
      term = createTDV2200();
      const emu = term.getEmulator() as any;
      expect(emu.currentISO646Variant).toBe(0); // International
    });
  });
});
