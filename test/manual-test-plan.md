# RetroTerm.Web — Manual Test Plan

Each numbered item maps 1:1 to an automated test in `test/ui/` or `test/e2e/`.
Check items off as you verify them manually in the demo app (`npm run dev`).

---

## 1. Terminal Lifecycle

- [ ] 1.1 Create terminal with default options — canvas appears in container
- [ ] 1.2 Create terminal with custom dimensions (132x43) — correct size
- [ ] 1.3 Create terminal with custom theme (amber) — correct colors applied
- [ ] 1.4 Create terminal with custom font settings — font applied
- [ ] 1.5 `term.open(container)` — canvas element present in DOM
- [ ] 1.6 `term.element` returns the container after open
- [ ] 1.7 Dispose terminal — canvas removed, events unsubscribed
- [ ] 1.8 `term.element` returns null after dispose
- [ ] 1.9 Calling `open()` after `dispose()` throws error

## 2. Text Output

- [ ] 2.1 Write plain ASCII text — characters appear at cursor position
- [ ] 2.2 Write text that wraps at column 80 — continues on next line
- [ ] 2.3 Write text that scrolls past row 24 — screen scrolls up
- [ ] 2.4 Write CR+LF — cursor moves to start of next line
- [ ] 2.5 Accept `Uint8Array` input — renders correctly
- [ ] 2.6 Multiple `write()` calls — text appends correctly
- [ ] 2.7 Write after dispose — no error thrown (silently ignored)

## 3. Escape Sequences — Cursor Movement

- [ ] 3.1 CUP (`ESC [ H`) — cursor moves to home position
- [ ] 3.2 CUP (`ESC [ 5;10 H`) — cursor moves to row 5, col 10
- [ ] 3.3 CUU (`ESC [ A`) — cursor moves up 1 line
- [ ] 3.4 CUD (`ESC [ B`) — cursor moves down 1 line
- [ ] 3.5 CUF (`ESC [ C`) — cursor moves forward 1 column
- [ ] 3.6 CUB (`ESC [ D`) — cursor moves backward 1 column
- [ ] 3.7 DECSC/DECRC (`ESC 7` / `ESC 8`) — save and restore cursor position
- [ ] 3.8 IND (`ESC D`) — scroll down if at bottom margin
- [ ] 3.9 RI (`ESC M`) — reverse index / scroll up if at top margin

## 4. Escape Sequences — Attributes (SGR)

- [ ] 4.1 SGR bold (`ESC [1m`) — text renders bold
- [ ] 4.2 SGR dim (`ESC [2m`) — text renders dim
- [ ] 4.3 SGR italic (`ESC [3m`) — text renders italic
- [ ] 4.4 SGR underline (`ESC [4m`) — text has underline
- [ ] 4.5 SGR blink (`ESC [5m`) — text blinks
- [ ] 4.6 SGR reverse (`ESC [7m`) — foreground/background swapped
- [ ] 4.7 SGR hidden (`ESC [8m`) — text not visible
- [ ] 4.8 SGR strikethrough (`ESC [9m`) — text has strikethrough
- [ ] 4.9 SGR reset (`ESC [0m`) — all attributes cleared
- [ ] 4.10 SGR reset individual attributes (22m, 23m, 24m, etc.)

## 5. Colors

- [ ] 5.1 Basic 8 foreground colors (`ESC [30-37m`) — correct colors
- [ ] 5.2 Basic 8 background colors (`ESC [40-47m`) — correct colors
- [ ] 5.3 Bright foreground colors (`ESC [90-97m`) — correct colors
- [ ] 5.4 256-color palette (`ESC [38;5;Nm`) — correct indexed color
- [ ] 5.5 24-bit RGB foreground (`ESC [38;2;R;G;Bm`) — correct RGB color
- [ ] 5.6 24-bit RGB background (`ESC [48;2;R;G;Bm`) — correct RGB color
- [ ] 5.7 Default foreground (`ESC [39m`) — reset to theme default
- [ ] 5.8 Default background (`ESC [49m`) — reset to theme default

## 6. Screen Operations

- [ ] 6.1 Clear screen (`ESC [2J`) — entire screen cleared
- [ ] 6.2 Clear screen + home (`ESC [2J ESC [H`) — screen cleared, cursor at 0,0
- [ ] 6.3 Erase to end of line (`ESC [K`) — rest of line cleared
- [ ] 6.4 Erase entire line (`ESC [2K`) — full line cleared
- [ ] 6.5 Insert line (`ESC [L`) — new blank line inserted
- [ ] 6.6 Delete line (`ESC [M`) — current line deleted, below scrolls up
- [ ] 6.7 Insert character (`ESC [@`) — character slot inserted
- [ ] 6.8 Delete character (`ESC [P`) — character deleted, rest shifts left

## 7. Scroll Regions

- [ ] 7.1 Set scroll region (`ESC [5;20r`) — scrolling confined to region
- [ ] 7.2 Reset scroll region (`ESC [r`) — full screen scrolling
- [ ] 7.3 Scroll within region — text above/below region unchanged
- [ ] 7.4 Cursor movement respects scroll region boundaries

## 8. DEC Private Modes

- [ ] 8.1 DECCKM (mode 1) — cursor keys send application/normal sequences
- [ ] 8.2 DECAWM (mode 7) — auto-wrap on/off
- [ ] 8.3 DECTCEM (mode 25) — cursor visible/hidden
- [ ] 8.4 Alternate buffer (mode 1049) — switch to/from alternate screen

## 9. Terminal Resize

- [ ] 9.1 `resize(132, 43)` — cols and rows update
- [ ] 9.2 Canvas dimensions change on resize
- [ ] 9.3 Buffer content preserved after resize
- [ ] 9.4 Emulator buffer dimensions match

## 10. Keyboard Input

- [ ] 10.1 Enter key — sends `\r`
- [ ] 10.2 Escape key — sends `\x1b`
- [ ] 10.3 Arrow keys — send `ESC [A/B/C/D`
- [ ] 10.4 Function keys F1-F4 — send `ESC OP/OQ/OR/OS`
- [ ] 10.5 Function keys F5-F12 — send correct `ESC [nn~` sequences
- [ ] 10.6 Ctrl+C — sends `\x03`
- [ ] 10.7 Backspace — sends `\x7F`
- [ ] 10.8 Tab — sends `\t`
- [ ] 10.9 Home/End — send `ESC [H` / `ESC [F`
- [ ] 10.10 PageUp/PageDown — send `ESC [5~` / `ESC [6~`
- [ ] 10.11 Insert/Delete — send `ESC [2~` / `ESC [3~`
- [ ] 10.12 Regular characters via keypress — send character directly
- [ ] 10.13 `onKey` callback receives `domEvent` property
- [ ] 10.14 `onKey` subscription can be disposed

## 11. Emulator Switching

- [ ] 11.1 Default emulator is VT100
- [ ] 11.2 Switch to TDV2215 — emulator type updates
- [ ] 11.3 Switch to TDV2200 — emulator type updates
- [ ] 11.4 Switch back to VT100 — emulator type updates
- [ ] 11.5 Same-type switch is no-op (same instance)
- [ ] 11.6 Write works after switching emulators
- [ ] 11.7 `onData` event fires after switching (for DA responses)
- [ ] 11.8 Initial emulator type from options works

## 12. Canvas Renderer

- [ ] 12.1 Canvas element created in container
- [ ] 12.2 Canvas CSS fills container (100% width/height)
- [ ] 12.3 Canvas has class `retroterm-canvas`
- [ ] 12.4 Canvas is focusable (tabIndex=0)
- [ ] 12.5 Canvas native dimensions match font metrics
- [ ] 12.6 Render without errors
- [ ] 12.7 Resize updates canvas dimensions
- [ ] 12.8 Theme change applies without errors
- [ ] 12.9 Canvas removed from DOM on dispose
- [ ] 12.10 Dirty-row rendering works correctly

## 13. TDV Features

- [ ] 13.1 Protected areas (SPA/EPA) — cursor skips protected cells
- [ ] 13.2 Work areas (NDDWA) — operations confined to work area
- [ ] 13.3 Message LEDs — LED indicators change state
- [ ] 13.4 Character sets (all 10) — correct glyphs rendered
- [ ] 13.5 Character set manager — SS2/SS3 single shift works
- [ ] 13.6 ISO 646 variants — national characters displayed correctly
- [ ] 13.7 Rectangle operations — set/save/restore rectangle
- [ ] 13.8 Push keys — programmable key definition and recall
- [ ] 13.9 DCS sequences — handled correctly
- [ ] 13.10 2115 compatibility mode — mode switching works

## 14. TDV Query/Response

- [ ] 14.1 Primary DA (`ESC [c`) — correct device attributes returned
- [ ] 14.2 Secondary DA (`ESC [>c`) — correct firmware/model ID returned
- [ ] 14.3 DSR (`ESC [5n`) — device status OK response
- [ ] 14.4 CPR (`ESC [6n`) — correct cursor position report
- [ ] 14.5 DECID (`ESC Z`) — correct terminal ID response

## 15. Virtual Keyboard

- [ ] 15.1 SVG keyboard renders in container
- [ ] 15.2 Full layout renders all ~90 keys
- [ ] 15.3 Compact layout shows only special keys
- [ ] 15.4 ESC key click sends `\x1b`
- [ ] 15.5 PUSH keys identified as programmable (no fixed sequence)
- [ ] 15.6 Key visual feedback on press/release
- [ ] 15.7 Terminal dropdown appears with multiple terminals
- [ ] 15.8 Terminal selection routes keys to correct terminal
- [ ] 15.9 Language switching updates key labels
- [ ] 15.10 LED state updates without errors
- [ ] 15.11 Show/hide/toggle visibility works
- [ ] 15.12 Dispose cleans up DOM

## 16. Bitmap Fonts (TDV)

- [ ] 16.1 FontTDV2200 has correct glyph count (1018+ glyphs)
- [ ] 16.2 FontTDV2215 has 7 character set variants
- [ ] 16.3 `getFontBits()` returns valid glyph data
- [ ] 16.4 Bitmap rendering produces visible pixels
- [ ] 16.5 Character set switching selects correct glyphs

## 17. Themes

- [ ] 17.1 Green theme — green text on black background
- [ ] 17.2 Amber theme — amber text on black background
- [ ] 17.3 White theme — white text on black background
- [ ] 17.4 Blue theme — blue text on black background
- [ ] 17.5 Paperwhite theme — dark text on light background
- [ ] 17.6 Theme change applies immediately

## 18. Bell

- [ ] 18.1 BEL character (0x07) triggers bell event
- [ ] 18.2 Bell sound plays (Web Audio API)
- [ ] 18.3 Rate limiting prevents audio spam

---

## Test Mapping

| Section | Automated Test File |
|---------|-------------------|
| 1. Lifecycle | `test/ui/terminal-mount.test.ts` |
| 2. Text Output | `test/ui/terminal-write.test.ts` |
| 3-8. Escape Sequences | `test/unit/emulators/emulator-base.test.ts` |
| 9. Resize | `test/ui/terminal-resize.test.ts` |
| 10. Keyboard | `test/ui/terminal-input.test.ts` |
| 11. Emulator Switch | `test/ui/terminal-emulator-switch.test.ts` |
| 12. Canvas Renderer | `test/ui/canvas-renderer.test.ts` |
| 13. TDV Features | `test/unit/tdv-components/*.test.ts` |
| 14. TDV Query/Response | `test/unit/emulators/tdv-query-response.test.ts` |
| 15. Virtual Keyboard | `test/ui/virtual-keyboard*.test.ts` |
| 16. Bitmap Fonts | `test/unit/fonts/*.test.ts` |
| 17. Themes | `test/ui/terminal-mount.test.ts` (custom theme test) |
| 18. Bell | `test/unit/features/*.test.ts` |
