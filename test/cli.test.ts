import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdir } from 'node:fs/promises';
import { describe, expect, it, vi } from 'vitest';
import { createProgram } from '../src/cli/index.js';
import { createPdf } from './helpers/pdf.js';

async function makeInputPdf(): Promise<string> {
  const dir = join(tmpdir(), `pdfwm-cli-${crypto.randomUUID()}`);
  await mkdir(dir, { recursive: true });
  const inputPath = join(dir, 'cli-source.pdf');
  await createPdf(inputPath, [[320, 480]]);
  return inputPath;
}

describe('cli', () => {
  it('prints help', () => {
    const program = createProgram();
    const output = program.helpInformation();

    expect(output).toContain('pdfwm');
    expect(output).toContain('add');
  });

  it('runs the add command', async () => {
    const inputPath = await makeInputPdf();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await createProgram().parseAsync(['node', 'pdfwm', 'add', '--input', inputPath, '--text', 'CLI']);

    expect(logSpy.mock.calls[0]?.[0]).toContain('"success": true');
    logSpy.mockRestore();
  });

  it('reports missing required options', async () => {
    const program = createProgram();
    program.exitOverride();
    program.configureOutput({ writeErr: () => undefined });

    await expect(program.parseAsync(['node', 'pdfwm', 'add', '--text', 'X'])).rejects.toThrow('process.exit');
  });
});
