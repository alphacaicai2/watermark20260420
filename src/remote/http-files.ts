import { createReadStream } from 'node:fs';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Request } from 'express';

const MAX_PDF_BYTES = 25 * 1024 * 1024;
const PDF_CONTENT_TYPE = 'application/pdf';
const OUTPUT_DIR_NAME = 'remote-output';
const INPUT_DIR_NAME = 'remote-input';

export type RemoteFileConfig = {
  baseUrl: string;
  inputDir: string;
  outputDir: string;
};

export function createRemoteFileConfig(baseUrl: string): RemoteFileConfig {
  const rootDir = resolve(process.env.PDFWM_STORAGE_DIR ?? join(process.cwd(), '.data'));

  return {
    baseUrl: baseUrl.replace(/\/$/, ''),
    inputDir: join(rootDir, INPUT_DIR_NAME),
    outputDir: join(rootDir, OUTPUT_DIR_NAME)
  };
}

export function getRequestBaseUrl(req: Request): string {
  const configuredUrl = process.env.PUBLIC_BASE_URL;
  const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN;

  if (configuredUrl) {
    return configuredUrl;
  }

  if (railwayDomain) {
    return `https://${railwayDomain}`;
  }

  return `${req.protocol}://${req.get('host')}`;
}

export async function downloadPdfFromUrl(inputUrl: string, config: RemoteFileConfig): Promise<string> {
  const url = parseHttpUrl(inputUrl);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download PDF: HTTP ${response.status}`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  assertPdfDownload(bytes, response.headers.get('content-type'));
  await mkdir(config.inputDir, { recursive: true });

  const inputPath = join(config.inputDir, `${randomUUID()}.pdf`);
  await writeFile(inputPath, bytes);
  return inputPath;
}

export async function createRemoteOutputPath(config: RemoteFileConfig): Promise<string> {
  await mkdir(config.outputDir, { recursive: true });
  return join(config.outputDir, `${randomUUID()}.pdf`);
}

export function toDownloadUrl(outputPath: string, config: RemoteFileConfig): string {
  return `${config.baseUrl}/files/${basename(outputPath)}`;
}

export async function openOutputFile(fileName: string, config: RemoteFileConfig) {
  const filePath = resolve(config.outputDir, fileName);

  if (!filePath.startsWith(resolve(config.outputDir))) {
    throw new Error('Invalid file path');
  }

  const fileStat = await stat(filePath);
  if (!fileStat.isFile()) {
    throw new Error('Output file not found');
  }

  return {
    stream: createReadStream(filePath),
    size: fileStat.size
  };
}

function parseHttpUrl(inputUrl: string): URL {
  const url = new URL(inputUrl);

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`Unsupported input URL protocol: ${url.protocol}`);
  }

  return url;
}

function assertPdfDownload(bytes: Uint8Array, contentType: string | null): void {
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_PDF_BYTES) {
    throw new Error(`PDF download size must be between 1 byte and ${MAX_PDF_BYTES} bytes`);
  }

  if (contentType && !contentType.toLowerCase().includes(PDF_CONTENT_TYPE)) {
    throw new Error(`Input URL did not return a PDF content type: ${contentType}`);
  }

  if (bytes[0] !== 0x25 || bytes[1] !== 0x50 || bytes[2] !== 0x44 || bytes[3] !== 0x46) {
    throw new Error('Input URL did not return a valid PDF file');
  }
}
