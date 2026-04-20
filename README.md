# PDF Fixed Watermark Tool

Fixed-template PDF text watermark tool for local scripts, CLI usage, and MCP clients.

## Install

```bash
npm install
npm run build
```

## CLI

```bash
pdfwm add --input ./source.pdf --text "CONFIDENTIAL" --output ./out.pdf
pdfwm add --input ./source.pdf --text "For Kenji Only"
pdfwm standard --input ./source.pdf --text "Demo Version"
```

Options:

- `--input`: input PDF path, required
- `--text`: single-line watermark text, required
- `--output`: output PDF path, optional
- `--template`: template name, default `standard`
- `--font`: custom font file path, required for Chinese or unsupported characters
- `--config`: config file path, optional

If `--output` is omitted, the tool writes a new PDF next to the input PDF unless
`defaultOutputDir` is configured. Generated names follow:

```text
source.pdf -> source__watermarked__CONFIDENTIAL.pdf
```

## NPM API

```ts
import { watermarkPdf } from 'pdf-fixed-watermark-tool';

const result = await watermarkPdf({
  inputPath: './source.pdf',
  text: 'CONFIDENTIAL',
  outputPath: './out.pdf'
});

console.log(result.outputPath);
```

## Config

The CLI automatically reads `watermark.config.json` from the current working
directory when present.

```json
{
  "defaultTemplate": "standard",
  "defaultOutputDir": "./output",
  "defaultFontPath": "C:/Windows/Fonts/msyh.ttc",
  "templates": {
    "standard": {
      "fontSize": 56,
      "opacity": 0.12,
      "rotation": 45,
      "colorRgb": [0.6, 0.6, 0.6],
      "position": "center"
    }
  }
}
```

## MCP Server

Run the stdio MCP server:

```bash
node ./dist/mcp.js
```

Tool name:

```text
add_pdf_watermark
```

Input:

```json
{
  "input_path": "./source.pdf",
  "watermark_text": "CONFIDENTIAL",
  "output_path": "./out.pdf",
  "template": "standard",
  "font_path": "C:/Windows/Fonts/msyh.ttc"
}
```

## Errors

Failures are explicit. The API throws `WatermarkError` with a stable `code`.
The CLI prints `CODE: message` and exits with code `1`.

Common codes include:

- `INPUT_NOT_FOUND`
- `INPUT_NOT_PDF`
- `OUTPUT_EQUALS_INPUT`
- `OUTPUT_NOT_WRITABLE`
- `WATERMARK_TEXT_EMPTY`
- `WATERMARK_TEXT_MULTILINE`
- `TEMPLATE_NOT_FOUND`
- `FONT_NOT_FOUND`
- `FONT_UNSUPPORTED_CHARACTERS`
- `PDF_LOAD_FAILED`
- `CONFIG_INVALID`

## Validation

```bash
npm run typecheck
npm run test -- --run --testTimeout=60000
npm run build
```
