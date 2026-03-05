# Contributing to @retroterm/web

Thank you for your interest in contributing!

## Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/user/RetroTermTS.git
   cd RetroTermTS
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run tests:
   ```bash
   npm test
   ```

4. Type check:
   ```bash
   npm run typecheck
   ```

5. Build:
   ```bash
   npm run build
   ```

## Project Structure

```
src/
  buffer/       — Terminal buffer and cell data structures
  parser/       — Escape sequence state machine parser
  emulators/    — VT100 and TDV terminal emulators
  keyboard/     — Keyboard mapping and virtual keyboard
  renderer/     — Canvas2D rendering (system + bitmap fonts)
  fonts/        — Bitmap font glyph data (TDV2200, TDV2215)
  features/     — Selection, clipboard, search, bell
  terminal/     — Main Terminal class and public API
test/
  unit/         — Unit tests (vitest)
demo/           — Test web application
```

## Code Style

- TypeScript strict mode
- No LINQ-style methods in hot paths — use explicit `for` loops
- Pre-allocated TypedArrays for buffer data
- All public APIs documented with JSDoc comments

## Testing

- Write unit tests for all new functionality
- Run `npm test` before submitting PRs
- Run `npm run typecheck` to verify type safety

## Pull Requests

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Ensure `npm test` and `npm run typecheck` pass
5. Submit a pull request with a clear description

## Reporting Issues

Please include:
- Terminal type (VT100, TDV2215, TDV2200)
- Browser and version
- Steps to reproduce
- Expected vs actual behavior
