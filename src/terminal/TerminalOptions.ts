/**
 * Configuration options for the Terminal class.
 * Compatible with xterm.js TerminalOptions where applicable.
 */
export interface TerminalOptions {
  /** Number of columns. Default: 80 */
  cols?: number;

  /** Number of rows. Default: 24 */
  rows?: number;

  /** Maximum scrollback lines. Default: 10000 */
  scrollback?: number;

  /** Font family for system font rendering. Default: 'monospace' */
  fontFamily?: string;

  /** Font size in pixels (system font mode). Default: 16 */
  fontSize?: number;

  /** Line height multiplier. Default: 1.0 */
  lineHeight?: number;

  /** Terminal theme colors */
  theme?: TerminalTheme;

  /** Whether to allow transparency. Default: false */
  allowTransparency?: boolean;

  /** Cursor style. Default: 'block' */
  cursorStyle?: 'block' | 'underline' | 'bar';

  /** Whether cursor blinks. Default: false */
  cursorBlink?: boolean;

  /** @deprecated All emulators always use bitmap fonts. This option is ignored. */
  useBitmapFont?: boolean;

  /** Bell volume (0 = silent, 1 = full). Default: 0.5 */
  bellVolume?: number;

  /** Bell frequency in Hz. Default: 800 */
  bellFrequency?: number;

  /** Bell duration in ms. Default: 100 */
  bellDuration?: number;

  /** Emulator type. Default: 'vt100' */
  emulatorType?: 'vt100' | 'tdv2215' | 'tdv2200';
}

export interface TerminalTheme {
  /** Default foreground color (CSS color string) */
  foreground?: string;

  /** Default background color (CSS color string) */
  background?: string;

  /** Cursor color (CSS color string) */
  cursor?: string;

  /** Cursor accent color (text under block cursor) */
  cursorAccent?: string;

  /** Selection background color */
  selectionBackground?: string;

  /** Selection foreground color */
  selectionForeground?: string;

  /** ANSI color palette (0-15) */
  black?: string;
  red?: string;
  green?: string;
  yellow?: string;
  blue?: string;
  magenta?: string;
  cyan?: string;
  white?: string;
  brightBlack?: string;
  brightRed?: string;
  brightGreen?: string;
  brightYellow?: string;
  brightBlue?: string;
  brightMagenta?: string;
  brightCyan?: string;
  brightWhite?: string;
}

/** Predefined terminal themes */
export const Themes = {
  green: {
    foreground: '#33ff33',
    background: '#000000',
    cursor: '#33ff33',
  } as TerminalTheme,

  amber: {
    foreground: '#ffb000',
    background: '#000000',
    cursor: '#ffb000',
  } as TerminalTheme,

  white: {
    foreground: '#ffffff',
    background: '#000000',
    cursor: '#ffffff',
  } as TerminalTheme,

  blue: {
    foreground: '#00aaff',
    background: '#000000',
    cursor: '#00aaff',
  } as TerminalTheme,

  paperwhite: {
    foreground: '#000000',
    background: '#f5f5dc',
    cursor: '#000000',
  } as TerminalTheme,
};
