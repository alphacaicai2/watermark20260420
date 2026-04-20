import { WatermarkError } from '../core/types.js';

const MULTILINE_PATTERN = /\r|\n/;

export function validateWatermarkText(text: string): string {
  if (text.trim().length === 0) {
    throw new WatermarkError('WATERMARK_TEXT_EMPTY', 'Watermark text is empty');
  }

  if (MULTILINE_PATTERN.test(text)) {
    throw new WatermarkError('WATERMARK_TEXT_MULTILINE', 'Watermark text must be a single line');
  }

  return text;
}

export function uniqueCodePoints(text: string): number[] {
  return [...new Set(Array.from(text, (character) => character.codePointAt(0)))].filter(
    (codePoint): codePoint is number => codePoint !== undefined
  );
}
