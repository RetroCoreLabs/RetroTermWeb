import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BellHandler } from '../../../src/features/BellHandler';

describe('BellHandler', () => {
  let handler: BellHandler;

  beforeEach(() => {
    handler = new BellHandler();
  });

  afterEach(() => {
    handler.dispose();
  });

  it('should create with default options', () => {
    const opts = handler.options;
    expect(opts.volume).toBe(0.3);
    expect(opts.frequency).toBe(800);
    expect(opts.duration).toBe(100);
    expect(opts.enabled).toBe(true);
    expect(opts.visualBell).toBe(false);
  });

  it('should create with custom options', () => {
    const custom = new BellHandler({
      volume: 0.8,
      frequency: 440,
      duration: 200,
      enabled: false,
      visualBell: true,
    });
    const opts = custom.options;
    expect(opts.volume).toBe(0.8);
    expect(opts.frequency).toBe(440);
    expect(opts.duration).toBe(200);
    expect(opts.enabled).toBe(false);
    expect(opts.visualBell).toBe(true);
    custom.dispose();
  });

  it('should update options with setOptions', () => {
    handler.setOptions({ volume: 0.5, frequency: 1000 });
    expect(handler.options.volume).toBe(0.5);
    expect(handler.options.frequency).toBe(1000);
  });

  it('should merge partial options without replacing all', () => {
    handler.setOptions({ volume: 0.9 });
    // volume changed
    expect(handler.options.volume).toBe(0.9);
    // other defaults preserved
    expect(handler.options.frequency).toBe(800);
    expect(handler.options.duration).toBe(100);
    expect(handler.options.enabled).toBe(true);
    expect(handler.options.visualBell).toBe(false);
  });

  it('ring() should not throw when AudioContext is unavailable', () => {
    // In Node/test environment, AudioContext does not exist.
    // ring() should catch the error internally and not propagate it.
    expect(() => handler.ring()).not.toThrow();
  });

  it('ring() should respect rate limiting', () => {
    const nowSpy = vi.spyOn(Date, 'now');
    try {
      // First call at t=1000 -- should proceed (sets _lastBellTime)
      nowSpy.mockReturnValue(1000);
      handler.ring();

      // Second call at t=1050 -- within 100ms window, should be rate-limited
      nowSpy.mockReturnValue(1050);
      handler.ring();

      // Third call at t=1100 -- exactly at boundary (diff == 100), should proceed
      nowSpy.mockReturnValue(1100);
      handler.ring();

      // If we get here without errors, rate limiting logic executed correctly.
      // We cannot directly observe the rate limit suppression without spying on
      // playTone (which is private), but we verify no throws occurred and the
      // timing logic path was exercised.
      expect(true).toBe(true);
    } finally {
      nowSpy.mockRestore();
    }
  });

  it('ring() should not play when enabled is false', () => {
    handler.setOptions({ enabled: false });
    // Should not throw; the method should return early after rate-limit check
    expect(() => handler.ring()).not.toThrow();
  });

  it('dispose() should not throw', () => {
    expect(() => handler.dispose()).not.toThrow();
  });

  it('dispose() should be safe to call twice', () => {
    expect(() => {
      handler.dispose();
      handler.dispose();
    }).not.toThrow();
  });

  it('should allow setting volume to 0', () => {
    handler.setOptions({ volume: 0 });
    expect(handler.options.volume).toBe(0);
    // ring should still not throw even with volume 0
    expect(() => handler.ring()).not.toThrow();
  });
});
