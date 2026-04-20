import type { WatermarkTemplate } from '../core/types.js';

export const DEFAULT_TEMPLATE_NAME = 'standard';

export const STANDARD_TEMPLATE: WatermarkTemplate = {
  fontSize: 56,
  opacity: 0.12,
  rotation: 45,
  colorRgb: [0.6, 0.6, 0.6],
  position: 'center'
};

export const DEFAULT_TEMPLATES = {
  [DEFAULT_TEMPLATE_NAME]: STANDARD_TEMPLATE
} as const;
