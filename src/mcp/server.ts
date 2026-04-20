#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { watermarkPdf, WatermarkError } from '../index.js';
import {
  createRemoteFileConfig,
  createRemoteOutputPath,
  downloadPdfFromUrl,
  toDownloadUrl
} from '../remote/http-files.js';

const TOOL_NAME = 'add_pdf_watermark';

const inputSchema = {
  input_path: z.string().optional(),
  input_url: z.string().url().optional(),
  watermark_text: z.string(),
  output_path: z.string().optional(),
  template: z.string().optional(),
  font_path: z.string().optional()
};

type AddPdfWatermarkInput = {
  input_path?: string;
  input_url?: string;
  watermark_text: string;
  output_path?: string;
  template?: string;
  font_path?: string;
};

type McpServerOptions = {
  remote?: {
    baseUrl: string;
  };
};

export async function handleAddPdfWatermark(
  input: AddPdfWatermarkInput,
  options: McpServerOptions = {}
) {
  try {
    const resolvedInput = await resolveInput(input, options);
    const result = await watermarkPdf({
      inputPath: resolvedInput.inputPath,
      text: input.watermark_text,
      outputPath: resolvedInput.outputPath,
      templateName: input.template,
      fontPath: input.font_path
    });

    return toToolContent({
      status: 'success',
      output_path: result.outputPath,
      download_url: resolvedInput.downloadUrl,
      page_count: result.pageCount,
      template: result.templateName
    });
  } catch (error) {
    return toToolContent({ status: 'failed', error: formatError(error) }, true);
  }
}

export function createMcpServer(options: McpServerOptions = {}): McpServer {
  const server = new McpServer({ name: 'pdf-fixed-watermark-tool', version: '0.1.0' });
  server.registerTool(
    TOOL_NAME,
    {
      title: 'Add PDF Watermark',
      description: 'Add a fixed-template text watermark to every page of a PDF.',
      inputSchema
    },
    (input) => handleAddPdfWatermark(input, options)
  );
  return server;
}

export async function runMcpServer(): Promise<void> {
  const server = createMcpServer();
  await server.connect(new StdioServerTransport());
}

function toToolContent(value: Record<string, unknown>, isError = false) {
  return {
    isError,
    content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }]
  };
}

async function resolveInput(input: AddPdfWatermarkInput, options: McpServerOptions) {
  if (input.input_url && options.remote) {
    const config = createRemoteFileConfig(options.remote.baseUrl);
    const inputPath = await downloadPdfFromUrl(input.input_url, config);
    const outputPath = input.output_path ?? (await createRemoteOutputPath(config));
    return { inputPath, outputPath, downloadUrl: toDownloadUrl(outputPath, config) };
  }

  if (input.input_path) {
    return { inputPath: input.input_path, outputPath: input.output_path, downloadUrl: undefined };
  }

  throw new Error('Either input_url or input_path is required');
}

function formatError(error: unknown): string {
  if (error instanceof WatermarkError) {
    return `${error.code}: ${error.message}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  await runMcpServer();
}
