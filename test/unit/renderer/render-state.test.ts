import { describe, it, expect } from 'vitest';
import { RenderState } from '../../../src/renderer/RenderState';

describe('RenderState', () => {
  it('should initialize with all rows dirty', () => {
    const state = new RenderState(80, 24);
    expect(state.isFullDirty).toBe(true);
    expect(state.isCursorDirty).toBe(true);
    for (let i = 0; i < 24; i++) {
      expect(state.isRowDirty(i)).toBe(true);
    }
  });

  describe('clearDirty', () => {
    it('should clear all dirty flags', () => {
      const state = new RenderState(80, 24);
      state.clearDirty();
      expect(state.isFullDirty).toBe(false);
      expect(state.isCursorDirty).toBe(false);
      for (let i = 0; i < 24; i++) {
        expect(state.isRowDirty(i)).toBe(false);
      }
    });
  });

  describe('markRowDirty', () => {
    it('should mark a specific row as dirty', () => {
      const state = new RenderState(80, 24);
      state.clearDirty();
      state.markRowDirty(5);
      expect(state.isRowDirty(5)).toBe(true);
      expect(state.isRowDirty(4)).toBe(false);
      expect(state.isRowDirty(6)).toBe(false);
    });

    it('should handle out-of-bounds row gracefully', () => {
      const state = new RenderState(80, 24);
      state.clearDirty();
      state.markRowDirty(-1);
      state.markRowDirty(24);
      state.markRowDirty(100);
      // No rows should be dirty
      for (let i = 0; i < 24; i++) {
        expect(state.isRowDirty(i)).toBe(false);
      }
    });

    it('should mark multiple rows independently', () => {
      const state = new RenderState(80, 24);
      state.clearDirty();
      state.markRowDirty(0);
      state.markRowDirty(12);
      state.markRowDirty(23);
      expect(state.isRowDirty(0)).toBe(true);
      expect(state.isRowDirty(1)).toBe(false);
      expect(state.isRowDirty(12)).toBe(true);
      expect(state.isRowDirty(23)).toBe(true);
    });
  });

  describe('markAllDirty', () => {
    it('should mark all rows and set fullDirty flag', () => {
      const state = new RenderState(80, 24);
      state.clearDirty();
      state.markAllDirty();
      expect(state.isFullDirty).toBe(true);
      for (let i = 0; i < 24; i++) {
        expect(state.isRowDirty(i)).toBe(true);
      }
    });
  });

  describe('markCursorDirty', () => {
    it('should mark cursor as dirty', () => {
      const state = new RenderState(80, 24);
      state.clearDirty();
      expect(state.isCursorDirty).toBe(false);
      state.markCursorDirty();
      expect(state.isCursorDirty).toBe(true);
    });
  });

  describe('isRowDirty', () => {
    it('should return true for all rows when fullDirty', () => {
      const state = new RenderState(80, 24);
      // Initially fullDirty is true
      expect(state.isRowDirty(0)).toBe(true);
      expect(state.isRowDirty(23)).toBe(true);
    });

    it('should return false for out-of-bounds rows when not fullDirty', () => {
      const state = new RenderState(80, 24);
      state.clearDirty();
      expect(state.isRowDirty(-1)).toBe(false);
      expect(state.isRowDirty(24)).toBe(false);
    });

    it('should return true for out-of-bounds rows when fullDirty', () => {
      const state = new RenderState(80, 24);
      // fullDirty short-circuits bounds check
      expect(state.isRowDirty(-1)).toBe(true);
      expect(state.isRowDirty(100)).toBe(true);
    });
  });

  describe('resize', () => {
    it('should reset to all dirty after resize', () => {
      const state = new RenderState(80, 24);
      state.clearDirty();
      state.resize(132, 48);
      expect(state.isFullDirty).toBe(true);
      for (let i = 0; i < 48; i++) {
        expect(state.isRowDirty(i)).toBe(true);
      }
    });

    it('should handle smaller dimensions', () => {
      const state = new RenderState(80, 24);
      state.clearDirty();
      state.resize(40, 12);
      expect(state.isFullDirty).toBe(true);
      for (let i = 0; i < 12; i++) {
        expect(state.isRowDirty(i)).toBe(true);
      }
    });
  });

  describe('state transitions', () => {
    it('should support clear-then-dirty-then-clear cycle', () => {
      const state = new RenderState(80, 24);
      state.clearDirty();
      expect(state.isFullDirty).toBe(false);

      state.markRowDirty(10);
      expect(state.isRowDirty(10)).toBe(true);
      expect(state.isFullDirty).toBe(false);

      state.clearDirty();
      expect(state.isRowDirty(10)).toBe(false);

      state.markAllDirty();
      expect(state.isFullDirty).toBe(true);
      expect(state.isRowDirty(10)).toBe(true);
    });
  });
});
