import { writeFile } from 'node:fs/promises';
import { PDFDocument, StandardFonts } from 'pdf-lib';

export async function createPdf(filePath: string, pageSizes: Array<[number, number]>): Promise<void> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (const [width, height] of pageSizes) {
    const page = pdfDoc.addPage([width, height]);
    page.drawText('Fixture PDF', { x: 24, y: height - 48, font, size: 18 });
  }

  await writeFile(filePath, await pdfDoc.save());
}
