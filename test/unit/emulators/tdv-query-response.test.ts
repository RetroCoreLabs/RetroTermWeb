import { describe, it, expect } from 'vitest';
import { TDV2215Emulator } from '../../../src/emulators/tdv/TDV2215Emulator';
import { TDV2200Emulator } from '../../../src/emulators/tdv/TDV2200Emulator';
import { encode, collectResponses, decodeResponse } from '../../helpers/test-emulator';

describe('TDV Query/Response', () => {
  describe('TDV2215 queries', () => {
    function create(): TDV2215Emulator { return new TDV2215Emulator(80, 24); }

    it('primary DA should return TDV2215 response', () => {
      const emu = create();
      const responses = collectResponses(emu);
      emu.processData(encode('\x1b[c'));
      expect(responses.length).toBe(1);
      expect(decodeResponse(responses[0])).toBe('\x1b[?1;2c');
    });

    it('primary DA in 2115 mode should return 2115 response', () => {
      const emu = create();
      emu.processData(encode('\x1b[?40h')); // Enable 2115 mode
      const responses = collectResponses(emu);
      emu.processData(encode('\x1b[c'));
      expect(decodeResponse(responses[0])).toBe('\x1b[?1;0c');
    });

    it('secondary DA should return model 115', () => {
      const emu = create();
      const responses = collectResponses(emu);
      emu.processData(encode('\x1b[>c'));
      expect(decodeResponse(responses[0])).toBe('\x1b[>115;0;0c');
    });

    it('DSR (5n) should return OK', () => {
      const emu = create();
      const responses = collectResponses(emu);
      emu.processData(encode('\x1b[5n'));
      expect(decodeResponse(responses[0])).toBe('\x1b[0n');
    });

    it('CPR (6n) should return cursor position', () => {
      const emu = create();
      emu.processData(encode('\x1b[5;10H')); // Move to row 5, col 10
      const responses = collectResponses(emu);
      emu.processData(encode('\x1b[6n'));
      expect(decodeResponse(responses[0])).toBe('\x1b[5;10R');
    });

    it('CPR should report 1,1 when at home', () => {
      const emu = create();
      const responses = collectResponses(emu);
      emu.processData(encode('\x1b[6n'));
      expect(decodeResponse(responses[0])).toBe('\x1b[1;1R');
    });

    it('ESC Z should return terminal identification', () => {
      const emu = create();
      const responses = collectResponses(emu);
      emu.processData(encode('\x1bZ'));
      expect(decodeResponse(responses[0])).toBe('\x1b[?1;2c');
    });

    it('ESC Z in 2115 mode should return 2115 identification', () => {
      const emu = create();
      emu.processData(encode('\x1b[?40h'));
      const responses = collectResponses(emu);
      emu.processData(encode('\x1bZ'));
      expect(decodeResponse(responses[0])).toBe('\x1b[?1;0c');
    });

    it('DECRQM for smooth scroll (67) when enabled', () => {
      const emu = create();
      emu.processData(encode('\x1b[?67h'));
      const responses = collectResponses(emu);
      emu.processData(encode('\x1b[?67$p'));
      expect(decodeResponse(responses[0])).toBe('\x1b[?67;1$y');
    });

    it('DECRQM for smooth scroll (67) when disabled', () => {
      const emu = create();
      const responses = collectResponses(emu);
      emu.processData(encode('\x1b[?67$p'));
      expect(decodeResponse(responses[0])).toBe('\x1b[?67;2$y');
    });

    it('DECRQM for blink mode (68)', () => {
      const emu = create();
      emu.processData(encode('\x1b[?68h'));
      const responses = collectResponses(emu);
      emu.processData(encode('\x1b[?68$p'));
      expect(decodeResponse(responses[0])).toBe('\x1b[?68;1$y');
    });

    it('DECRQM for enhanced blink (69)', () => {
      const emu = create();
      emu.processData(encode('\x1b[?69h'));
      const responses = collectResponses(emu);
      emu.processData(encode('\x1b[?69$p'));
      expect(decodeResponse(responses[0])).toBe('\x1b[?69;1$y');
    });

    it('DECRQM for extended mode (1)', () => {
      const emu = create();
      emu.processData(encode('\x1b[?1h'));
      const responses = collectResponses(emu);
      emu.processData(encode('\x1b[?1$p'));
      expect(decodeResponse(responses[0])).toBe('\x1b[?1;1$y');
    });

    it('DECRQM for transparent mode (2)', () => {
      const emu = create();
      emu.processData(encode('\x1b[?2h'));
      const responses = collectResponses(emu);
      emu.processData(encode('\x1b[?2$p'));
      expect(decodeResponse(responses[0])).toBe('\x1b[?2;1$y');
    });

    it('DECRQM for unknown mode returns 0', () => {
      const emu = create();
      const responses = collectResponses(emu);
      emu.processData(encode('\x1b[?999$p'));
      expect(decodeResponse(responses[0])).toBe('\x1b[?999;0$y');
    });
  });

  describe('TDV2200 queries', () => {
    function create(): TDV2200Emulator { return new TDV2200Emulator(80, 24); }

    it('primary DA should return TDV2200 response', () => {
      const emu = create();
      const responses = collectResponses(emu);
      emu.processData(encode('\x1b[c'));
      expect(decodeResponse(responses[0])).toBe('\x1b[?220;0c');
    });

    it('primary DA in 2115 mode should return 2115 response', () => {
      const emu = create();
      emu.processData(encode('\x1b[?40h'));
      const responses = collectResponses(emu);
      emu.processData(encode('\x1b[c'));
      expect(decodeResponse(responses[0])).toBe('\x1b[?115;0c');
    });

    it('secondary DA should return model 220', () => {
      const emu = create();
      const responses = collectResponses(emu);
      emu.processData(encode('\x1b[>c'));
      expect(decodeResponse(responses[0])).toBe('\x1b[>220;0;0c');
    });

    it('DSR should return OK', () => {
      const emu = create();
      const responses = collectResponses(emu);
      emu.processData(encode('\x1b[5n'));
      expect(decodeResponse(responses[0])).toBe('\x1b[0n');
    });

    it('CPR should return cursor position', () => {
      const emu = create();
      emu.processData(encode('\x1b[10;20H'));
      const responses = collectResponses(emu);
      emu.processData(encode('\x1b[6n'));
      expect(decodeResponse(responses[0])).toBe('\x1b[10;20R');
    });

    it('ESC Z should return TDV2200 identification', () => {
      const emu = create();
      const responses = collectResponses(emu);
      emu.processData(encode('\x1bZ'));
      expect(decodeResponse(responses[0])).toBe('\x1b[?220;0c');
    });

    it('ESC Z in 2115 mode should return 2115 identification', () => {
      const emu = create();
      emu.processData(encode('\x1b[?40h'));
      const responses = collectResponses(emu);
      emu.processData(encode('\x1bZ'));
      expect(decodeResponse(responses[0])).toBe('\x1b[?115;0c');
    });

    it('DECRQM for 2115 compat mode (40) when enabled', () => {
      const emu = create();
      emu.processData(encode('\x1b[?40h'));
      const responses = collectResponses(emu);
      emu.processData(encode('\x1b[?40$p'));
      expect(decodeResponse(responses[0])).toBe('\x1b[?40;1$y');
    });

    it('DECRQM for 2115 compat mode (40) when disabled', () => {
      const emu = create();
      const responses = collectResponses(emu);
      emu.processData(encode('\x1b[?40$p'));
      expect(decodeResponse(responses[0])).toBe('\x1b[?40;2$y');
    });
  });

  describe('onResponseReady event', () => {
    it('should fire onResponseReady for TDV2215 queries', () => {
      const emu = new TDV2215Emulator(80, 24);
      const events: string[] = [];
      emu.onResponseReady.on((response) => events.push(response));
      emu.processData(encode('\x1b[c'));
      expect(events.length).toBe(1);
      expect(events[0]).toBe('\x1b[?1;2c');
    });

    it('should fire onResponseReady for TDV2200 queries', () => {
      const emu = new TDV2200Emulator(80, 24);
      const events: string[] = [];
      emu.onResponseReady.on((response) => events.push(response));
      emu.processData(encode('\x1b[c'));
      expect(events.length).toBe(1);
      expect(events[0]).toBe('\x1b[?220;0c');
    });

    it('should fire for CPR', () => {
      const emu = new TDV2215Emulator(80, 24);
      emu.processData(encode('\x1b[5;10H'));
      const events: string[] = [];
      emu.onResponseReady.on((response) => events.push(response));
      emu.processData(encode('\x1b[6n'));
      expect(events[0]).toBe('\x1b[5;10R');
    });

    it('should fire for DSR', () => {
      const emu = new TDV2200Emulator(80, 24);
      const events: string[] = [];
      emu.onResponseReady.on((response) => events.push(response));
      emu.processData(encode('\x1b[5n'));
      expect(events[0]).toBe('\x1b[0n');
    });

    it('should fire for ESC Z', () => {
      const emu = new TDV2200Emulator(80, 24);
      const events: string[] = [];
      emu.onResponseReady.on((response) => events.push(response));
      emu.processData(encode('\x1bZ'));
      expect(events[0]).toBe('\x1b[?220;0c');
    });
  });
});
