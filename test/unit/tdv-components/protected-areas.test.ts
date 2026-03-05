import { describe, it, expect } from 'vitest';
import { TDVProtectedAreas } from '../../../src/emulators/tdv/components/TDVProtectedAreas';

describe('TDVProtectedAreas', () => {
  it('should initialize with no protected areas', () => {
    const pa = new TDVProtectedAreas(80, 24);
    expect(pa.isProtected(0, 0)).toBe(false);
    expect(pa.isProtected(23, 79)).toBe(false);
  });

  it('should set a single cell as protected', () => {
    const pa = new TDVProtectedAreas(80, 24);
    pa.setProtectedArea(5, 10);
    expect(pa.isProtected(5, 10)).toBe(true);
    expect(pa.isProtected(5, 11)).toBe(false);
    expect(pa.isProtected(4, 10)).toBe(false);
  });

  it('should clear a single protected cell', () => {
    const pa = new TDVProtectedAreas(80, 24);
    pa.setProtectedArea(0, 5);
    expect(pa.isProtected(0, 5)).toBe(true);
    pa.clearProtectedArea(0, 5);
    expect(pa.isProtected(0, 5)).toBe(false);
  });

  it('should set a protected rectangle', () => {
    const pa = new TDVProtectedAreas(80, 24);
    pa.setProtectedRectangle(2, 5, 4, 10);
    for (let row = 2; row <= 4; row++) {
      for (let col = 5; col <= 10; col++) {
        expect(pa.isProtected(row, col)).toBe(true);
      }
    }
    expect(pa.isProtected(1, 5)).toBe(false);
    expect(pa.isProtected(5, 5)).toBe(false);
  });

  it('should clear a protected rectangle', () => {
    const pa = new TDVProtectedAreas(80, 24);
    pa.setProtectedRectangle(0, 0, 3, 10);
    pa.clearProtectedRectangle(1, 2, 2, 5);
    expect(pa.isProtected(0, 5)).toBe(true);
    expect(pa.isProtected(1, 3)).toBe(false);
    expect(pa.isProtected(3, 5)).toBe(true);
  });

  it('should clamp rectangle out-of-bounds coordinates', () => {
    const pa = new TDVProtectedAreas(80, 24);
    pa.setProtectedRectangle(0, 0, 0, 100); // right 100 > width 80
    expect(pa.isProtected(0, 79)).toBe(true);
  });

  it('should ignore out-of-bounds single cell positions', () => {
    const pa = new TDVProtectedAreas(80, 24);
    pa.setProtectedArea(30, 0); // row 30 > height 24
    pa.setProtectedArea(0, 100); // col 100 > width 80
    // Should not throw, and positions remain unprotected
    expect(pa.isProtected(0, 0)).toBe(false);
  });

  it('should get all protected positions', () => {
    const pa = new TDVProtectedAreas(80, 24);
    pa.setProtectedArea(0, 0);
    pa.setProtectedArea(0, 1);
    pa.setProtectedArea(0, 2);
    const positions = pa.getProtectedPositions();
    expect(positions.length).toBe(3);
  });

  it('should clear all protected areas', () => {
    const pa = new TDVProtectedAreas(80, 24);
    pa.setProtectedRectangle(0, 0, 23, 79);
    expect(pa.isProtected(10, 40)).toBe(true);
    pa.clear();
    expect(pa.isProtected(10, 40)).toBe(false);
  });
});
