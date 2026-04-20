import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, StandardFonts, type PDFFont } from 'pdf-lib';
import { WatermarkError } from '../core/types.js';
import { uniqueCodePoints } from './text.js';

export async function embedWatermarkFont(options: {
  pdfDoc: PDFDocument;
  text: string;
  fontPath?: string;
}): Promise<PDFFont> {
  const font = options.fontPath
    ? await embedCustomFont(options.pdfDoc, options.fontPath)
    : await options.pdfDoc.embedFont(StandardFonts.Helvetica);

  assertFontSupportsText({ font, text: options.text, fontPath: options.fontPath });
  return font;
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
