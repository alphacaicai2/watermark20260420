import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { PDFDocument } from 'pdf-lib';
import { embedWatermarkFont } from '../../src/utils/fonts.js';

const CANDIDATE_CHINESE_FONTS = [
  'C:/Windows/Fonts/NotoSansSC-VF.ttf',
  'C:/Windows/Fonts/simhei.ttf',
  'C:/Windows/Fonts/Deng.ttf',
  'C:/Windows/Fonts/msyh.ttc',
  'C:/Windows/Fonts/simsun.ttc',
  '/System/Library/Fonts/PingFang.ttc',
  '/System/Library/Fonts/STHeiti Light.ttc',
  '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
  '/usr/share/fonts/truetype/wqy/wqy-microhei.ttc'
];

export async function findChineseFont(): Promise<string | undefined> {
  for (const fontPath of CANDIDATE_CHINESE_FONTS) {
    if ((await exists(fontPath)) && (await supportsChinese(fontPath))) {
      return fontPath;
    }
  }

  return undefined;
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function supportsChinese(fontPath: string): Promise<boolean> {
  try {
    const pdfDoc = await PDFDocument.create();
    await embedWatermarkFont({ pdfDoc, text: '仅供内部使用', fontPath });
    return true;
  } catch {
    return false;
  }
}
