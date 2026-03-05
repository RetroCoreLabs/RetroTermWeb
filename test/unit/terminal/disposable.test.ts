import { describe, it, expect } from 'vitest';
import { toDisposable, EventEmitter } from '../../../src/terminal/Disposable';

describe('toDisposable', () => {
  it('should call the cleanup function on dispose', () => {
    let cleaned = false;
    const d = toDisposable(() => { cleaned = true; });
    expect(cleaned).toBe(false);
    d.dispose();
    expect(cleaned).toBe(true);
  });

  it('should only call cleanup once (idempotent)', () => {
    let count = 0;
    const d = toDisposable(() => { count++; });
    d.dispose();
    d.dispose();
    d.dispose();
    expect(count).toBe(1);
  });
});

describe('EventEmitter', () => {
  it('should fire events to listeners', () => {
    const emitter = new EventEmitter<number>();
    const values: number[] = [];
    emitter.on((v) => values.push(v));
    emitter.fire(42);
    expect(values).toEqual([42]);
  });

  it('should fire to multiple listeners', () => {
    const emitter = new EventEmitter<string>();
    const a: string[] = [];
    const b: string[] = [];
    emitter.on((v) => a.push(v));
    emitter.on((v) => b.push(v));
    emitter.fire('hello');
    expect(a).toEqual(['hello']);
    expect(b).toEqual(['hello']);
  });

  it('should unsubscribe via dispose', () => {
    const emitter = new EventEmitter<number>();
    const values: number[] = [];
    const sub = emitter.on((v) => values.push(v));
    emitter.fire(1);
    sub.dispose();
    emitter.fire(2);
    expect(values).toEqual([1]);
  });

  it('should track listener count', () => {
    const emitter = new EventEmitter<void>();
    expect(emitter.count).toBe(0);
    const sub1 = emitter.on(() => {});
    expect(emitter.count).toBe(1);
    const sub2 = emitter.on(() => {});
    expect(emitter.count).toBe(2);
    sub1.dispose();
    expect(emitter.count).toBe(1);
    sub2.dispose();
    expect(emitter.count).toBe(0);
  });

  it('should clear all listeners', () => {
    const emitter = new EventEmitter<number>();
    const values: number[] = [];
    emitter.on((v) => values.push(v));
    emitter.on((v) => values.push(v * 2));
    expect(emitter.count).toBe(2);

    emitter.clear();
    expect(emitter.count).toBe(0);
    emitter.fire(5);
    expect(values).toEqual([]);
  });

  it('should handle listener unsubscribing during fire', () => {
    const emitter = new EventEmitter<number>();
    const values: number[] = [];
    let sub: any;
    sub = emitter.on((v) => {
      values.push(v);
      sub.dispose();
    });
    emitter.on((v) => values.push(v * 10));

    emitter.fire(1);
    // Both listeners should fire (iterates copy)
    expect(values).toEqual([1, 10]);

    // First listener is now unsubscribed
    emitter.fire(2);
    expect(values).toEqual([1, 10, 20]);
  });

  it('should fire void events', () => {
    const emitter = new EventEmitter();
    let fired = false;
    emitter.on(() => { fired = true; });
    emitter.fire();
    expect(fired).toBe(true);
  });

  it('should handle dispose of already-removed listener', () => {
    const emitter = new EventEmitter<number>();
    const sub = emitter.on(() => {});
    emitter.clear();
    // Disposing after clear should not throw
    sub.dispose();
    expect(emitter.count).toBe(0);
  });
});
