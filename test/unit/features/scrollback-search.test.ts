/**
 * Tests for ScrollbackSearch — buffer text search.
 */
import { describe, it, expect } from 'vitest';
import { ScrollbackSearch } from '../../../src/features/ScrollbackSearch';
import { TerminalBuffer } from '../../../src/buffer/TerminalBuffer';

function createBufferWithText(rows: number, cols: number, lines: string[]): TerminalBuffer {
  const buffer = new TerminalBuffer(cols, rows);
  for (let r = 0; r < lines.length && r < rows; r++) {
    for (let c = 0; c < lines[r].length && c < cols; c++) {
      const cell = buffer.getCellRef(r, c);
      cell.codepoint = lines[r].charCodeAt(c);
    }
  }
  return buffer;
}

describe('ScrollbackSearch', () => {
  describe('Basic search', () => {
    it('should start with no matches', () => {
      const search = new ScrollbackSearch();
      expect(search.matchCount).toBe(0);
      expect(search.currentMatch).toBeNull();
    });

    it('should find a single match', () => {
      const search = new ScrollbackSearch();
      const buffer = createBufferWithText(24, 80, ['Hello World']);
      search.search(buffer, 80, 24, 'World');

      expect(search.matchCount).toBe(1);
      expect(search.currentMatch).not.toBeNull();
      expect(search.currentMatch!.row).toBe(0);
      expect(search.currentMatch!.startCol).toBe(6);
      expect(search.currentMatch!.endCol).toBe(10);
    });

    it('should find multiple matches on same line', () => {
      const search = new ScrollbackSearch();
      const buffer = createBufferWithText(24, 80, ['aba aba aba']);
      search.search(buffer, 80, 24, 'aba');

      expect(search.matchCount).toBe(3);
    });

    it('should find matches across multiple lines', () => {
      const search = new ScrollbackSearch();
      const buffer = createBufferWithText(24, 80, ['line one foo', 'line two', 'line three foo']);
      search.search(buffer, 80, 24, 'foo');

      expect(search.matchCount).toBe(2);
      expect(search.matches[0].row).toBe(0);
      expect(search.matches[1].row).toBe(2);
    });

    it('should return no matches for empty term', () => {
      const search = new ScrollbackSearch();
      const buffer = createBufferWithText(24, 80, ['Hello']);
      search.search(buffer, 80, 24, '');

      expect(search.matchCount).toBe(0);
    });

    it('should return no matches when term not found', () => {
      const search = new ScrollbackSearch();
      const buffer = createBufferWithText(24, 80, ['Hello World']);
      search.search(buffer, 80, 24, 'xyz');

      expect(search.matchCount).toBe(0);
    });
  });

  describe('Case sensitivity', () => {
    it('should search case-insensitively by default', () => {
      const search = new ScrollbackSearch();
      const buffer = createBufferWithText(24, 80, ['Hello HELLO hello']);
      search.search(buffer, 80, 24, 'hello');

      expect(search.matchCount).toBe(3);
    });

    it('should search case-sensitively when option set', () => {
      const search = new ScrollbackSearch();
      const buffer = createBufferWithText(24, 80, ['Hello HELLO hello']);
      search.search(buffer, 80, 24, 'hello', { caseSensitive: true });

      expect(search.matchCount).toBe(1);
      expect(search.currentMatch!.startCol).toBe(12);
    });
  });

  describe('Navigation', () => {
    it('should navigate to next match', () => {
      const search = new ScrollbackSearch();
      const buffer = createBufferWithText(24, 80, ['aaa bbb', 'aaa ccc', 'aaa ddd']);
      search.search(buffer, 80, 24, 'aaa');

      expect(search.currentIndex).toBe(0);
      search.findNext();
      expect(search.currentIndex).toBe(1);
      search.findNext();
      expect(search.currentIndex).toBe(2);
    });

    it('should wrap around at end', () => {
      const search = new ScrollbackSearch();
      const buffer = createBufferWithText(24, 80, ['aaa bbb', 'aaa ccc']);
      search.search(buffer, 80, 24, 'aaa');

      search.findNext(); // 0 → 1
      search.findNext(); // 1 → 0 (wrap)
      expect(search.currentIndex).toBe(0);
    });

    it('should navigate to previous match', () => {
      const search = new ScrollbackSearch();
      const buffer = createBufferWithText(24, 80, ['aaa bbb', 'aaa ccc']);
      search.search(buffer, 80, 24, 'aaa');

      search.findNext(); // 0 → 1
      search.findPrevious(); // 1 → 0
      expect(search.currentIndex).toBe(0);
    });

    it('should wrap around at beginning', () => {
      const search = new ScrollbackSearch();
      const buffer = createBufferWithText(24, 80, ['aaa bbb', 'aaa ccc']);
      search.search(buffer, 80, 24, 'aaa');

      search.findPrevious(); // 0 → 1 (wrap)
      expect(search.currentIndex).toBe(1);
    });
  });

  describe('Cell highlighting', () => {
    it('should identify highlighted cells', () => {
      const search = new ScrollbackSearch();
      const buffer = createBufferWithText(24, 80, ['Hello World']);
      search.search(buffer, 80, 24, 'World');

      expect(search.isCellHighlighted(0, 5)).toBe(false);
      expect(search.isCellHighlighted(0, 6)).toBe(true);
      expect(search.isCellHighlighted(0, 10)).toBe(true);
      expect(search.isCellHighlighted(0, 11)).toBe(false);
    });

    it('should identify current match cells', () => {
      const search = new ScrollbackSearch();
      const buffer = createBufferWithText(24, 80, ['foo bar', 'foo baz']);
      search.search(buffer, 80, 24, 'foo');

      // First match is current
      expect(search.isCellCurrentMatch(0, 0)).toBe(true);
      expect(search.isCellCurrentMatch(1, 0)).toBe(false);

      search.findNext();
      // Second match is current
      expect(search.isCellCurrentMatch(0, 0)).toBe(false);
      expect(search.isCellCurrentMatch(1, 0)).toBe(true);
    });
  });

  describe('Clear', () => {
    it('should clear search results', () => {
      const search = new ScrollbackSearch();
      const buffer = createBufferWithText(24, 80, ['Hello World']);
      search.search(buffer, 80, 24, 'Hello');

      expect(search.matchCount).toBe(1);
      search.clear();
      expect(search.matchCount).toBe(0);
      expect(search.searchTerm).toBe('');
    });
  });

  describe('onResults callback', () => {
    it('should fire callback when results change', () => {
      const search = new ScrollbackSearch();
      let lastCount = -1;
      search.onResults = (matches) => { lastCount = matches.length; };

      const buffer = createBufferWithText(24, 80, ['Hello World']);
      search.search(buffer, 80, 24, 'Hello');
      expect(lastCount).toBe(1);

      search.clear();
      expect(lastCount).toBe(0);
    });
  });
});
