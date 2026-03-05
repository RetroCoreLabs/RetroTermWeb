import { describe, it, expect, beforeEach } from 'vitest';
import { TerminalEmulatorBase } from '../../../src/emulators/TerminalEmulatorBase';
import { createEmulator, writeToEmulator } from '../../helpers/test-emulator';
import { assertRowText, assertCursorAt, assertRowEmpty, assertCellAttribute, assertCellForeground } from '../../helpers/buffer-assertions';
import { CharacterAttributes } from '../../../src/buffer/CharacterAttributes';
import * as seq from '../../helpers/test-sequences';

describe('Scrolling', () => {
  let emu: TerminalEmulatorBase;

  beforeEach(() => {
    emu = createEmulator(80, 24);
  });

  // ─── Helper: fill all 24 rows with labelled text ───

  function fillScreen(): void {
    for (let i = 0; i < 24; i++) {
      writeToEmulator(emu, seq.cup(i + 1, 1) + `Line ${i + 1}`);
    }
  }

  function fillScreenRows(start: number, end: number): void {
    for (let i = start; i <= end; i++) {
      writeToEmulator(emu, seq.cup(i + 1, 1) + `Line ${i + 1}`);
    }
  }

  // ─── 1. Full-screen scroll up / down ───

  describe('full-screen scroll up (writing past bottom)', () => {
    it('should scroll the screen up when writing past the last row', () => {
      fillScreen();
      // Cursor is now on the last row after writing "Line 24".
      // Write a newline + new content, which should scroll everything up by 1.
      writeToEmulator(emu, seq.CR + seq.LF + 'Line 25');

      // "Line 1" should have scrolled off; row 0 now holds what was "Line 2"
      assertRowText(emu.buffer, 0, 'Line 2');
      assertRowText(emu.buffer, 22, 'Line 24');
      assertRowText(emu.buffer, 23, 'Line 25');
    });

    it('should scroll multiple lines when writing several past the bottom', () => {
      fillScreen();
      // Write 3 more lines past the end
      writeToEmulator(emu, seq.CR + seq.LF + 'Line 25');
      writeToEmulator(emu, seq.CR + seq.LF + 'Line 26');
      writeToEmulator(emu, seq.CR + seq.LF + 'Line 27');

      // Lines 1-3 should have scrolled off
      assertRowText(emu.buffer, 0, 'Line 4');
      assertRowText(emu.buffer, 21, 'Line 25');
      assertRowText(emu.buffer, 22, 'Line 26');
      assertRowText(emu.buffer, 23, 'Line 27');
    });

    it('should leave cursor on the last row after scroll', () => {
      fillScreen();
      writeToEmulator(emu, seq.CR + seq.LF + 'X');
      assertCursorAt(emu, 23, 1);
    });
  });

  describe('full-screen scroll down via CSI T (SD)', () => {
    it('should scroll content down by one line, inserting blank at top', () => {
      fillScreen();
      // CSI 1 T  = Scroll Down 1
      writeToEmulator(emu, '\x1b[1T');

      assertRowEmpty(emu.buffer, 0);
      assertRowText(emu.buffer, 1, 'Line 1');
      assertRowText(emu.buffer, 23, 'Line 23');
      // "Line 24" is pushed off the bottom
    });
  });

  describe('full-screen scroll up via CSI S (SU)', () => {
    it('should scroll content up by one line, inserting blank at bottom', () => {
      fillScreen();
      // CSI 1 S  = Scroll Up 1
      writeToEmulator(emu, '\x1b[1S');

      assertRowText(emu.buffer, 0, 'Line 2');
      assertRowText(emu.buffer, 22, 'Line 24');
      assertRowEmpty(emu.buffer, 23);
    });
  });

  // ─── 2. Scroll regions (DECSTBM) ───

  describe('scroll regions (DECSTBM)', () => {
    it('should set scroll region and confine scrolling to that region', () => {
      fillScreen();
      // Set scroll region to rows 5-15 (1-indexed)
      writeToEmulator(emu, seq.decstbm(5, 15));
      // DECSTBM homes the cursor (row 0, col 0)
      assertCursorAt(emu, 0, 0);

      // Move cursor to bottom of region (row 14, 0-indexed) and write a LF
      writeToEmulator(emu, seq.cup(15, 1) + seq.LF);

      // Row 4 (0-indexed, first row of region) should now have what was row 5's content
      assertRowText(emu.buffer, 4, 'Line 6');
      // Bottom of region (row 14) should be blank after scroll
      assertRowEmpty(emu.buffer, 14);
    });

    it('should not affect content above the scroll region', () => {
      fillScreen();
      writeToEmulator(emu, seq.decstbm(5, 15));

      // Move to bottom of region and scroll by writing past it
      writeToEmulator(emu, seq.cup(15, 1) + seq.LF);

      // Rows 0-3 (above region) should remain unchanged
      assertRowText(emu.buffer, 0, 'Line 1');
      assertRowText(emu.buffer, 1, 'Line 2');
      assertRowText(emu.buffer, 2, 'Line 3');
      assertRowText(emu.buffer, 3, 'Line 4');
    });

    it('should not affect content below the scroll region', () => {
      fillScreen();
      writeToEmulator(emu, seq.decstbm(5, 15));

      // Move to bottom of region and scroll by writing past it
      writeToEmulator(emu, seq.cup(15, 1) + seq.LF);

      // Rows 15-23 (below region) should remain unchanged
      assertRowText(emu.buffer, 15, 'Line 16');
      assertRowText(emu.buffer, 16, 'Line 17');
      assertRowText(emu.buffer, 22, 'Line 23');
      assertRowText(emu.buffer, 23, 'Line 24');
    });

    it('should scroll region content correctly when multiple lines overflow', () => {
      fillScreen();
      writeToEmulator(emu, seq.decstbm(5, 15));

      // Move to last row in region, then write 3 LFs to scroll region up 3 times
      writeToEmulator(emu, seq.cup(15, 1));
      writeToEmulator(emu, seq.LF + seq.LF + seq.LF);

      // The top of the region should now hold what was 3 rows down
      assertRowText(emu.buffer, 4, 'Line 8');
      // Bottom 3 rows of the region should be empty
      assertRowEmpty(emu.buffer, 12);
      assertRowEmpty(emu.buffer, 13);
      assertRowEmpty(emu.buffer, 14);
    });

    it('should reset to full-screen scrolling with ESC[r (no parameters)', () => {
      fillScreen();
      writeToEmulator(emu, seq.decstbm(5, 15));
      // Reset scroll region
      writeToEmulator(emu, '\x1b[r');

      // After reset, cursor should be at home
      assertCursorAt(emu, 0, 0);

      // Clear the screen and fill fresh to verify full-screen scrolling restored
      writeToEmulator(emu, seq.ed(2));
      for (let i = 0; i < 24; i++) {
        writeToEmulator(emu, seq.cup(i + 1, 1) + `Row ${i + 1}`);
      }
      writeToEmulator(emu, seq.CR + seq.LF + 'Row 25');

      // Should have scrolled entire screen
      assertRowText(emu.buffer, 0, 'Row 2');
      assertRowText(emu.buffer, 23, 'Row 25');
    });

    it('should fill and scroll within a narrow region (2-row region)', () => {
      fillScreen();
      // Very small scroll region: rows 10-11 (1-indexed), 0-indexed 9-10
      writeToEmulator(emu, seq.decstbm(10, 11));

      // Position at bottom of region, clear line, write new content, trigger scroll
      writeToEmulator(emu, seq.cup(11, 1) + seq.el(2) + 'New10');
      writeToEmulator(emu, seq.CR + seq.LF + 'New11');

      // Row 9 should now have what we wrote on the old row 10
      assertRowText(emu.buffer, 9, 'New10');
      assertRowText(emu.buffer, 10, 'New11');

      // Rows outside should still be original
      assertRowText(emu.buffer, 8, 'Line 9');
      assertRowText(emu.buffer, 11, 'Line 12');
    });
  });

  // ─── 3. Reverse Index (ESC M) at top margin ───

  describe('reverse index (RI / ESC M)', () => {
    it('should move cursor up without scrolling when not at top margin', () => {
      writeToEmulator(emu, seq.cup(5, 1) + 'Hello');
      writeToEmulator(emu, seq.RI);

      assertCursorAt(emu, 3, 5);
    });

    it('should scroll region down when cursor is at the top margin (full screen)', () => {
      fillScreen();
      // Move cursor to row 0 (top of screen)
      writeToEmulator(emu, seq.cup(1, 1));
      writeToEmulator(emu, seq.RI);

      // A blank line should appear at the top; everything shifts down
      assertRowEmpty(emu.buffer, 0);
      assertRowText(emu.buffer, 1, 'Line 1');
      assertRowText(emu.buffer, 23, 'Line 23');
      // "Line 24" is pushed off the bottom
    });

    it('should scroll region down when cursor is at top margin of scroll region', () => {
      fillScreen();
      writeToEmulator(emu, seq.decstbm(5, 15));

      // Move cursor to the top of the region (row 5, 1-indexed = row 4, 0-indexed)
      writeToEmulator(emu, seq.cup(5, 1));
      writeToEmulator(emu, seq.RI);

      // Top of region should now be blank
      assertRowEmpty(emu.buffer, 4);
      // Content shifted down within region
      assertRowText(emu.buffer, 5, 'Line 5');
      assertRowText(emu.buffer, 14, 'Line 14');

      // Content above region unchanged
      assertRowText(emu.buffer, 3, 'Line 4');
      // Content below region unchanged
      assertRowText(emu.buffer, 15, 'Line 16');
    });
  });

  // ─── 4. Index (ESC D) at bottom margin ───

  describe('index (IND / ESC D)', () => {
    it('should move cursor down without scrolling when not at bottom margin', () => {
      writeToEmulator(emu, seq.cup(5, 10));
      writeToEmulator(emu, seq.IND);

      assertCursorAt(emu, 5, 9); // row 4 -> row 5 (0-indexed), col stays at 9
    });

    it('should scroll up when cursor is at the bottom margin (full screen)', () => {
      fillScreen();
      // Move cursor to the last row
      writeToEmulator(emu, seq.cup(24, 1));
      writeToEmulator(emu, seq.IND);

      // "Line 1" scrolled off; row 0 now has "Line 2"
      assertRowText(emu.buffer, 0, 'Line 2');
      assertRowText(emu.buffer, 22, 'Line 24');
      assertRowEmpty(emu.buffer, 23);
    });

    it('should scroll up within scroll region when cursor is at bottom margin', () => {
      fillScreen();
      writeToEmulator(emu, seq.decstbm(5, 15));

      // Move cursor to bottom of region (row 15, 1-indexed = row 14, 0-indexed)
      writeToEmulator(emu, seq.cup(15, 1));
      writeToEmulator(emu, seq.IND);

      // Top of region shifts up
      assertRowText(emu.buffer, 4, 'Line 6');
      // Bottom of region should be blank
      assertRowEmpty(emu.buffer, 14);

      // Rows outside region stay the same
      assertRowText(emu.buffer, 3, 'Line 4');
      assertRowText(emu.buffer, 15, 'Line 16');
    });
  });

  // ─── 5. Content preservation during region scrolling ───

  describe('content preservation outside scroll region', () => {
    it('should preserve all rows above and below during repeated scrolls', () => {
      fillScreen();
      writeToEmulator(emu, seq.decstbm(10, 20));

      // Scroll the region 5 times using IND at the bottom of the region
      for (let i = 0; i < 5; i++) {
        writeToEmulator(emu, seq.cup(20, 1) + seq.IND);
      }

      // Rows above (0-8) should be untouched
      for (let i = 0; i < 9; i++) {
        assertRowText(emu.buffer, i, `Line ${i + 1}`);
      }

      // Rows below (20-23) should be untouched
      assertRowText(emu.buffer, 20, 'Line 21');
      assertRowText(emu.buffer, 21, 'Line 22');
      assertRowText(emu.buffer, 22, 'Line 23');
      assertRowText(emu.buffer, 23, 'Line 24');
    });

    it('should preserve all rows during repeated reverse scrolls', () => {
      fillScreen();
      writeToEmulator(emu, seq.decstbm(10, 20));

      // Scroll the region down 5 times using RI at the top of the region
      for (let i = 0; i < 5; i++) {
        writeToEmulator(emu, seq.cup(10, 1) + seq.RI);
      }

      // Rows above (0-8) should be untouched
      for (let i = 0; i < 9; i++) {
        assertRowText(emu.buffer, i, `Line ${i + 1}`);
      }

      // Rows below (20-23) should be untouched
      assertRowText(emu.buffer, 20, 'Line 21');
      assertRowText(emu.buffer, 21, 'Line 22');
      assertRowText(emu.buffer, 22, 'Line 23');
      assertRowText(emu.buffer, 23, 'Line 24');
    });

    it('should shift region content correctly on forward scroll', () => {
      fillScreen();
      writeToEmulator(emu, seq.decstbm(10, 20));

      // Scroll up once from the bottom of the region
      writeToEmulator(emu, seq.cup(20, 1) + seq.IND);

      // Region (rows 9-19): original Lines 10-20, scrolled up by 1
      assertRowText(emu.buffer, 9, 'Line 11');
      assertRowText(emu.buffer, 18, 'Line 20');
      assertRowEmpty(emu.buffer, 19);
    });
  });

  // ─── 6. Margin wrapping behavior ───

  describe('margin wrapping behavior', () => {
    it('should wrap text and scroll when reaching bottom margin in auto-wrap mode', () => {
      // Enable auto-wrap (it's on by default, but be explicit)
      writeToEmulator(emu, seq.decset(7));
      writeToEmulator(emu, seq.decstbm(1, 5));

      // Fill a 5-row region with long lines, forcing wraps and scrolls
      // Position at top of region
      writeToEmulator(emu, seq.cup(1, 1));

      // Write 5 lines plus one more to trigger scroll
      for (let i = 1; i <= 5; i++) {
        writeToEmulator(emu, `R${i}` + seq.CR + seq.LF);
      }
      // The 6th LF should have scrolled the region
      writeToEmulator(emu, 'R6');

      // Row 0 should now have R2 (R1 scrolled off)
      assertRowText(emu.buffer, 0, 'R2');
      assertRowText(emu.buffer, 4, 'R6');
    });

    it('should not scroll outside region even with continuous text output', () => {
      fillScreen();
      writeToEmulator(emu, seq.decstbm(3, 7));

      // Write text that exceeds the region, triggering multiple scrolls
      writeToEmulator(emu, seq.cup(7, 1));
      for (let i = 0; i < 10; i++) {
        writeToEmulator(emu, seq.CR + seq.LF + `Extra ${i}`);
      }

      // Rows outside region should be unchanged
      assertRowText(emu.buffer, 0, 'Line 1');
      assertRowText(emu.buffer, 1, 'Line 2');
      assertRowText(emu.buffer, 7, 'Line 8');
      assertRowText(emu.buffer, 23, 'Line 24');
    });
  });

  // ─── 7. Scrolling preserves cell attributes ───

  describe('scrolling preserves attributes', () => {
    it('should preserve bold attribute when line scrolls up', () => {
      // Write bold text on each row
      for (let i = 0; i < 24; i++) {
        writeToEmulator(emu, seq.cup(i + 1, 1) + seq.sgr(1) + `Bold ${i + 1}` + seq.sgr(0));
      }

      // Scroll once
      writeToEmulator(emu, seq.cup(24, 1) + seq.CR + seq.LF + 'Normal');

      // Row 0 now holds what was "Bold 2" — should still be bold
      assertCellAttribute(emu.buffer, 0, 0, CharacterAttributes.Bold);
      assertCellAttribute(emu.buffer, 0, 1, CharacterAttributes.Bold);

      // The new line at row 23 should NOT be bold (we reset SGR)
      const cell = emu.buffer.getCell(23, 0);
      expect(cell.codepoint).toBe(0x4E); // 'N'
      expect((cell.attributes & CharacterAttributes.Bold)).toBe(0);
    });

    it('should preserve foreground color when scrolling within a region', () => {
      writeToEmulator(emu, seq.decstbm(1, 5));

      // Write colored text in the region
      for (let i = 0; i < 5; i++) {
        // SGR 31 = red foreground (index 1)
        writeToEmulator(emu, seq.cup(i + 1, 1) + seq.sgr(31) + `Red ${i + 1}` + seq.sgr(0));
      }

      // Scroll region up once
      writeToEmulator(emu, seq.cup(5, 1) + seq.LF);

      // Row 0 now holds what was "Red 2" — should still have red foreground
      assertCellForeground(emu.buffer, 0, 0, 1); // Red = index 1
      assertCellForeground(emu.buffer, 0, 1, 1);
    });

    it('should preserve underline attribute during reverse scroll (RI)', () => {
      // Write underlined text on row 0
      writeToEmulator(emu, seq.cup(1, 1) + seq.sgr(4) + 'Underlined' + seq.sgr(0));

      // Reverse index at row 0 pushes content down
      writeToEmulator(emu, seq.cup(1, 1) + seq.RI);

      // Row 1 should now have the underlined text
      assertCellAttribute(emu.buffer, 1, 0, CharacterAttributes.Underline);
      assertCellAttribute(emu.buffer, 1, 5, CharacterAttributes.Underline);

      // Row 0 should be blank (newly inserted)
      assertRowEmpty(emu.buffer, 0);
    });

    it('should clear attributes on the newly blank line after scroll up', () => {
      // Write bold text on every row including the last
      for (let i = 0; i < 24; i++) {
        writeToEmulator(emu, seq.cup(i + 1, 1) + seq.sgr(1) + `B${i}` + seq.sgr(0));
      }

      // Use SU (CSI S) to scroll up without moving cursor
      writeToEmulator(emu, '\x1b[1S');

      // The new blank row at the bottom should have no attributes
      const cell = emu.buffer.getCell(23, 0);
      expect(cell.codepoint === 0 || cell.codepoint === 0x20).toBe(true);
      expect(cell.attributes).toBe(CharacterAttributes.None);
    });

    it('should clear attributes on the newly blank line after scroll down', () => {
      // Write italic text on every row
      for (let i = 0; i < 24; i++) {
        writeToEmulator(emu, seq.cup(i + 1, 1) + seq.sgr(3) + `I${i}` + seq.sgr(0));
      }

      // Use SD (CSI T) to scroll down
      writeToEmulator(emu, '\x1b[1T');

      // The new blank row at the top should have no attributes
      const cell = emu.buffer.getCell(0, 0);
      expect(cell.codepoint === 0 || cell.codepoint === 0x20).toBe(true);
      expect(cell.attributes).toBe(CharacterAttributes.None);
    });
  });
});
