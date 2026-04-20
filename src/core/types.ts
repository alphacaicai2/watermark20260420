export type WatermarkPosition = 'center';

export type RgbTuple = readonly [number, number, number];

export type WatermarkTemplate = {
  fontSize: number;
  opacity: number;
  rotation: number;
  colorRgb: RgbTuple;
  position: WatermarkPosition;
};

export type WatermarkConfig = {
  defaultTemplate?: string;
  defaultOutputDir?: string;
  defaultFontPath?: string;
  templates?: Record<string, WatermarkTemplate>;
};

export type WatermarkOptions = {
  inputPath: string;
  text: string;
  outputPath?: string;
  templateName?: string;
  fontPath?: string;
  configPath?: string;
  config?: WatermarkConfig;
};

export type WatermarkResult = {
  outputPath: string;
  pageCount: number;
  templateName: string;
  success: true;
};

export type WatermarkErrorCode =
  | 'CONFIG_INVALID'
  | 'FONT_NOT_FOUND'
  | 'FONT_UNSUPPORTED_CHARACTERS'
  | 'INPUT_NOT_FOUND'
  | 'INPUT_NOT_PDF'
  | 'OUTPUT_EQUALS_INPUT'
  | 'OUTPUT_NOT_WRITABLE'
  | 'PDF_LOAD_FAILED'
  | 'TEMPLATE_NOT_FOUND'
  | 'WATERMARK_TEXT_EMPTY'
  | 'WATERMARK_TEXT_MULTILINE';

export class WatermarkError extends Error {
  constructor(
    readonly code: WatermarkErrorCode,
    message: string,
    readonly cause?: unknown
  ) {
    super(message);
    this.name = 'WatermarkError';
  }
}
