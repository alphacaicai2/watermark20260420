import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, StandardFonts, type PDFFont } from 'pdf-lib';
import { WatermarkError } from '../core/types.js';
import { uniqueCodePoints } from './text.js';

const BUNDLED_FONT_FILE = 'NotoSansCJKsc-Regular.otf';
const MODULE_DIR = dirname(fileURLToPath(import.meta.url));

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

async function resolveBundledFont(): Promise<string | undefined> {
  for (const fontPath of getBundledFontCandidates()) {
    if (await isFile(fontPath)) {
      return fontPath;
    }
  }

  return undefined;
}

function getBundledFontCandidates(): string[] {
  return [
    resolve(MODULE_DIR, '../fonts', BUNDLED_FONT_FILE),
    resolve(MODULE_DIR, '../../fonts', BUNDLED_FONT_FILE),
    resolve(process.cwd(), 'fonts', BUNDLED_FONT_FILE)
  ];
}

async function isFile(filePath: string): Promise<boolean> {
  try {
    return (await stat(filePath)).isFile();
  } catch {
    return false;
  }
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
