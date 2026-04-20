import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, StandardFonts, type PDFFont } from 'pdf-lib';
import { WatermarkError } from '../core/types.js';
import { uniqueCodePoints } from './text.js';

// Bundled font shipped with the package (downloaded by postinstall)
const __dirname = dirname(fileURLToPath(import.meta.url));
const BUNDLED_FONT_PATH = resolve(__dirname, '../../fonts/NotoSansCJK-Regular.ttc');

export async function embedWatermarkFont(options: {
  pdfDoc: PDFDocument;
  text: string;
  fontPath?: string;
}): Promise<PDFFont> {
  // Priority: explicit fontPath > bundled CJK font > built-in Helvetica
  const resolvedFontPath = options.fontPath ?? (await resolveBundledFont());
  const font = resolvedFontPath
    ? await embedCustomFont(options.pdfDoc, resolvedFontPath)
    : await options.pdfDoc.embedFont(StandardFonts.Helvetica);

  assertFontSupportsText({ font, text: options.text, fontPath: resolvedFontPath });
  return font;
}

/** Returns the bundled font path if the file exists, otherwise undefined. */
async function resolveBundledFont(): Promise<string | undefined> {
  try {
    if ((await stat(BUNDLED_FONT_PATH)).isFile()) {
      return BUNDLED_FONT_PATH;
    }
  } catch {
    // Font not downloaded yet — fall through to Helvetica
  }
  return undefined;
}

async function embedCustomFont(pdfDoc: PDFDocument, fontPath: string): Promise<PDFFont> {
  const absolutePath = resolve(fontPath);

  try {
    if (!(await stat(absolutePath)).isFile()) {
      throw new WatermarkError('FONT_NOT_FOUND', `Font file not found: ${fontPath}`);
    }
  } catch (error) {
    if (error instanceof WatermarkError) {
      throw error;
    }
    throw new WatermarkError('FONT_NOT_FOUND', `Font file not found: ${fontPath}`, error);
  }

  pdfDoc.registerFontkit(fontkit);
  return pdfDoc.embedFont(await readFile(absolutePath));
}

function assertFontSupportsText(options: {
  font: PDFFont;
  text: string;
  fontPath?: string;
}): void {
  const characterSet = new Set(options.font.getCharacterSet());
  const missing = uniqueCodePoints(options.text).filter((codePoint) => !characterSet.has(codePoint));

  if (missing.length === 0) {
    return;
  }

  const label = options.fontPath ?? 'standard Helvetica';
  const characters = missing.map((codePoint) => String.fromCodePoint(codePoint)).join('');
  throw new WatermarkError(
    'FONT_UNSUPPORTED_CHARACTERS',
    `Font does not support required characters in ${label}: ${characters}`
  );
}
