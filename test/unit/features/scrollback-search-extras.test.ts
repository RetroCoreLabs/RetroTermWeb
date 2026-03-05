import { describe, it, expect } from 'vitest';
import { ScrollbackSearch } from '../../../src/features/ScrollbackSearch';
import { TerminalBuffer } from '../../../src/buffer/TerminalBuffer';
import { TerminalCell } from '../../../src/buffer/TerminalCell';

function writeText(buf: TerminalBuffer, row: number, text: string): void {
  for (let i = 0; i < text.length && i < buf.width; i++) {
    const cell = TerminalCell.empty();
    cell.codepoint = text.charCodeAt(i);
    buf.setCell(row, i, cell);
  }
}

describe('ScrollbackSearch — isCellHighlighted', () => {
  it('should return true for cells within a match', () => {
    const search = new ScrollbackSearch();
    const buf = new TerminalBuffer(80, 24);
    writeText(buf, 0, 'Hello World');

    search.search(buf, 80, 24, 'World');
    expect(search.matchCount).toBe(1);

    // 'World' starts at col 6, ends at col 10
    expect(search.isCellHighlighted(0, 6)).toBe(true);
    expect(search.isCellHighlighted(0, 7)).toBe(true);
    expect(search.isCellHighlighted(0, 10)).toBe(true);
  });

  it('should return false for cells outside any match', () => {
    const search = new ScrollbackSearch();
    const buf = new TerminalBuffer(80, 24);
    writeText(buf, 0, 'Hello World');

    search.search(buf, 80, 24, 'World');

    expect(search.isCellHighlighted(0, 0)).toBe(false);
    expect(search.isCellHighlighted(0, 5)).toBe(false);
    expect(search.isCellHighlighted(0, 11)).toBe(false);
    expect(search.isCellHighlighted(1, 6)).toBe(false);
  });

  it('should return false when no search is active', () => {
    const search = new ScrollbackSearch();
    expect(search.isCellHighlighted(0, 0)).toBe(false);
  });

  it('should highlight multiple matches', () => {
    const search = new ScrollbackSearch();
    const buf = new TerminalBuffer(80, 24);
    writeText(buf, 0, 'aaa bbb aaa');

    search.search(buf, 80, 24, 'aaa');
    expect(search.matchCount).toBe(2);

    // First match: col 0-2
    expect(search.isCellHighlighted(0, 0)).toBe(true);
    expect(search.isCellHighlighted(0, 2)).toBe(true);
    // Gap
    expect(search.isCellHighlighted(0, 3)).toBe(false);
    // Second match: col 8-10
    expect(search.isCellHighlighted(0, 8)).toBe(true);
    expect(search.isCellHighlighted(0, 10)).toBe(true);
  });
});

describe('ScrollbackSearch — isCellCurrentMatch', () => {
  it('should return true only for cells in the current match', () => {
    const search = new ScrollbackSearch();
    const buf = new TerminalBuffer(80, 24);
    writeText(buf, 0, 'aaa bbb aaa');

    search.search(buf, 80, 24, 'aaa');
    // Current match is first one (index 0)
    expect(search.currentIndex).toBe(0);

    // First match cells: current
    expect(search.isCellCurrentMatch(0, 0)).toBe(true);
    expect(search.isCellCurrentMatch(0, 2)).toBe(true);
    // Second match cells: highlighted but not current
    expect(search.isCellCurrentMatch(0, 8)).toBe(false);
  });

  it('should update when navigating to next match', () => {
    const search = new ScrollbackSearch();
    const buf = new TerminalBuffer(80, 24);
    writeText(buf, 0, 'aaa bbb aaa');

    search.search(buf, 80, 24, 'aaa');
    search.findNext();
    expect(search.currentIndex).toBe(1);

    // First match: no longer current
    expect(search.isCellCurrentMatch(0, 0)).toBe(false);
    // Second match: now current
    expect(search.isCellCurrentMatch(0, 8)).toBe(true);
  });

  it('should return false when no search is active', () => {
    const search = new ScrollbackSearch();
    expect(search.isCellCurrentMatch(0, 0)).toBe(false);
  });

  it('should return false when no matches found', () => {
    const search = new ScrollbackSearch();
    const buf = new TerminalBuffer(80, 24);
    writeText(buf, 0, 'Hello');

    search.search(buf, 80, 24, 'xyz');
    expect(search.isCellCurrentMatch(0, 0)).toBe(false);
  });
});

describe('ScrollbackSearch — wrapAround option', () => {
  it('should not wrap when wrapAround is false', () => {
    const search = new ScrollbackSearch();
    const buf = new TerminalBuffer(80, 24);
    writeText(buf, 0, 'test data test');

    search.search(buf, 80, 24, 'test', { wrapAround: false });
    expect(search.matchCount).toBe(2);

    // Navigate to last match
    search.findNext();
    expect(search.currentIndex).toBe(1);

    // Try to go past last match — should stay
    search.findNext();
    expect(search.currentIndex).toBe(1);
  });

  it('should not wrap backwards when wrapAround is false', () => {
    const search = new ScrollbackSearch();
    const buf = new TerminalBuffer(80, 24);
    writeText(buf, 0, 'test data test');

    search.search(buf, 80, 24, 'test', { wrapAround: false });
    expect(search.currentIndex).toBe(0);

    // Try to go before first match — should stay
    search.findPrevious();
    expect(search.currentIndex).toBe(0);
  });
});
