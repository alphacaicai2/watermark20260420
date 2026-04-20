#!/usr/bin/env node
/**
 * postinstall.js
 * Downloads the bundled Noto Sans CJK font so users don't need to supply one.
 * Runs automatically after `npm install`.
 */

import { createWriteStream, existsSync, mkdirSync } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { get } from 'node:https';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FONTS_DIR = join(__dirname, '..', 'fonts');
const FONT_PATH = join(FONTS_DIR, 'NotoSansCJK-Regular.ttc');

// Hosted on GitHub Releases to avoid raw.githubusercontent.com size limits
const FONT_URL =
  'https://github.com/googlefonts/noto-cjk/raw/main/Sans/OTC/NotoSansCJK-Regular.ttc';

async function download(url, dest, redirectCount = 0) {
  if (redirectCount > 5) {
    throw new Error('Too many redirects');
  }

  return new Promise((resolve, reject) => {
    get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return download(res.headers.location, dest, redirectCount + 1)
          .then(resolve)
          .catch(reject);
      }

      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }

      pipeline(res, createWriteStream(dest)).then(resolve).catch(reject);
    }).on('error', reject);
  });
}

async function main() {
  if (existsSync(FONT_PATH)) {
    console.log('[pdf-watermark] Bundled font already present, skipping download.');
    return;
  }

  mkdirSync(FONTS_DIR, { recursive: true });

  console.log('[pdf-watermark] Downloading bundled CJK font (~30 MB)...');

  try {
    await download(FONT_URL, FONT_PATH);
    console.log('[pdf-watermark] Font downloaded successfully → fonts/NotoSansCJK-Regular.ttc');
  } catch (err) {
    // Non-fatal: tool still works for ASCII text with the built-in Helvetica font
    console.warn(
      '[pdf-watermark] Warning: Could not download bundled font. ' +
      'Chinese/Japanese/Korean watermarks will require --font or defaultFontPath.\n' +
      `  Reason: ${err.message}`
    );
    // Remove partial file if it exists
    try {
      if (existsSync(FONT_PATH)) {
        const { unlinkSync } = await import('node:fs');
        unlinkSync(FONT_PATH);
      }
    } catch {}
  }
}

main();
