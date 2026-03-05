import { describe, it, expect } from 'vitest';
import { TDVDCSHandlerFeature } from '../../../src/emulators/tdv/components/TDVDCSHandlerFeature';

function createMockEmulator() {
  const processedData: number[][] = [];
  const programmedKeys = new Map<number, string>();
  return {
    processData(data: Uint8Array) {
      processedData.push(Array.from(data));
    },
    pushKeys: {
      programKey(keyNum: number, data: string) {
        programmedKeys.set(keyNum, data);
      },
      getKeySequence(keyNum: number): string | undefined {
        return programmedKeys.get(keyNum);
      },
    },
    _processedData: processedData,
    _programmedKeys: programmedKeys,
  } as any;
}

function encode(str: string): Uint8Array {
  const arr = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    arr[i] = str.charCodeAt(i);
  }
  return arr;
}

describe('TDVDCSHandlerFeature', () => {
  it('should initialize in non-receiving state', () => {
    const feat = new TDVDCSHandlerFeature();
    expect(feat.isReceivingDCS).toBe(false);
  });

  it('should start DCS reception', () => {
    const feat = new TDVDCSHandlerFeature();
    feat.startDCS();
    expect(feat.isReceivingDCS).toBe(true);
  });

  it('should accumulate DCS characters when receiving', () => {
    const feat = new TDVDCSHandlerFeature();
    feat.startDCS();
    feat.addDCSCharacter(0x41); // A
    feat.addDCSCharacter(0x42); // B
    const result = feat.processDCS();
    expect(result).toBe('AB');
  });

  it('should not accumulate characters when not receiving', () => {
    const feat = new TDVDCSHandlerFeature();
    feat.addDCSCharacter(0x41);
    const result = feat.processDCS();
    expect(result).toBe('');
  });

  describe('handleDCS', () => {
    it('should detect ESC ST terminator', () => {
      const feat = new TDVDCSHandlerFeature();
      const emu = createMockEmulator();
      feat.startDCS();
      // Data with ESC + backslash terminator
      const data = new Uint8Array([
        0x50, 0x55, 0x53, 0x48, 0x31, // PUSH1
        0x1B, 0x5C, // ESC \
      ]);
      feat.handleDCS(data, emu);
      expect(feat.isReceivingDCS).toBe(false);
    });

    it('should detect ST (0x9C) terminator', () => {
      const feat = new TDVDCSHandlerFeature();
      const emu = createMockEmulator();
      feat.startDCS();
      const data = new Uint8Array([
        0x50, 0x55, 0x53, 0x48, 0x32, // PUSH2
        0x9C, // ST
      ]);
      feat.handleDCS(data, emu);
      expect(feat.isReceivingDCS).toBe(false);
    });

    it('should accumulate bytes before terminator', () => {
      const feat = new TDVDCSHandlerFeature();
      const emu = createMockEmulator();
      feat.startDCS();
      // Send partial data without terminator
      feat.handleDCS(encode('PUSH'), emu);
      // Still receiving - no terminator
      // Now add terminator with more data
      feat.handleDCS(new Uint8Array([0x31, 0x9C]), emu);
      expect(feat.isReceivingDCS).toBe(false);
    });
  });

  describe('processDCSSequence with PUSH', () => {
    it('should program a push key via PUSH sequence', () => {
      const feat = new TDVDCSHandlerFeature();
      const emu = createMockEmulator();
      feat.startDCS();
      // Buffer: PUSH1Hello
      const seq = 'PUSH1Hello';
      for (let i = 0; i < seq.length; i++) {
        feat.addDCSCharacter(seq.charCodeAt(i));
      }
      feat.processDCSSequence(emu);
      expect(emu._programmedKeys.get(1)).toBe('Hello');
      expect(feat.isReceivingDCS).toBe(false);
    });

    it('should ignore PUSH with invalid key digit', () => {
      const feat = new TDVDCSHandlerFeature();
      const emu = createMockEmulator();
      feat.startDCS();
      const seq = 'PUSH0data'; // key 0 is invalid (< 1)
      for (let i = 0; i < seq.length; i++) {
        feat.addDCSCharacter(seq.charCodeAt(i));
      }
      feat.processDCSSequence(emu);
      expect(emu._programmedKeys.size).toBe(0);
    });

    it('should ignore PUSH with too-short sequence', () => {
      const feat = new TDVDCSHandlerFeature();
      const emu = createMockEmulator();
      feat.startDCS();
      const seq = 'PUSH'; // No key digit
      for (let i = 0; i < seq.length; i++) {
        feat.addDCSCharacter(seq.charCodeAt(i));
      }
      feat.processDCSSequence(emu);
      expect(emu._programmedKeys.size).toBe(0);
    });
  });

  describe('processDCSSequence with PROGRAM', () => {
    it('should send stored key sequence', () => {
      const feat = new TDVDCSHandlerFeature();
      const emu = createMockEmulator();
      emu.pushKeys.programKey(3, 'DIR');
      feat.startDCS();
      const seq = 'PROGRAM3';
      for (let i = 0; i < seq.length; i++) {
        feat.addDCSCharacter(seq.charCodeAt(i));
      }
      feat.processDCSSequence(emu);
      expect(emu._processedData.length).toBe(1);
      expect(emu._processedData[0]).toEqual([68, 73, 82]); // 'DIR'
    });

    it('should do nothing for unprogrammed key', () => {
      const feat = new TDVDCSHandlerFeature();
      const emu = createMockEmulator();
      feat.startDCS();
      const seq = 'PROGRAM5';
      for (let i = 0; i < seq.length; i++) {
        feat.addDCSCharacter(seq.charCodeAt(i));
      }
      feat.processDCSSequence(emu);
      expect(emu._processedData.length).toBe(0);
    });

    it('should ignore PROGRAM with invalid key number', () => {
      const feat = new TDVDCSHandlerFeature();
      const emu = createMockEmulator();
      feat.startDCS();
      const seq = 'PROGRAM0'; // 0 is invalid
      for (let i = 0; i < seq.length; i++) {
        feat.addDCSCharacter(seq.charCodeAt(i));
      }
      feat.processDCSSequence(emu);
      expect(emu._processedData.length).toBe(0);
    });

    it('should ignore PROGRAM with too-short sequence', () => {
      const feat = new TDVDCSHandlerFeature();
      const emu = createMockEmulator();
      feat.startDCS();
      const seq = 'PROGRA'; // Too short
      for (let i = 0; i < seq.length; i++) {
        feat.addDCSCharacter(seq.charCodeAt(i));
      }
      feat.processDCSSequence(emu);
      expect(emu._processedData.length).toBe(0);
    });
  });

  describe('processDCSSequence with empty buffer', () => {
    it('should handle empty buffer gracefully', () => {
      const feat = new TDVDCSHandlerFeature();
      const emu = createMockEmulator();
      feat.startDCS();
      feat.processDCSSequence(emu);
      expect(feat.isReceivingDCS).toBe(false);
    });
  });

  describe('processDCS (string extraction)', () => {
    it('should return accumulated string', () => {
      const feat = new TDVDCSHandlerFeature();
      feat.startDCS();
      feat.addDCSCharacter(0x48); // H
      feat.addDCSCharacter(0x69); // i
      const result = feat.processDCS();
      expect(result).toBe('Hi');
      expect(feat.isReceivingDCS).toBe(false);
    });

    it('should return empty string for empty buffer', () => {
      const feat = new TDVDCSHandlerFeature();
      feat.startDCS();
      const result = feat.processDCS();
      expect(result).toBe('');
      expect(feat.isReceivingDCS).toBe(false);
    });
  });

  describe('reset', () => {
    it('should clear buffer and stop receiving', () => {
      const feat = new TDVDCSHandlerFeature();
      feat.startDCS();
      feat.addDCSCharacter(0x41);
      feat.addDCSCharacter(0x42);
      feat.reset();
      expect(feat.isReceivingDCS).toBe(false);
      const result = feat.processDCS();
      expect(result).toBe('');
    });
  });

  describe('unknown DCS sequences', () => {
    it('should ignore unknown sequence prefixes', () => {
      const feat = new TDVDCSHandlerFeature();
      const emu = createMockEmulator();
      feat.startDCS();
      const seq = 'XYZdata';
      for (let i = 0; i < seq.length; i++) {
        feat.addDCSCharacter(seq.charCodeAt(i));
      }
      feat.processDCSSequence(emu);
      // No push keys programmed, no data processed
      expect(emu._programmedKeys.size).toBe(0);
      expect(emu._processedData.length).toBe(0);
      expect(feat.isReceivingDCS).toBe(false);
    });
  });
});
