# @retroterm/web

TypeScript terminal emulator library with VT100, TDV2215, and TDV2200 support.

Provides authentic terminal emulation in the browser with Canvas2D rendering, bitmap font support, and an xterm.js-compatible API.

## Features

- **VT100/ECMA-48** — Full VT100 terminal emulation with ANSI colors, cursor control, scrolling regions, and line drawing
- **TDV2215** — Tandberg TDV2215 emulation with character sets, protected areas, work areas, and LED indicators
- **TDV2200** — Tandberg TDV2200 emulation with ISO 646 national variants, extended mode, and transparent mode
- **Canvas2D Rendering** — Efficient dirty-rect rendering with CSS scaling (no re-render on resize)
- **Bitmap Fonts** — Authentic pixel-perfect ROM bitmap fonts for all emulators: VT100 (8x10), TDV2200 (8x16), TDV2215 (9x14)
- **Virtual Keyboard** — SVG-based TDV keyboard with all special keys, 12 national layouts
- **Selection & Clipboard** — Click-drag text selection with Clipboard API integration
- **Search** — Scrollback buffer search with match highlighting
- **Bell Sound** — Web Audio API beep for BEL character (0x07)
- **xterm.js-Compatible API** — Drop-in replacement for basic xterm.js usage

## Installation

```bash
npm install @retroterm/web
```

## Quick Start

```html
<div id="terminal" style="width: 800px; height: 500px;"></div>
<script src="retroterm.js"></script>
<script>
  const term = new RetroTerm.Terminal({
    rows: 24,
    cols: 80,
    theme: RetroTerm.Themes.green,
  });
  term.open(document.getElementById('terminal'));

  // Write output
  term.write('Hello, RetroTerm!\r\n');

  // Handle keyboard input
  term.onKey((ev) => {
    // Send ev.key to host
  });
</script>
```

### ES Module Usage

```typescript
import { Terminal, Themes, FitAddon } from '@retroterm/web';

const term = new Terminal({
  rows: 24,
  cols: 80,
  theme: Themes.green,
});

const container = document.getElementById('terminal')!;
term.open(container);

const fitAddon = new FitAddon();
term.loadAddon(fitAddon);
fitAddon.fit();

// Switch to TDV2200 emulation
term.setEmulatorType('tdv2200');
```

## API

### Terminal

```typescript
class Terminal {
  constructor(opts?: TerminalOptions);

  // Properties
  element: HTMLElement;
  rows: number;
  cols: number;
  options: TerminalOptions;

  // Lifecycle
  open(container: HTMLElement): void;
  dispose(): void;
  focus(): void;

  // I/O
  write(data: string | Uint8Array): void;
  onKey(handler: (ev: { key: string; domEvent: KeyboardEvent }) => void): IDisposable;
  onData(handler: (data: Uint8Array) => void): IDisposable;

  // Display
  refresh(start: number, end: number): void;
  resize(cols: number, rows: number): void;

  // Emulator
  setEmulatorType(type: 'vt100' | 'tdv2215' | 'tdv2200'): void;
  getEmulator(): TerminalEmulatorBase;

  // Compatibility
  loadAddon(addon: any): void;
}
```

### Themes

Built-in color themes:

```typescript
import { Themes } from '@retroterm/web';

Themes.green;      // Classic green-on-black
Themes.amber;      // Amber phosphor
Themes.white;      // White on black
Themes.blue;       // Blue terminal
Themes.paperwhite; // Black on white (paper)
```

### Virtual Keyboard

```typescript
import { VirtualKeyboard } from '@retroterm/web';

const vk = new VirtualKeyboard(document.getElementById('keyboard-container')!);
vk.attachTerminal(term, 'Terminal 1');
vk.show();
```

## Terminal Types

| Feature | VT100 | TDV2215 | TDV2200 |
|---------|-------|---------|---------|
| ANSI Colors | 256 + RGB | 256 + RGB | 256 + RGB |
| Character Sets | ASCII + Line Drawing | 4 sets + 4 national variants | 4 sets + 12 national variants |
| Protected Areas | No | Yes | Yes |
| Work Areas | No | Yes | Yes |
| LED Indicators | No | Yes | Yes |
| Push Keys | No | Yes | Yes |
| Rectangle Ops | No | Yes | Yes |
| Bitmap Font | Yes (8x10) | Yes (9x14) | Yes (8x16) |
| ISO 646 Variants | No | 4 | 12 |

## Documentation

- [Font Documentation](docs/fonts/README.md) — VT100, TDV2200, and TDV2215 bitmap font ROM reference, glyph exports, character set mapping

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Type check
npm run typecheck

# Build
npm run build

# Dev server with watch
npm run dev
```

## Browser Support

- Chrome 90+
- Firefox 90+
- Safari 15+
- Edge 90+

## License

MIT
