/**
 * ASCII BEL (0x07) sound handler using Web Audio API.
 * Generates a short beep tone without external audio files.
 * Rate-limited to prevent audio spam from rapid BEL sequences.
 */

export interface BellOptions {
  volume: number;      // 0.0 to 1.0, default 0.3
  frequency: number;   // Hz, default 800
  duration: number;    // ms, default 100
  enabled: boolean;    // Whether to play sound at all
  visualBell: boolean; // Flash the screen instead of/in addition to sound
}

const DEFAULT_BELL_OPTIONS: BellOptions = {
  volume: 0.3,
  frequency: 800,
  duration: 100,
  enabled: true,
  visualBell: false,
};

export class BellHandler {
  private _options: BellOptions;
  private _audioContext: AudioContext | null = null;
  private _lastBellTime: number = 0;
  private _minInterval: number = 100; // ms between bells

  constructor(options?: Partial<BellOptions>) {
    this._options = { ...DEFAULT_BELL_OPTIONS, ...options };
  }

  get options(): BellOptions { return this._options; }

  /** Play the bell sound */
  ring(): void {
    const now = Date.now();
    if (now - this._lastBellTime < this._minInterval) return;
    this._lastBellTime = now;

    if (this._options.enabled) {
      this.playTone();
    }
  }

  /** Update bell options */
  setOptions(options: Partial<BellOptions>): void {
    Object.assign(this._options, options);
  }

  private playTone(): void {
    try {
      if (!this._audioContext) {
        this._audioContext = new AudioContext();
      }

      const ctx = this._audioContext;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.value = this._options.frequency;
      gain.gain.value = this._options.volume;

      oscillator.connect(gain);
      gain.connect(ctx.destination);

      const duration = this._options.duration / 1000;
      oscillator.start(ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      oscillator.stop(ctx.currentTime + duration);
    } catch {
      // Audio API not available — silently ignore
    }
  }

  /** Clean up audio context */
  dispose(): void {
    if (this._audioContext) {
      this._audioContext.close();
      this._audioContext = null;
    }
  }
}
