# Changelog

## 0.1.0 (2026-02-27)

Initial release.

### Features

- VT100/ECMA-48 terminal emulation (cursor control, colors, attributes, scrolling, line drawing)
- TDV2215 terminal emulation with character sets, protected areas, work areas, LEDs
- TDV2200 terminal emulation with ISO 646 national variants, extended/transparent mode
- Canvas2D rendering with dirty-rect tracking and CSS scaling
- Bitmap font rendering for TDV2200 (8x16) and TDV2215 (9x14) ROM fonts
- System font rendering for VT100 mode
- Escape sequence state machine parser
- TDV keyboard mapping with all special keys and 12 national layouts
- Virtual keyboard component (SVG-based)
- Text selection (character, word, line, rectangular)
- Clipboard API integration
- Scrollback buffer search with match highlighting
- Web Audio API bell sound
- xterm.js-compatible API surface
- IIFE and ESM bundle outputs
