import { describe, it, expect } from 'vitest';
import { ClipboardManager } from '../../../src/features/ClipboardManager';

describe('ClipboardManager', () => {
  it('should be instantiable', () => {
    const manager = new ClipboardManager();
    expect(manager).toBeDefined();
    expect(manager).toBeInstanceOf(ClipboardManager);
  });

  it('copyText should return false when clipboard API is unavailable', async () => {
    // In Node/test environment, navigator.clipboard is not available.
    // The method should fall back to fallbackCopy which also fails in Node,
    // ultimately returning false.
    const manager = new ClipboardManager();
    const result = await manager.copyText('hello');
    expect(result).toBe(false);
  });

  it('readText should return empty string when clipboard API is unavailable', async () => {
    // In Node/test environment, navigator.clipboard is not available.
    // The method should catch the error and return empty string.
    const manager = new ClipboardManager();
    const result = await manager.readText();
    expect(result).toBe('');
  });

  it('should handle empty string copy', async () => {
    const manager = new ClipboardManager();
    const result = await manager.copyText('');
    // Without clipboard API, returns false; the important thing is no throw
    expect(typeof result).toBe('boolean');
  });

  it('should handle empty string read', async () => {
    const manager = new ClipboardManager();
    const result = await manager.readText();
    // Without clipboard API, returns empty string
    expect(typeof result).toBe('string');
    expect(result).toBe('');
  });

  it('copyText should not throw on failure', async () => {
    const manager = new ClipboardManager();
    // Should resolve (not reject) even when clipboard API is unavailable
    await expect(manager.copyText('test')).resolves.not.toThrow();
  });

  it('readText should not throw on failure', async () => {
    const manager = new ClipboardManager();
    // Should resolve (not reject) even when clipboard API is unavailable
    await expect(manager.readText()).resolves.not.toThrow();
  });

  it('should create a new instance each time', () => {
    const a = new ClipboardManager();
    const b = new ClipboardManager();
    expect(a).not.toBe(b);
    expect(a).toBeInstanceOf(ClipboardManager);
    expect(b).toBeInstanceOf(ClipboardManager);
  });
});
