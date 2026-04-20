import { access, mkdir, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, extname, join, parse, resolve } from 'node:path';
import { WatermarkError } from '../core/types.js';

const PDF_EXTENSION = '.pdf';
const WATERMARK_MARKER = '__watermarked__';
const UNSAFE_FILENAME_PATTERN = /[<>:"/\\|?*\x00-\x1f]+/g;
const WHITESPACE_PATTERN = /\s+/g;

export async function assertInputPdf(inputPath: string): Promise<string> {
  const absolutePath = resolve(inputPath);

  try {
    const fileStat = await stat(absolutePath);
    if (!fileStat.isFile() || extname(absolutePath).toLowerCase() !== PDF_EXTENSION) {
      throw new WatermarkError('INPUT_NOT_PDF', `Input file is not a PDF: ${inputPath}`);
    }
  } catch (error) {
    if (error instanceof WatermarkError) {
      throw error;
    }
    throw new WatermarkError('INPUT_NOT_FOUND', `Input PDF not found: ${inputPath}`, error);
  }

  return absolutePath;
}

export async function resolveOutputPath(options: {
  inputPath: string;
  text: string;
  outputPath?: string;
  defaultOutputDir?: string;
}): Promise<string> {
  const outputPath = options.outputPath
    ? resolve(options.outputPath)
    : await buildDefaultOutputPath(options);

  assertDifferentPaths(options.inputPath, outputPath);
  await assertOutputWritable(outputPath);
  return outputPath;
}

export function sanitizeFilePart(text: string): string {
  const sanitized = text
    .trim()
    .replace(UNSAFE_FILENAME_PATTERN, '-')
    .replace(WHITESPACE_PATTERN, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return sanitized || 'watermark';
}

async function buildDefaultOutputPath(options: {
  inputPath: string;
  text: string;
  defaultOutputDir?: string;
}): Promise<string> {
  const parsed = parse(options.inputPath);
  const outputDir = options.defaultOutputDir ? resolve(options.defaultOutputDir) : parsed.dir;
  const baseName = `${parsed.name}${WATERMARK_MARKER}${sanitizeFilePart(options.text)}`;
  return findAvailablePath({ outputDir, baseName, extension: parsed.ext });
}

async function findAvailablePath(options: {
  outputDir: string;
  baseName: string;
  extension: string;
}): Promise<string> {
  await mkdir(options.outputDir, { recursive: true });
  let counter = 0;

  while (true) {
    const suffix = counter === 0 ? '' : `-${counter}`;
    const candidate = join(options.outputDir, `${options.baseName}${suffix}${options.extension}`);

    if (!(await pathExists(candidate))) {
      return candidate;
    }

    counter += 1;
  }
}

function assertDifferentPaths(inputPath: string, outputPath: string): void {
  if (resolve(inputPath).toLowerCase() === resolve(outputPath).toLowerCase()) {
    throw new WatermarkError('OUTPUT_EQUALS_INPUT', 'Output path must not equal input path');
  }
}

async function assertOutputWritable(outputPath: string): Promise<void> {
  try {
    await mkdir(dirname(outputPath), { recursive: true });
    await access(dirname(outputPath), constants.W_OK);
  } catch (error) {
    throw new WatermarkError('OUTPUT_NOT_WRITABLE', `Output path is not writable: ${outputPath}`, error);
  }
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}
