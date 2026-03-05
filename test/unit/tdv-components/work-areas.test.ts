import { describe, it, expect } from 'vitest';
import { TDVWorkAreas } from '../../../src/emulators/tdv/components/TDVWorkAreas';

describe('TDVWorkAreas', () => {
  it('should default to full screen', () => {
    const wa = new TDVWorkAreas(80, 24);
    const area = wa.getCurrentWorkArea();
    expect(area.left).toBe(0);
    expect(area.top).toBe(0);
    expect(area.right).toBe(79);
    expect(area.bottom).toBe(23);
  });

  it('should define a work area', () => {
    const wa = new TDVWorkAreas(80, 24);
    wa.defineWorkArea(5, 3, 40, 20);
    const area = wa.getCurrentWorkArea();
    expect(area.left).toBe(5);
    expect(area.top).toBe(3);
    expect(area.right).toBe(40);
    expect(area.bottom).toBe(20);
  });

  it('should normalize coordinates (swap if inverted)', () => {
    const wa = new TDVWorkAreas(80, 24);
    wa.defineWorkArea(40, 20, 5, 3); // Reversed
    const area = wa.getCurrentWorkArea();
    expect(area.left).toBe(5);
    expect(area.top).toBe(3);
    expect(area.right).toBe(40);
    expect(area.bottom).toBe(20);
  });

  it('should clamp to screen bounds', () => {
    const wa = new TDVWorkAreas(80, 24);
    wa.defineWorkArea(0, 0, 100, 50); // Exceeds screen
    const area = wa.getCurrentWorkArea();
    expect(area.right).toBe(79);
    expect(area.bottom).toBe(23);
  });

  it('should check if position is in work area (exclusive boundaries)', () => {
    const wa = new TDVWorkAreas(80, 24);
    wa.defineWorkArea(5, 3, 40, 20);
    // Inside
    expect(wa.isInWorkArea(10, 20)).toBe(true);
    // On boundary (exclusive)
    expect(wa.isInWorkArea(3, 20)).toBe(false); // top boundary
    expect(wa.isInWorkArea(20, 20)).toBe(false); // bottom boundary
    expect(wa.isInWorkArea(10, 5)).toBe(false);  // left boundary
    expect(wa.isInWorkArea(10, 40)).toBe(false); // right boundary
    // Outside
    expect(wa.isInWorkArea(2, 20)).toBe(false);
    expect(wa.isInWorkArea(21, 20)).toBe(false);
  });

  it('should get work area dimensions', () => {
    const wa = new TDVWorkAreas(80, 24);
    wa.defineWorkArea(5, 3, 40, 20);
    const dims = wa.getWorkAreaDimensions();
    expect(dims.width).toBe(36);  // 40 - 5 + 1
    expect(dims.height).toBe(18); // 20 - 3 + 1
  });

  it('should clear work area (revert to full screen)', () => {
    const wa = new TDVWorkAreas(80, 24);
    wa.defineWorkArea(5, 3, 40, 20);
    wa.clear();
    const area = wa.getCurrentWorkArea();
    expect(area.left).toBe(0);
    expect(area.top).toBe(0);
    expect(area.right).toBe(79);
    expect(area.bottom).toBe(23);
  });
});
