import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { resolveOutputPath, sanitizeFilePart } from '../src/utils/paths.js';
import { WatermarkError } from '../src/core/types.js';

async function makeTempDir(): Promise<string> {
  const tempDir = join(tmpdir(), `pdfwm-paths-${crypto.randomUUID()}`);
  await mkdir(tempDir, { recursive: true });
  return tempDir;
}

describe('paths', () => {
  it('sanitizes unsafe filename characters', () => {
    expect(sanitizeFilePart('For Kenji / Only: v1')).toBe('For-Kenji-Only-v1');
  });

  it('builds a default output path and avoids collisions', async () => {
    const tempDir = await makeTempDir();
    const inputPath = join(tempDir, 'source.pdf');
    const existingPath = join(tempDir, 'source__watermarked__CONFIDENTIAL.pdf');
    await writeFile(inputPath, 'pdf');
    await writeFile(existingPath, 'existing');

    const outputPath = await resolveOutputPath({ inputPath, text: 'CONFIDENTIAL' });

    expect(outputPath).toBe(join(tempDir, 'source__watermarked__CONFIDENTIAL-1.pdf'));
  });

  it('uses the configured default output directory', async () => {
    const tempDir = await makeTempDir();
    const outputDir = join(tempDir, 'out');
    const inputPath = join(tempDir, 'source.pdf');
    await writeFile(inputPath, 'pdf');

    const outputPath = await resolveOutputPath({ inputPath, text: 'Demo', defaultOutputDir: outputDir });

    expect(outputPath).toBe(join(outputDir, 'source__watermarked__Demo.pdf'));
  });

  it('rejects output paths equal to input paths', async () => {
    const tempDir = await makeTempDir();
    const inputPath = join(tempDir, 'source.pdf');
    await writeFile(inputPath, 'pdf');

    await expect(resolveOutputPath({ inputPath, text: 'X', outputPath: inputPath })).rejects.toMatchObject({
      code: 'OUTPUT_EQUALS_INPUT'
    } satisfies Partial<WatermarkError>);
  });
});
