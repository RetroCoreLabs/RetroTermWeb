/**
 * Simple dev server for the demo page.
 * Serves static files and builds the demo TypeScript.
 */
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';

const PORT = 3000;
const ROOT = new URL('.', import.meta.url).pathname;
const PROJECT_ROOT = join(ROOT, '..');

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.ts': 'text/typescript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

const server = createServer((req, res) => {
  let url = req.url || '/';
  if (url === '/') url = '/index.html';

  // Try demo directory first, then project root
  let filePath = join(ROOT, url);
  if (!existsSync(filePath)) {
    filePath = join(PROJECT_ROOT, url);
  }

  if (!existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const ext = extname(filePath);
  const mime = MIME_TYPES[ext] || 'application/octet-stream';

  try {
    const content = readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': mime });
    res.end(content);
  } catch {
    res.writeHead(500);
    res.end('Error reading file');
  }
});

server.listen(PORT, () => {
  console.log(`Demo server running at http://localhost:${PORT}`);
  console.log(`Serving from: ${ROOT}`);
  console.log('Press Ctrl+C to stop.');
});
