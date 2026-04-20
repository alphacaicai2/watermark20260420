#!/usr/bin/env node
import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { Command } from 'commander';
import { watermarkPdf, WatermarkError, type WatermarkOptions } from '../index.js';

type CliOptions = {
  input: string;
  text: string;
  output?: string;
  template?: string;
  font?: string;
  config?: string;
};

const DEFAULT_CONFIG_FILE = 'watermark.config.json';

export function createProgram(): Command {
  const program = new Command();
  program.name('pdfwm').description('Fixed-template PDF text watermark tool').version('0.1.0');
  addWatermarkCommand(program, 'add');
  addWatermarkCommand(program, 'standard', 'standard');
  return program;
}

export async function runCli(argv: string[] = process.argv): Promise<void> {
  await createProgram().parseAsync(argv);
}

function addWatermarkCommand(program: Command, name: string, fixedTemplate?: string): void {
  program
    .command(name)
    .description(`Add a ${fixedTemplate ?? 'template'} text watermark to a PDF`)
    .requiredOption('--input <path>', 'input PDF path')
    .requiredOption('--text <text>', 'watermark text')
    .option('--output <path>', 'output PDF path')
    .option('--template <name>', 'template name', fixedTemplate)
    .option('--font <path>', 'font file path')
    .option('--config <path>', 'config file path')
    .action(async (options: CliOptions) => {
      await executeCommand({ ...options, template: fixedTemplate ?? options.template });
    });
}

async function executeCommand(options: CliOptions): Promise<void> {
  try {
    const result = await watermarkPdf(await toWatermarkOptions(options));
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    process.exitCode = 1;
    console.error(formatError(error));
  }
}

async function toWatermarkOptions(options: CliOptions): Promise<WatermarkOptions> {
  return {
    inputPath: options.input,
    text: options.text,
    outputPath: options.output,
    templateName: options.template,
    fontPath: options.font,
    configPath: options.config ?? (await findDefaultConfig())
  };
}

async function findDefaultConfig(): Promise<string | undefined> {
  const configPath = resolve(process.cwd(), DEFAULT_CONFIG_FILE);

  try {
    await access(configPath, constants.F_OK);
    return configPath;
  } catch {
    return undefined;
  }
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
  await runCli();
}
