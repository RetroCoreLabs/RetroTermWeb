/**
 * Event subscription cleanup interface, compatible with xterm.js IDisposable.
 */
export interface IDisposable {
  dispose(): void;
}

/** Create a disposable from a cleanup function */
export function toDisposable(fn: () => void): IDisposable {
  let disposed = false;
  return {
    dispose(): void {
      if (!disposed) {
        disposed = true;
        fn();
      }
    },
  };
}

/** Simple event emitter with typed callbacks */
export class EventEmitter<T = void> {
  private _listeners: ((value: T) => void)[] = [];

  /** Subscribe to the event. Returns a disposable to unsubscribe. */
  on(listener: (value: T) => void): IDisposable {
    this._listeners.push(listener);
    return toDisposable(() => {
      const idx = this._listeners.indexOf(listener);
      if (idx >= 0) {
        this._listeners.splice(idx, 1);
      }
    });
  }

  /** Fire the event with a value */
  fire(value: T): void {
    // Iterate over a copy to allow listeners to unsubscribe during fire
    const listeners = this._listeners.slice();
    for (let i = 0; i < listeners.length; i++) {
      listeners[i](value);
    }
  }

  /** Remove all listeners */
  clear(): void {
    this._listeners.length = 0;
  }

  /** Number of listeners */
  get count(): number {
    return this._listeners.length;
  }
}
