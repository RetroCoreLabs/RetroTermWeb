/**
 * Clipboard manager for terminal copy/paste.
 * Uses the browser Clipboard API for reading/writing text.
 */

export class ClipboardManager {
  /**
   * Copy text to the clipboard.
   * Returns true on success, false on failure.
   */
  async copyText(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback: try legacy execCommand
      return this.fallbackCopy(text);
    }
  }

  /**
   * Read text from the clipboard.
   * Returns the clipboard text, or empty string on failure.
   */
  async readText(): Promise<string> {
    try {
      return await navigator.clipboard.readText();
    } catch {
      return '';
    }
  }

  /** Fallback copy using deprecated execCommand */
  private fallbackCopy(text: string): boolean {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      const result = document.execCommand('copy');
      document.body.removeChild(textarea);
      return result;
    } catch {
      return false;
    }
  }
}
