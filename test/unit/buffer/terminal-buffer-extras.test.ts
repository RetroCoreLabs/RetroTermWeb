import { describe, it, expect } from 'vitest';
import { TerminalBuffer } from '../../../src/buffer/TerminalBuffer';
import { TerminalCell } from '../../../src/buffer/TerminalCell';

describe('TerminalBuffer — getSnapshot', () => {
  it('should return a deep copy of the screen', () => {
    const buf = new TerminalBuffer(10, 5);
    const cell = TerminalCell.empty();
    cell.codepoint = 0x41; // A
    buf.setCell(0, 0, cell);

    const snapshot = buf.getSnapshot();
    expect(snapshot.length).toBe(5);
    expect(snapshot[0].length).toBe(10);
    expect(snapshot[0][0].codepoint).toBe(0x41);
  });

  it('should be independent of the original buffer', () => {
    const buf = new TerminalBuffer(10, 5);
    const cell = TerminalCell.empty();
    cell.codepoint = 0x41; // A
    buf.setCell(0, 0, cell);

    const snapshot = buf.getSnapshot();

    // Modify the original buffer
    cell.codepoint = 0x42; // B
    buf.setCell(0, 0, cell);

    // Snapshot should still have 'A'
    expect(snapshot[0][0].codepoint).toBe(0x41);
    // Buffer should have 'B'
    expect(buf.getCell(0, 0).codepoint).toBe(0x42);
  });

  it('should snapshot the correct dimensions', () => {
    const buf = new TerminalBuffer(80, 24);
    const snapshot = buf.getSnapshot();
    expect(snapshot.length).toBe(24);
    for (let i = 0; i < 24; i++) {
      expect(snapshot[i].length).toBe(80);
    }
  });
});

describe('TerminalBuffer — switchToAlternateBuffer with clearOnSwitch', () => {
  it('should clear alternate buffer when clearOnSwitch is true (default)', () => {
    const buf = new TerminalBuffer(10, 5);
    const cell = TerminalCell.empty();
    cell.codepoint = 0x41;
    buf.setCell(0, 0, cell);

    buf.switchToAlternateBuffer();
    expect(buf.isUsingAlternateBuffer).toBe(true);
    // Alternate buffer should be clear
    expect(buf.getCell(0, 0).codepoint).toBe(0);
  });

  it('should preserve alternate buffer content when clearOnSwitch is false', () => {
    const buf = new TerminalBuffer(10, 5);

    // Switch to alternate, write something, switch back
    buf.switchToAlternateBuffer(true);
    const cell = TerminalCell.empty();
    cell.codepoint = 0x58; // X
    buf.setCell(2, 3, cell);
    buf.switchToPrimaryBuffer();

    // Switch back to alternate without clearing
    buf.switchToAlternateBuffer(false);
    expect(buf.isUsingAlternateBuffer).toBe(true);
    expect(buf.getCell(2, 3).codepoint).toBe(0x58);
  });

  it('should not switch if already in alternate buffer', () => {
    const buf = new TerminalBuffer(10, 5);
    buf.switchToAlternateBuffer();
    const cell = TerminalCell.empty();
    cell.codepoint = 0x41;
    buf.setCell(0, 0, cell);

    // Second call should be no-op
    buf.switchToAlternateBuffer();
    expect(buf.getCell(0, 0).codepoint).toBe(0x41);
  });

  it('should switch back to primary buffer', () => {
    const buf = new TerminalBuffer(10, 5);
    const cell = TerminalCell.empty();
    cell.codepoint = 0x50; // P
    buf.setCell(0, 0, cell);

    buf.switchToAlternateBuffer();
    expect(buf.getCell(0, 0).codepoint).toBe(0);

    buf.switchToPrimaryBuffer();
    expect(buf.isUsingAlternateBuffer).toBe(false);
    expect(buf.getCell(0, 0).codepoint).toBe(0x50);
  });

  it('switchToPrimaryBuffer should be no-op when already primary', () => {
    const buf = new TerminalBuffer(10, 5);
    const cell = TerminalCell.empty();
    cell.codepoint = 0x41;
    buf.setCell(0, 0, cell);

    buf.switchToPrimaryBuffer(); // No-op
    expect(buf.getCell(0, 0).codepoint).toBe(0x41);
  });
});
