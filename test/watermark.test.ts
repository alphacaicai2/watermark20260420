import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { beforeAll, describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { watermarkPdf } from '../src/index.js';
import { createPdf } from './helpers/pdf.js';
import { findChineseFont } from './helpers/fonts.js';

let chineseFontPath: string | undefined;

async function makeFixture(name: string): Promise<string> {
  const dir = join(tmpdir(), `pdfwm-core-${crypto.randomUUID()}`);
  await import('node:fs/promises').then((fs) => fs.mkdir(dir, { recursive: true }));
  const inputPath = join(dir, name);
  await createPdf(inputPath, [
    [300, 400],
    [612, 792]
  ]);
  return inputPath;
}

describe('watermarkPdf', () => {
  beforeAll(async () => {
    chineseFontPath = await findChineseFont();
  });

  it('adds an English watermark without mutating the input PDF', async () => {
    const inputPath = await makeFixture('source.pdf');
    const beforeBytes = await readFile(inputPath);

    const result = await watermarkPdf({ inputPath, text: 'CONFIDENTIAL' });
    const outputDoc = await PDFDocument.load(await readFile(result.outputPath));

    expect(result).toMatchObject({ pageCount: 2, templateName: 'standard', success: true });
    expect(outputDoc.getPageCount()).toBe(2);
    expect(await readFile(inputPath)).toEqual(beforeBytes);
    expect((await stat(result.outputPath)).size).toBeGreaterThan(beforeBytes.length);
  });

  it('adds a Chinese watermark with the bundled font', async () => {
    const inputPath = await makeFixture('source.pdf');

    const result = await watermarkPdf({ inputPath, text: '仅供内部使用' });
    const outputDoc = await PDFDocument.load(await readFile(result.outputPath));

    expect(result).toMatchObject({ pageCount: 2, templateName: 'standard', success: true });
    expect(outputDoc.getPageCount()).toBe(2);
  });

  it('rejects an explicit missing font path', async () => {
    const inputPath = await makeFixture('source.pdf');

    await expect(
      watermarkPdf({ inputPath, text: '仅供内部使用', fontPath: 'missing-font.otf' })
    ).rejects.toMatchObject({ code: 'FONT_NOT_FOUND' });
  });

  it.runIf(() => Boolean(chineseFontPath))('supports Chinese text with an explicit font', async () => {
    const inputPath = await makeFixture('source.pdf');

    const result = await watermarkPdf({
      inputPath,
      text: '仅供内部使用',
      fontPath: chineseFontPath
    });

    await expect(PDFDocument.load(await readFile(result.outputPath))).resolves.toBeDefined();
  });

  it('rejects empty and multiline watermark text', async () => {
    const inputPath = await makeFixture('source.pdf');

    await expect(watermarkPdf({ inputPath, text: '   ' })).rejects.toMatchObject({
      code: 'WATERMARK_TEXT_EMPTY'
    });
    await expect(watermarkPdf({ inputPath, text: 'A\nB' })).rejects.toMatchObject({
      code: 'WATERMARK_TEXT_MULTILINE'
    });
  });
});
