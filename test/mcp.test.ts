import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
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

  it('supports remote input_url and returns a download_url', async () => {
    const inputPath = await makeInputPdf();
    const pdfServer = await servePdf(inputPath);

    try {
      const response = await handleAddPdfWatermark(
        {
          input_url: pdfServer.url,
          watermark_text: '远程调用'
        },
        { remote: { baseUrl: 'https://example.up.railway.app' } }
      );
      const payload = JSON.parse(response.content[0]?.text ?? '{}');

      expect(response.isError).toBe(false);
      expect(payload.status).toBe('success');
      expect(payload.download_url).toContain('https://example.up.railway.app/files/');
    } finally {
      await pdfServer.close();
    }
  });
});

async function servePdf(filePath: string): Promise<{ url: string; close: () => Promise<void> }> {
  const bytes = await readFile(filePath);
  const server = createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'application/pdf' });
    res.end(bytes);
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();

  if (!address || typeof address === 'string') {
    throw new Error('Could not start fixture PDF server');
  }

  return {
    url: `http://127.0.0.1:${address.port}/source.pdf`,
    close: () => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
  };
}
