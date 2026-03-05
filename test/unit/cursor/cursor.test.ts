import { describe, it, expect, beforeEach } from 'vitest';
import { CursorState, CursorStyle } from '../../../src/emulators/CursorState';

describe('CursorState', () => {
  let cursor: CursorState;

  beforeEach(() => {
    cursor = new CursorState(24, 80);
  });

  describe('constructor', () => {
    it('should initialize at 0,0', () => {
      expect(cursor.row).toBe(0);
      expect(cursor.column).toBe(0);
    });

    it('should have correct dimensions', () => {
      expect(cursor.maxRows).toBe(24);
      expect(cursor.maxCols).toBe(80);
    });

    it('should default to Block style', () => {
      expect(cursor.style).toBe(CursorStyle.Block);
    });

    it('should default to visible', () => {
      expect(cursor.visible).toBe(true);
    });

    it('should default to autoWrap enabled', () => {
      expect(cursor.autoWrap).toBe(true);
    });
  });

  describe('clamping', () => {
    it('should clamp row to valid range', () => {
      cursor.row = -5;
      expect(cursor.row).toBe(0);
      cursor.row = 100;
      expect(cursor.row).toBe(23);
    });

    it('should clamp column to valid range', () => {
      cursor.column = -1;
      expect(cursor.column).toBe(0);
      cursor.column = 100;
      expect(cursor.column).toBe(79);
    });
  });

  describe('moveTo', () => {
    it('should move to position', () => {
      cursor.moveTo(5, 10);
      expect(cursor.row).toBe(5);
      expect(cursor.column).toBe(10);
    });

    it('should clamp to bounds', () => {
      cursor.moveTo(100, 100);
      expect(cursor.row).toBe(23);
      expect(cursor.column).toBe(79);
    });
  });

  describe('home', () => {
    it('should move to 0,0', () => {
      cursor.moveTo(10, 20);
      cursor.home();
      expect(cursor.row).toBe(0);
      expect(cursor.column).toBe(0);
    });
  });

  describe('moveUp', () => {
    it('should move up by count', () => {
      cursor.moveTo(5, 0);
      cursor.moveUp(3);
      expect(cursor.row).toBe(2);
    });

    it('should stop at row 0', () => {
      cursor.moveTo(2, 0);
      cursor.moveUp(10);
      expect(cursor.row).toBe(0);
    });

    it('should default to 1', () => {
      cursor.moveTo(5, 0);
      cursor.moveUp();
      expect(cursor.row).toBe(4);
    });
  });

  describe('moveDown', () => {
    it('should move down by count', () => {
      cursor.moveDown(5);
      expect(cursor.row).toBe(5);
    });

    it('should stop at bottom', () => {
      cursor.moveDown(100);
      expect(cursor.row).toBe(23);
    });
  });

  describe('moveForward', () => {
    it('should move forward by count', () => {
      cursor.moveForward(10);
      expect(cursor.column).toBe(10);
    });

    it('should stop at last column', () => {
      cursor.moveForward(100);
      expect(cursor.column).toBe(79);
    });
  });

  describe('moveBackward', () => {
    it('should move backward by count', () => {
      cursor.moveTo(0, 10);
      cursor.moveBackward(3);
      expect(cursor.column).toBe(7);
    });

    it('should stop at column 0', () => {
      cursor.moveTo(0, 5);
      cursor.moveBackward(10);
      expect(cursor.column).toBe(0);
    });
  });

  describe('carriageReturn', () => {
    it('should move to column 0', () => {
      cursor.moveTo(5, 40);
      cursor.carriageReturn();
      expect(cursor.column).toBe(0);
      expect(cursor.row).toBe(5);
    });
  });

  describe('advance', () => {
    it('should advance column by 1 in normal case', () => {
      cursor.moveTo(0, 0);
      const scrollNeeded = cursor.advance();
      expect(cursor.column).toBe(1);
      expect(scrollNeeded).toBe(false);
    });

    it('should set wrapPending at last column with autoWrap', () => {
      cursor.moveTo(0, 78);
      cursor.advance(); // move to 79
      expect(cursor.column).toBe(79);
      cursor.advance(); // at last column, sets wrapPending
      expect(cursor.wrapPending).toBe(true);
    });

    it('should wrap on next advance after wrapPending', () => {
      cursor.moveTo(0, 79);
      cursor.advance(); // sets wrapPending
      expect(cursor.wrapPending).toBe(true);
      const scrollNeeded = cursor.advance(); // wraps to next line
      expect(cursor.column).toBe(0);
      expect(cursor.row).toBe(1);
      expect(scrollNeeded).toBe(false);
    });

    it('should signal scroll needed when wrapping at last row', () => {
      cursor.moveTo(23, 79);
      cursor.advance(); // sets wrapPending
      const scrollNeeded = cursor.advance(); // wraps, at last row = needs scroll
      expect(scrollNeeded).toBe(true);
      expect(cursor.column).toBe(0);
    });

    it('should not wrap when autoWrap is off', () => {
      cursor.autoWrap = false;
      cursor.moveTo(0, 79);
      cursor.advance();
      expect(cursor.wrapPending).toBe(false);
      expect(cursor.column).toBe(79);
    });
  });

  describe('reverse', () => {
    it('should move back one column', () => {
      cursor.moveTo(0, 5);
      cursor.reverse();
      expect(cursor.column).toBe(4);
    });

    it('should stop at column 0 without reverseWrap', () => {
      cursor.moveTo(1, 0);
      cursor.reverse();
      expect(cursor.column).toBe(0);
      expect(cursor.row).toBe(1);
    });

    it('should wrap to previous line with reverseWrap', () => {
      cursor.reverseWrap = true;
      cursor.moveTo(1, 0);
      cursor.reverse();
      expect(cursor.column).toBe(79);
      expect(cursor.row).toBe(0);
    });
  });

  describe('save / restore', () => {
    it('should save and restore position', () => {
      cursor.moveTo(10, 20);
      cursor.style = CursorStyle.Underline;
      cursor.save();
      cursor.moveTo(5, 5);
      cursor.style = CursorStyle.Bar;
      cursor.restore();
      expect(cursor.row).toBe(10);
      expect(cursor.column).toBe(20);
      expect(cursor.style).toBe(CursorStyle.Underline);
    });

    it('should clamp restored position to bounds', () => {
      cursor.moveTo(20, 70);
      cursor.save();
      const small = cursor.withNewDimensions(10, 40);
      small.restore();
      expect(small.row).toBe(9);
      expect(small.column).toBe(39);
    });
  });

  describe('reset', () => {
    it('should reset all state to defaults', () => {
      cursor.moveTo(10, 20);
      cursor.style = CursorStyle.Bar;
      cursor.visible = false;
      cursor.autoWrap = false;
      cursor.reset();
      expect(cursor.row).toBe(0);
      expect(cursor.column).toBe(0);
      expect(cursor.style).toBe(CursorStyle.Block);
      expect(cursor.visible).toBe(true);
      expect(cursor.autoWrap).toBe(true);
    });
  });

  describe('withNewDimensions', () => {
    it('should create new cursor with updated bounds', () => {
      cursor.moveTo(5, 10);
      cursor.style = CursorStyle.Bar;
      const resized = cursor.withNewDimensions(10, 40);
      expect(resized.maxRows).toBe(10);
      expect(resized.maxCols).toBe(40);
      expect(resized.row).toBe(5);
      expect(resized.column).toBe(10);
      expect(resized.style).toBe(CursorStyle.Bar);
    });

    it('should clamp position to new bounds', () => {
      cursor.moveTo(20, 70);
      const small = cursor.withNewDimensions(10, 40);
      expect(small.row).toBe(9);
      expect(small.column).toBe(39);
    });
  });

  describe('edge queries', () => {
    it('should report atLastColumn', () => {
      cursor.moveTo(0, 79);
      expect(cursor.atLastColumn).toBe(true);
      cursor.moveTo(0, 78);
      expect(cursor.atLastColumn).toBe(false);
    });

    it('should report atFirstColumn', () => {
      expect(cursor.atFirstColumn).toBe(true);
      cursor.moveTo(0, 1);
      expect(cursor.atFirstColumn).toBe(false);
    });

    it('should report atLastRow', () => {
      cursor.moveTo(23, 0);
      expect(cursor.atLastRow).toBe(true);
    });

    it('should report atFirstRow', () => {
      expect(cursor.atFirstRow).toBe(true);
      cursor.moveTo(1, 0);
      expect(cursor.atFirstRow).toBe(false);
    });
  });
});
