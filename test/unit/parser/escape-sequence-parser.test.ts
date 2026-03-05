import { describe, it, expect, beforeEach } from 'vitest';
import { EscapeSequenceParser } from '../../../src/parser/EscapeSequenceParser';
import { ParserState } from '../../../src/parser/ParserState';
import { encode } from '../../helpers/test-emulator';

describe('EscapeSequenceParser', () => {
  let parser: EscapeSequenceParser;
  let characters: number[];
  let controls: number[];
  let csiSequences: { final: number; params: number[]; privateMarker: number }[];
  let escSequences: { final: number; intermediates: number[] }[];
  let oscData: Uint8Array[];

  beforeEach(() => {
    parser = new EscapeSequenceParser();
    characters = [];
    controls = [];
    csiSequences = [];
    escSequences = [];
    oscData = [];

    parser.onCharacter = (cp) => characters.push(cp);
    parser.onExecute = (ctrl) => controls.push(ctrl);
    parser.onCsiDispatch = (p) => {
      csiSequences.push({
        final: p.finalByte,
        params: p.getParams(),
        privateMarker: p.privateMarker,
      });
    };
    parser.onEscapeDispatch = (p) => {
      escSequences.push({
        final: p.finalByte,
        intermediates: p.getIntermediates(),
      });
    };
    parser.onOscDispatch = (data) => {
      oscData.push(new Uint8Array(data));
    };
  });

  describe('Ground state', () => {
    it('should dispatch printable ASCII as characters', () => {
      parser.processBytes(encode('Hello'));
      expect(characters).toEqual([72, 101, 108, 108, 111]);
    });

    it('should dispatch C0 controls via onExecute', () => {
      parser.processBytes(encode('\x07\x08\x0A\x0D'));
      expect(controls).toEqual([0x07, 0x08, 0x0A, 0x0D]);
    });

    it('should handle mixed text and controls', () => {
      parser.processBytes(encode('A\nB'));
      expect(characters).toEqual([65, 66]);
      expect(controls).toEqual([0x0A]);
    });

    it('should start in Ground state', () => {
      expect(parser.state).toBe(ParserState.Ground);
    });
  });

  describe('UTF-8 handling', () => {
    it('should decode 2-byte UTF-8 sequences', () => {
      // é = U+00E9 = 0xC3 0xA9
      parser.processBytes(new Uint8Array([0xC3, 0xA9]));
      expect(characters).toEqual([0x00E9]);
    });

    it('should decode 3-byte UTF-8 sequences', () => {
      // € = U+20AC = 0xE2 0x82 0xAC
      parser.processBytes(new Uint8Array([0xE2, 0x82, 0xAC]));
      expect(characters).toEqual([0x20AC]);
    });

    it('should decode 4-byte UTF-8 sequences', () => {
      // 𝕳 = U+1D573 = 0xF0 0x9D 0x95 0xB3
      parser.processBytes(new Uint8Array([0xF0, 0x9D, 0x95, 0xB3]));
      expect(characters).toEqual([0x1D573]);
    });

    it('should emit replacement character for invalid UTF-8', () => {
      parser.processBytes(new Uint8Array([0xFF]));
      expect(characters).toEqual([0xFFFD]);
    });

    it('should handle interrupted UTF-8 (ESC in middle)', () => {
      // Start a 2-byte sequence, then ESC
      parser.processBytes(new Uint8Array([0xC3, 0x1B, 0x5B, 0x41]));
      // UTF-8 is interrupted, ESC [ A = CSI CUU
      expect(csiSequences.length).toBe(1);
      expect(csiSequences[0].final).toBe(0x41);
    });

    it('should handle broken continuation byte', () => {
      // Start 2-byte sequence, then ASCII instead of continuation
      parser.processBytes(new Uint8Array([0xC3, 0x41]));
      // Should emit replacement char then process 'A'
      expect(characters).toEqual([0xFFFD, 0x41]);
    });
  });

  describe('CSI sequences', () => {
    it('should parse CSI with no parameters', () => {
      parser.processBytes(encode('\x1b[H'));
      expect(csiSequences.length).toBe(1);
      expect(csiSequences[0].final).toBe(0x48);
      expect(csiSequences[0].params).toEqual([]);
    });

    it('should parse CSI with one parameter', () => {
      parser.processBytes(encode('\x1b[5A'));
      expect(csiSequences[0].final).toBe(0x41);
      expect(csiSequences[0].params).toEqual([5]);
    });

    it('should parse CSI with multiple parameters', () => {
      parser.processBytes(encode('\x1b[10;20H'));
      expect(csiSequences[0].final).toBe(0x48);
      expect(csiSequences[0].params).toEqual([10, 20]);
    });

    it('should parse CSI with private marker ?', () => {
      parser.processBytes(encode('\x1b[?25h'));
      expect(csiSequences[0].final).toBe(0x68);
      expect(csiSequences[0].params).toEqual([25]);
      expect(csiSequences[0].privateMarker).toBe(0x3F);
    });

    it('should parse CSI with private marker >', () => {
      parser.processBytes(encode('\x1b[>c'));
      expect(csiSequences[0].final).toBe(0x63);
      expect(csiSequences[0].privateMarker).toBe(0x3E);
    });

    it('should parse SGR with multiple params', () => {
      parser.processBytes(encode('\x1b[1;31;42m'));
      expect(csiSequences[0].final).toBe(0x6D);
      expect(csiSequences[0].params).toEqual([1, 31, 42]);
    });

    it('should parse SGR with no params (reset)', () => {
      parser.processBytes(encode('\x1b[m'));
      expect(csiSequences[0].final).toBe(0x6D);
      expect(csiSequences[0].params).toEqual([]);
    });

    it('should parse multi-digit parameters', () => {
      parser.processBytes(encode('\x1b[256A'));
      expect(csiSequences[0].params).toEqual([256]);
    });

    it('should parse CSI with zero parameter', () => {
      parser.processBytes(encode('\x1b[0J'));
      expect(csiSequences[0].params).toEqual([0]);
    });

    it('should parse multiple CSI sequences', () => {
      parser.processBytes(encode('\x1b[1A\x1b[2B'));
      expect(csiSequences.length).toBe(2);
      expect(csiSequences[0].final).toBe(0x41);
      expect(csiSequences[1].final).toBe(0x42);
    });

    it('should handle CSI with intermediate bytes', () => {
      // CSI ? 67 $ p — DECRQM
      parser.processBytes(encode('\x1b[?67$p'));
      expect(csiSequences.length).toBe(1);
    });

    it('should handle C0 control inside CSI without breaking sequence', () => {
      // This is the C# behavior: C0 controls execute but don't exit CSI
      parser.processBytes(encode('\x1b[1\x07A'));
      expect(controls).toContain(0x07); // BEL was executed
      // The sequence should still complete
    });

    it('should handle empty parameters (;;)', () => {
      parser.processBytes(encode('\x1b[;H'));
      expect(csiSequences[0].params).toEqual([0, 0]);
    });
  });

  describe('ESC sequences', () => {
    it('should parse ESC with final byte', () => {
      parser.processBytes(encode('\x1b7'));
      expect(escSequences.length).toBe(1);
      expect(escSequences[0].final).toBe(0x37); // '7' = DECSC
    });

    it('should parse ESC D (Index)', () => {
      parser.processBytes(encode('\x1bD'));
      expect(escSequences[0].final).toBe(0x44);
    });

    it('should parse ESC M (Reverse Index)', () => {
      parser.processBytes(encode('\x1bM'));
      expect(escSequences[0].final).toBe(0x4D);
    });

    it('should parse ESC with intermediate bytes', () => {
      // ESC ( B = designate G0 as US ASCII
      parser.processBytes(encode('\x1b(B'));
      expect(escSequences[0].intermediates).toEqual([0x28]);
      expect(escSequences[0].final).toBe(0x42);
    });

    it('should parse ESC ( 0 for DEC Special Graphics', () => {
      parser.processBytes(encode('\x1b(0'));
      expect(escSequences[0].intermediates).toEqual([0x28]);
      expect(escSequences[0].final).toBe(0x30);
    });

    it('should handle ESC = (DECKPAM)', () => {
      parser.processBytes(encode('\x1b='));
      expect(escSequences[0].final).toBe(0x3D);
    });

    it('should handle ESC > (DECKPNM)', () => {
      parser.processBytes(encode('\x1b>'));
      expect(escSequences[0].final).toBe(0x3E);
    });

    it('should handle ESC c (RIS)', () => {
      parser.processBytes(encode('\x1bc'));
      expect(escSequences[0].final).toBe(0x63);
    });
  });

  describe('OSC sequences', () => {
    it('should parse OSC terminated by BEL', () => {
      parser.processBytes(encode('\x1b]2;Hello\x07'));
      expect(oscData.length).toBe(1);
      const text = new TextDecoder().decode(oscData[0]);
      expect(text).toBe('2;Hello');
    });

    it('should parse OSC terminated by ST (ESC \\)', () => {
      parser.processBytes(encode('\x1b]0;Title\x1b\\'));
      expect(oscData.length).toBe(1);
    });

    it('should handle empty OSC', () => {
      parser.processBytes(encode('\x1b]\x07'));
      expect(oscData.length).toBe(1);
    });
  });

  describe('DCS sequences', () => {
    it('should fire onDcsHook for DCS start', () => {
      let hooked = false;
      parser.onDcsHook = () => { hooked = true; };
      parser.processBytes(encode('\x1bPq'));
      expect(hooked).toBe(true);
    });

    it('should fire onDcsUnhook for DCS end (ST)', () => {
      let unhooked = false;
      parser.onDcsHook = () => {};
      parser.onDcsUnhook = () => { unhooked = true; };
      parser.processBytes(new Uint8Array([0x1B, 0x50, 0x71, 0x9C]));
      expect(unhooked).toBe(true);
    });

    it('should parse DCS parameters', () => {
      let params: number[] = [];
      parser.onDcsHook = (p) => { params = p.getParams(); };
      parser.processBytes(encode('\x1bP1;2q'));
      expect(params).toEqual([1, 2]);
    });
  });

  describe('getParam', () => {
    it('should return default for missing parameter', () => {
      parser.processBytes(encode('\x1b[A'));
      expect(csiSequences[0].params).toEqual([]);
    });

    it('should return default when parameter is 0', () => {
      parser.processBytes(encode('\x1b[0A'));
      // Parser stores 0, getParam returns default
      const p = new EscapeSequenceParser();
      p.onCsiDispatch = (parser) => {
        expect(parser.getParam(0, 1)).toBe(1); // 0 treated as default
      };
      p.processBytes(encode('\x1b[0A'));
    });
  });

  describe('reset', () => {
    it('should return to Ground state', () => {
      parser.processBytes(encode('\x1b['));
      expect(parser.state).not.toBe(ParserState.Ground);
      parser.reset();
      expect(parser.state).toBe(ParserState.Ground);
    });
  });

  describe('ESC recovery', () => {
    it('should recover from any state on ESC', () => {
      // Start a CSI but interrupt with ESC
      parser.processBytes(encode('\x1b[1\x1bD'));
      // The interrupted CSI should not dispatch
      // ESC D should dispatch
      expect(escSequences.length).toBe(1);
      expect(escSequences[0].final).toBe(0x44);
    });
  });

  describe('C1 CSI (0x9B)', () => {
    it('should handle 8-bit CSI', () => {
      parser.processBytes(new Uint8Array([0x9B, 0x41]));
      expect(csiSequences.length).toBe(1);
      expect(csiSequences[0].final).toBe(0x41);
    });
  });

  describe('Nd-specific CSI sequences', () => {
    it('should parse CSI ? 67 h (NDSSM)', () => {
      parser.processBytes(encode('\x1b[?67h'));
      expect(csiSequences[0].final).toBe(0x68);
      expect(csiSequences[0].privateMarker).toBe(0x3F);
      expect(csiSequences[0].params).toEqual([67]);
    });

    it('should parse CSI with z final byte (NDSAR)', () => {
      parser.processBytes(encode('\x1b[1;0;0;10;5z'));
      expect(csiSequences[0].final).toBe(0x7A);
      expect(csiSequences[0].params).toEqual([1, 0, 0, 10, 5]);
    });

    it('should parse CSI with ~ final byte (NDDWA)', () => {
      parser.processBytes(encode('\x1b[1;1;80;24~'));
      expect(csiSequences[0].final).toBe(0x7E);
      expect(csiSequences[0].params).toEqual([1, 1, 80, 24]);
    });
  });
});
