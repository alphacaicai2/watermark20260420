import { readFile, writeFile } from 'node:fs/promises';
import { degrees, PDFDocument, rgb, type PDFFont } from 'pdf-lib';
import { loadResolvedConfig } from '../config/load-config.js';
import { assertInputPdf, resolveOutputPath } from '../utils/paths.js';
import { embedWatermarkFont } from '../utils/fonts.js';
import { validateWatermarkText } from '../utils/text.js';
import { WatermarkError, type WatermarkOptions, type WatermarkResult, type WatermarkTemplate } from './types.js';

export async function watermarkPdf(options: WatermarkOptions): Promise<WatermarkResult> {
  const text = validateWatermarkText(options.text);
  const inputPath = await assertInputPdf(options.inputPath);
  const config = await loadResolvedConfig({ configPath: options.configPath, config: options.config });
  const templateName = options.templateName ?? config.defaultTemplate;
  const template = config.templates[templateName];

  if (!template) {
    throw new WatermarkError('TEMPLATE_NOT_FOUND', `Template not found: ${templateName}`);
  }

  const outputPath = await resolveOutputPath({
    inputPath,
    text,
    outputPath: options.outputPath,
    defaultOutputDir: config.defaultOutputDir
  });
  const pdfDoc = await loadPdf(inputPath);
  const font = await embedWatermarkFont({
    pdfDoc,
    text,
    fontPath: options.fontPath ?? config.defaultFontPath
  });

  drawWatermarks({ pdfDoc, text, font, template });
  await writeFile(outputPath, await pdfDoc.save());
  return { outputPath, pageCount: pdfDoc.getPageCount(), templateName, success: true };
}

async function loadPdf(inputPath: string): Promise<PDFDocument> {
  try {
    return await PDFDocument.load(await readFile(inputPath));
  } catch (error) {
    throw new WatermarkError('PDF_LOAD_FAILED', `Failed to load PDF: ${inputPath}`, error);
  }
}

function drawWatermarks(options: {
  pdfDoc: PDFDocument;
  text: string;
  font: PDFFont;
  template: WatermarkTemplate;
}): void {
  for (const page of options.pdfDoc.getPages()) {
    const { x, y } = getCenteredTextOrigin({
      pageWidth: page.getWidth(),
      pageHeight: page.getHeight(),
      text: options.text,
      font: options.font,
      template: options.template
    });

    page.drawText(options.text, {
      x,
      y,
      font: options.font,
      size: options.template.fontSize,
      color: rgb(...options.template.colorRgb),
      opacity: options.template.opacity,
      rotate: degrees(options.template.rotation)
    });
  }
}

function getCenteredTextOrigin(options: {
  pageWidth: number;
  pageHeight: number;
  text: string;
  font: PDFFont;
  template: WatermarkTemplate;
}): { x: number; y: number } {
  const width = options.font.widthOfTextAtSize(options.text, options.template.fontSize);
  const height = options.font.heightAtSize(options.template.fontSize, { descender: false });
  const radians = (options.template.rotation * Math.PI) / 180;
  const rotatedCenterX = (width * Math.cos(radians) - height * Math.sin(radians)) / 2;
  const rotatedCenterY = (width * Math.sin(radians) + height * Math.cos(radians)) / 2;

  return {
    x: options.pageWidth / 2 - rotatedCenterX,
    y: options.pageHeight / 2 - rotatedCenterY
  };
}
