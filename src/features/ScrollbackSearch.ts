/**
 * Search within terminal buffer content.
 * Finds and highlights matching text in the visible buffer and scrollback.
 */

import type { TerminalBuffer } from '../buffer/TerminalBuffer';

export interface SearchMatch {
  /** Row in the buffer (0-based from top of scrollback) */
  row: number;
  /** Start column of the match */
  startCol: number;
  /** End column of the match (inclusive) */
  endCol: number;
}

export interface SearchOptions {
  /** Whether to match case. Default: false (case-insensitive) */
  caseSensitive?: boolean;
  /** Whether to search using regex. Default: false */
  regex?: boolean;
  /** Whether to wrap around at end. Default: true */
  wrapAround?: boolean;
}

export class ScrollbackSearch {
  private _matches: SearchMatch[] = [];
  private _currentIndex: number = -1;
  private _searchTerm: string = '';
  private _options: Required<SearchOptions>;
  private _onResults: ((matches: SearchMatch[], current: number) => void) | null = null;

  constructor() {
    this._options = {
      caseSensitive: false,
      regex: false,
      wrapAround: true,
    };
  }

  get matches(): ReadonlyArray<SearchMatch> { return this._matches; }
  get currentIndex(): number { return this._currentIndex; }
  get currentMatch(): SearchMatch | null {
    return this._currentIndex >= 0 && this._currentIndex < this._matches.length
      ? this._matches[this._currentIndex] : null;
  }
  get matchCount(): number { return this._matches.length; }
  get searchTerm(): string { return this._searchTerm; }

  /** Set callback for when search results change */
  set onResults(fn: ((matches: SearchMatch[], current: number) => void) | null) {
    this._onResults = fn;
  }

  /**
   * Search for a term in the buffer.
   * Populates matches array and selects the first match.
   */
  search(buffer: TerminalBuffer, cols: number, rows: number, term: string, options?: SearchOptions): void {
    this._searchTerm = term;
    if (options) {
      if (options.caseSensitive !== undefined) this._options.caseSensitive = options.caseSensitive;
      if (options.regex !== undefined) this._options.regex = options.regex;
      if (options.wrapAround !== undefined) this._options.wrapAround = options.wrapAround;
    }

    this._matches = [];
    this._currentIndex = -1;

    if (term.length === 0) {
      this._onResults?.(this._matches, this._currentIndex);
      return;
    }

    const searchStr = this._options.caseSensitive ? term : term.toLowerCase();

    // Search visible rows
    for (let row = 0; row < rows; row++) {
      const line = this.extractRowText(buffer, row, cols);
      const searchLine = this._options.caseSensitive ? line : line.toLowerCase();

      if (this._options.regex) {
        try {
          const flags = this._options.caseSensitive ? 'g' : 'gi';
          const re = new RegExp(term, flags);
          let match: RegExpExecArray | null;
          while ((match = re.exec(searchLine)) !== null) {
            this._matches.push({
              row,
              startCol: match.index,
              endCol: match.index + match[0].length - 1,
            });
          }
        } catch {
          // Invalid regex — skip
        }
      } else {
        let startPos = 0;
        while (true) {
          const idx = searchLine.indexOf(searchStr, startPos);
          if (idx < 0) break;
          this._matches.push({
            row,
            startCol: idx,
            endCol: idx + searchStr.length - 1,
          });
          startPos = idx + 1;
        }
      }
    }

    if (this._matches.length > 0) {
      this._currentIndex = 0;
    }

    this._onResults?.(this._matches, this._currentIndex);
  }

  /** Move to the next match */
  findNext(): SearchMatch | null {
    if (this._matches.length === 0) return null;

    if (this._currentIndex < this._matches.length - 1) {
      this._currentIndex++;
    } else if (this._options.wrapAround) {
      this._currentIndex = 0;
    }

    this._onResults?.(this._matches, this._currentIndex);
    return this.currentMatch;
  }

  /** Move to the previous match */
  findPrevious(): SearchMatch | null {
    if (this._matches.length === 0) return null;

    if (this._currentIndex > 0) {
      this._currentIndex--;
    } else if (this._options.wrapAround) {
      this._currentIndex = this._matches.length - 1;
    }

    this._onResults?.(this._matches, this._currentIndex);
    return this.currentMatch;
  }

  /** Clear search results */
  clear(): void {
    this._matches = [];
    this._currentIndex = -1;
    this._searchTerm = '';
    this._onResults?.(this._matches, this._currentIndex);
  }

  /** Check if a cell is part of any search match */
  isCellHighlighted(row: number, col: number): boolean {
    for (let i = 0; i < this._matches.length; i++) {
      const m = this._matches[i];
      if (m.row === row && col >= m.startCol && col <= m.endCol) {
        return true;
      }
    }
    return false;
  }

  /** Check if a cell is part of the current (active) match */
  isCellCurrentMatch(row: number, col: number): boolean {
    const m = this.currentMatch;
    if (!m) return false;
    return m.row === row && col >= m.startCol && col <= m.endCol;
  }

  /** Extract text content of a row from the buffer */
  private extractRowText(buffer: TerminalBuffer, row: number, cols: number): string {
    let text = '';
    for (let col = 0; col < cols; col++) {
      const cell = buffer.getCell(row, col);
      const cp = cell.codepoint;
      text += cp > 0 ? String.fromCodePoint(cp) : ' ';
    }
    return text;
  }
}
