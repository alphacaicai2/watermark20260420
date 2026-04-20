import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { z } from 'zod';
import { DEFAULT_TEMPLATE_NAME, DEFAULT_TEMPLATES } from './default-template.js';
import { WatermarkError, type WatermarkConfig, type WatermarkTemplate } from '../core/types.js';

const rgbSchema = z.tuple([z.number(), z.number(), z.number()]);

const templateSchema = z.object({
  fontSize: z.number().positive(),
  opacity: z.number().min(0).max(1),
  rotation: z.number(),
  colorRgb: rgbSchema,
  position: z.literal('center')
});

const configSchema = z.object({
  defaultTemplate: z.string().optional(),
  defaultOutputDir: z.string().optional(),
  defaultFontPath: z.string().optional(),
  templates: z.record(z.string(), templateSchema).optional()
});

export type ResolvedWatermarkConfig = {
  defaultTemplate: string;
  defaultOutputDir?: string;
  defaultFontPath?: string;
  templates: Record<string, WatermarkTemplate>;
};

export async function loadResolvedConfig(options: {
  configPath?: string;
  config?: WatermarkConfig;
}): Promise<ResolvedWatermarkConfig> {
  const fileConfig = await readConfigFile(options.configPath);
  return mergeConfig(fileConfig, options.config);
}

export async function readConfigFile(configPath?: string): Promise<WatermarkConfig | undefined> {
  if (!configPath) {
    return undefined;
  }

  try {
    return parseConfig(JSON.parse(await readFile(resolve(configPath), 'utf8')));
  } catch (error) {
    throw new WatermarkError('CONFIG_INVALID', `Invalid config file: ${configPath}`, error);
  }
}

export function mergeConfig(
  fileConfig?: WatermarkConfig,
  inlineConfig?: WatermarkConfig
): ResolvedWatermarkConfig {
  const parsedFile = parseConfig(fileConfig ?? {});
  const parsedInline = parseConfig(inlineConfig ?? {});
  const mergedTemplates = {
    ...DEFAULT_TEMPLATES,
    ...parsedFile.templates,
    ...parsedInline.templates
  };

  return {
    defaultTemplate: parsedInline.defaultTemplate ?? parsedFile.defaultTemplate ?? DEFAULT_TEMPLATE_NAME,
    defaultOutputDir: parsedInline.defaultOutputDir ?? parsedFile.defaultOutputDir,
    defaultFontPath: parsedInline.defaultFontPath ?? parsedFile.defaultFontPath,
    templates: mergedTemplates
  };
}

function parseConfig(value: unknown): WatermarkConfig {
  const parsed = configSchema.safeParse(value);

  if (!parsed.success) {
    throw new WatermarkError('CONFIG_INVALID', parsed.error.message, parsed.error);
  }

  return parsed.data;
}
