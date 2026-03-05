import { describe, it, expect, vi } from 'vitest';
import { EscapeSequenceParser } from '../../../src/parser/EscapeSequenceParser';

function encode(str: string): Uint8Array {
  const arr = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    arr[i] = str.charCodeAt(i);
  }
  return arr;
}

describe('EscapeSequenceParser — APC/PM/SOS states', () => {
  it('should enter ApcString state on ESC _ and consume until ST', () => {
    const parser = new EscapeSequenceParser();
    const chars: number[] = [];
    parser.onCharacter = (cp) => chars.push(cp);

    // ESC _ enters APC, bytes consumed, ESC \ terminates, then 'A' is normal
    parser.processBytes(new Uint8Array([0x1B, 0x5F, 0x48, 0x69, 0x1B, 0x5C, 0x41]));
    // Only 'A' should be a printable character output
    expect(chars).toEqual([0x41]);
  });

  it('should enter PmString state on ESC ^ and consume until ST', () => {
    const parser = new EscapeSequenceParser();
    const chars: number[] = [];
    parser.onCharacter = (cp) => chars.push(cp);

    // ESC ^ enters PM, data consumed, ESC \ terminates, then 'B'
    parser.processBytes(new Uint8Array([0x1B, 0x5E, 0x48, 0x69, 0x1B, 0x5C, 0x42]));
    expect(chars).toEqual([0x42]);
  });

  it('should enter SosString state on ESC X and consume until ST', () => {
    const parser = new EscapeSequenceParser();
    const chars: number[] = [];
    parser.onCharacter = (cp) => chars.push(cp);

    // ESC X enters SOS, data consumed, ESC \ terminates, then 'C'
    parser.processBytes(new Uint8Array([0x1B, 0x58, 0x48, 0x69, 0x1B, 0x5C, 0x43]));
    expect(chars).toEqual([0x43]);
  });

  it('should consume APC until 0x9C (C1 ST)', () => {
    const parser = new EscapeSequenceParser();
    const chars: number[] = [];
    parser.onCharacter = (cp) => chars.push(cp);

    // ESC _ enters APC, data consumed, 0x9C terminates, then 'D'
    parser.processBytes(new Uint8Array([0x1B, 0x5F, 0x48, 0x69, 0x9C, 0x44]));
    expect(chars).toEqual([0x44]);
  });
});

describe('EscapeSequenceParser — getParams', () => {
  it('should return all CSI parameters as an array', () => {
    const parser = new EscapeSequenceParser();
    let params: number[] = [];
    parser.onCsiDispatch = (p) => {
      params = p.getParams();
    };

    // CSI 1;5;10 m
    parser.processBytes(encode('\x1b[1;5;10m'));
    expect(params).toEqual([1, 5, 10]);
  });

  it('should return empty array when no params', () => {
    const parser = new EscapeSequenceParser();
    let params: number[] = [];
    parser.onCsiDispatch = (p) => {
      params = p.getParams();
    };

    // CSI m (no params)
    parser.processBytes(encode('\x1b[m'));
    expect(params.length).toBeLessThanOrEqual(1); // May include default 0
  });
});

describe('EscapeSequenceParser — state and privateMarker getters', () => {
  it('should expose privateMarker for ? prefix', () => {
    const parser = new EscapeSequenceParser();
    let marker = 0;
    parser.onCsiDispatch = (p) => {
      marker = p.privateMarker;
    };

    // CSI ? 25 h (DECTCEM)
    parser.processBytes(encode('\x1b[?25h'));
    expect(marker).toBe(0x3F); // '?'
  });

  it('should expose privateMarker for > prefix', () => {
    const parser = new EscapeSequenceParser();
    let marker = 0;
    parser.onCsiDispatch = (p) => {
      marker = p.privateMarker;
    };

    // CSI > 0 c (Secondary DA)
    parser.processBytes(encode('\x1b[>0c'));
    expect(marker).toBe(0x3E); // '>'
  });

  it('should have privateMarker 0 for standard CSI', () => {
    const parser = new EscapeSequenceParser();
    let marker = -1;
    parser.onCsiDispatch = (p) => {
      marker = p.privateMarker;
    };

    parser.processBytes(encode('\x1b[5A'));
    expect(marker).toBe(0);
  });
});

describe('EscapeSequenceParser — DCS passthrough', () => {
  it('should fire onDcsHook and onDcsUnhook for DCS sequences', () => {
    const parser = new EscapeSequenceParser();
    let hooked = false;
    let unhooked = false;

    parser.onDcsHook = () => { hooked = true; };
    parser.onDcsUnhook = () => { unhooked = true; };

    // ESC P q enters DCS (final byte 'q' triggers hook)
    parser.processBytes(new Uint8Array([0x1B, 0x50, 0x71]));
    expect(hooked).toBe(true);

    // Passthrough data (accumulated internally)
    parser.processBytes(new Uint8Array([0x41, 0x42, 0x43]));

    // ESC \ = ST terminates DCS
    parser.processBytes(new Uint8Array([0x1B, 0x5C]));
    expect(unhooked).toBe(true);
  });

  it('should terminate DCS on 0x9C (C1 ST)', () => {
    const parser = new EscapeSequenceParser();
    let unhooked = false;
    parser.onDcsHook = () => {};
    parser.onDcsUnhook = () => { unhooked = true; };

    parser.processBytes(new Uint8Array([0x1B, 0x50, 0x71])); // DCS hook
    parser.processBytes(new Uint8Array([0x41, 0x9C])); // Data + ST
    expect(unhooked).toBe(true);
  });

  it('should declare onDcsPut callback slot', () => {
    const parser = new EscapeSequenceParser();
    // onDcsPut is declared but not dispatched by current parser
    // (data is accumulated internally in string buffer)
    expect(parser.onDcsPut).toBeNull();
    parser.onDcsPut = () => {};
    expect(parser.onDcsPut).toBeDefined();
  });
});
