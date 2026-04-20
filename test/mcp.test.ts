import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdir } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { handleAddPdfWatermark } from '../src/mcp/server.js';
import { createPdf } from './helpers/pdf.js';

async function makeInputPdf(): Promise<string> {
  const dir = join(tmpdir(), `pdfwm-mcp-${crypto.randomUUID()}`);
  await mkdir(dir, { recursive: true });
  const inputPath = join(dir, 'mcp-source.pdf');
  await createPdf(inputPath, [[320, 480]]);
  return inputPath;
}

describe('mcp handler', () => {
  it('maps MCP input to watermark output', async () => {
    const inputPath = await makeInputPdf();
    const response = await handleAddPdfWatermark({
      input_path: inputPath,
      watermark_text: 'MCP'
    });
    const payload = JSON.parse(response.content[0]?.text ?? '{}');

    expect(response.isError).toBe(false);
    expect(payload.status).toBe('success');
    expect(payload.page_count).toBe(1);
  });

  it('returns a tool error payload for failures', async () => {
    const response = await handleAddPdfWatermark({
      input_path: 'missing.pdf',
      watermark_text: 'MCP'
    });
    const payload = JSON.parse(response.content[0]?.text ?? '{}');

    expect(response.isError).toBe(true);
    expect(payload.status).toBe('failed');
    expect(payload.error).toContain('INPUT_NOT_FOUND');
  });
});
