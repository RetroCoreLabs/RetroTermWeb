import { describe, it, expect } from 'vitest';
import { TDVDCSHandler } from '../../../src/emulators/tdv/components/TDVDCSHandler';

describe('TDVDCSHandler', () => {
  it('should initialize in non-receiving state', () => {
    const dcs = new TDVDCSHandler();
    expect(dcs.isReceivingDCS).toBe(false);
  });

  it('should start DCS reception', () => {
    const dcs = new TDVDCSHandler();
    dcs.startDCS();
    expect(dcs.isReceivingDCS).toBe(true);
  });

  it('should accumulate DCS characters', () => {
    const dcs = new TDVDCSHandler();
    dcs.startDCS();
    dcs.addDCSCharacter(0x50); // P
    dcs.addDCSCharacter(0x55); // U
    dcs.addDCSCharacter(0x53); // S
    dcs.addDCSCharacter(0x48); // H
    expect(dcs.currentDCSString).toBe('PUSH');
  });

  it('should not accumulate when not receiving', () => {
    const dcs = new TDVDCSHandler();
    dcs.addDCSCharacter(0x41);
    expect(dcs.currentDCSString).toBe('');
  });

  it('should process PUSH key sequence', () => {
    const dcs = new TDVDCSHandler();
    dcs.startDCS();
    const seq = 'PUSH1';
    for (let i = 0; i < seq.length; i++) {
      dcs.addDCSCharacter(seq.charCodeAt(i));
    }
    const result = dcs.processDCS();
    expect(result).toBe('PUSH key 1 pressed');
    expect(dcs.isReceivingDCS).toBe(false);
  });

  it('should process UDC sequence', () => {
    const dcs = new TDVDCSHandler();
    dcs.startDCS();
    const seq = 'UDCtest';
    for (let i = 0; i < seq.length; i++) {
      dcs.addDCSCharacter(seq.charCodeAt(i));
    }
    const result = dcs.processDCS();
    expect(result).toBe('UDC: test');
  });

  it('should process SOFT sequence', () => {
    const dcs = new TDVDCSHandler();
    dcs.startDCS();
    const seq = 'SOFTdata';
    for (let i = 0; i < seq.length; i++) {
      dcs.addDCSCharacter(seq.charCodeAt(i));
    }
    const result = dcs.processDCS();
    expect(result).toBe('SOFT: data');
  });

  it('should process LED sequence', () => {
    const dcs = new TDVDCSHandler();
    dcs.startDCS();
    const seq = 'LED123';
    for (let i = 0; i < seq.length; i++) {
      dcs.addDCSCharacter(seq.charCodeAt(i));
    }
    const result = dcs.processDCS();
    expect(result).toBe('LED: 123');
  });

  it('should handle unknown DCS sequence', () => {
    const dcs = new TDVDCSHandler();
    dcs.startDCS();
    dcs.addDCSCharacter(0x58); // X
    const result = dcs.processDCS();
    expect(result).toBe('Unknown DCS: X');
  });

  it('should return empty for empty buffer', () => {
    const dcs = new TDVDCSHandler();
    expect(dcs.processDCS()).toBe('');
  });

  it('should cancel DCS reception', () => {
    const dcs = new TDVDCSHandler();
    dcs.startDCS();
    dcs.addDCSCharacter(0x41);
    dcs.cancelDCS();
    expect(dcs.isReceivingDCS).toBe(false);
    expect(dcs.currentDCSString).toBe('');
  });

  it('should reset', () => {
    const dcs = new TDVDCSHandler();
    dcs.startDCS();
    dcs.addDCSCharacter(0x41);
    dcs.reset();
    expect(dcs.isReceivingDCS).toBe(false);
    expect(dcs.currentDCSString).toBe('');
  });
});
